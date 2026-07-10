import { createHash } from "node:crypto";
import { getDatabase } from "firebase-admin/database";
import {
  DocumentData,
  Firestore,
  getFirestore,
  Timestamp,
  Transaction,
} from "firebase-admin/firestore";
import { AppError } from "../../callable/app-error";
import { pairKeyFor } from "../discovery/discovery-service";
import {
  BlockUserInput,
  BlockUserResponse,
  ProcessAccountDeletionResponse,
  ReportContentInput,
  ReportContentResponse,
  RequestAccountDeletionInput,
  RequestAccountDeletionResponse,
  SafetyDependencies,
  SafetyStore,
  UnmatchUserInput,
  UnmatchUserResponse,
} from "./safety-types";

export const TBD_LEGAL_REVIEW = "TBD_LEGAL_REVIEW";
const REPORT_DESCRIPTION_LIMIT = 1_000;
const REPORT_DAILY_LIMIT = 5;

class UnsupportedReauthenticationVerifier {
  async isRecentlyVerified(): Promise<boolean> {
    return false;
  }
}

class AdminSafetyStore implements SafetyStore {
  private readonly firestore = getFirestore();
  private readonly database = getDatabase();

  async reportContent(
    uid: string,
    input: ReportContentInput,
    now: Date,
  ): Promise<ReportContentResponse> {
    return this.firestore.runTransaction((transaction) => {
      return reportContentTransaction({
        firestore: this.firestore,
        transaction,
        uid,
        input,
        now,
      });
    });
  }

  async blockUser(
    uid: string,
    input: BlockUserInput,
    now: Date,
  ): Promise<BlockUserResponse> {
    return this.firestore.runTransaction((transaction) => {
      return blockUserTransaction({
        firestore: this.firestore,
        transaction,
        uid,
        input,
        now,
      });
    });
  }

  async unmatchUser(
    uid: string,
    input: UnmatchUserInput,
    now: Date,
  ): Promise<UnmatchUserResponse> {
    return this.firestore.runTransaction((transaction) => {
      return unmatchUserTransaction({
        firestore: this.firestore,
        transaction,
        uid,
        input,
        now,
      });
    });
  }

  async requestAccountDeletion(
    uid: string,
    _input: RequestAccountDeletionInput,
    now: Date,
  ): Promise<RequestAccountDeletionResponse> {
    const result = await this.firestore.runTransaction((transaction) => {
      return requestAccountDeletionTransaction({
        firestore: this.firestore,
        transaction,
        uid,
        now,
      });
    });

    await this.database.ref(`presence/${uid}`).remove();
    return result;
  }

  async processAccountDeletion(
    uid: string,
    now: Date,
  ): Promise<ProcessAccountDeletionResponse> {
    const jobRef = this.firestore.collection("deletion_jobs").doc(uid);
    const jobSnapshot = await jobRef.get();
    const completed = completedStepsFrom(jobSnapshot.data());
    const completedSteps = new Set(completed);

    if (!completedSteps.has("presence_removed")) {
      await this.database.ref(`presence/${uid}`).remove();
      completedSteps.add("presence_removed");
    }

    if (!completedSteps.has("profile_anonymized")) {
      await this.firestore.collection("profiles").doc(uid).set({
        displayName: "Deleted member",
        bio: "",
        interests: [],
        profileStatus: "rejected",
        deletionProcessedAt: Timestamp.fromDate(now),
      }, { merge: true });
      completedSteps.add("profile_anonymized");
    }

    if (!completedSteps.has("matches_closed")) {
      const matches = await this.firestore.collection("matches")
        .where("memberIds", "array-contains", uid)
        .get();
      const batch = this.firestore.batch();
      for (const doc of matches.docs) {
        batch.update(doc.ref, {
          messagingEnabled: false,
          [`deletedMemberIds.${uid}`]: true,
          updatedAt: Timestamp.fromDate(now),
        });
      }
      await batch.commit();
      completedSteps.add("matches_closed");
    }

    const steps = [...completedSteps].sort();
    await jobRef.set({
      ownerId: uid,
      status: "processed",
      completedSteps: steps,
      updatedAt: Timestamp.fromDate(now),
      retentionClass: TBD_LEGAL_REVIEW,
    }, { merge: true });

    return { status: "processed", completedSteps: steps };
  }
}

export function createDefaultSafetyDependencies(): SafetyDependencies {
  return {
    store: new AdminSafetyStore(),
    reauthentication: new UnsupportedReauthenticationVerifier(),
    now: () => new Date(),
  };
}

export async function reportContentForUid(
  uid: string,
  input: ReportContentInput,
  dependencies: SafetyDependencies,
): Promise<ReportContentResponse> {
  return dependencies.store.reportContent(uid, input, dependencies.now());
}

export async function blockUserForUid(
  uid: string,
  input: BlockUserInput,
  dependencies: SafetyDependencies,
): Promise<BlockUserResponse> {
  return dependencies.store.blockUser(uid, input, dependencies.now());
}

export async function unmatchUserForUid(
  uid: string,
  input: UnmatchUserInput,
  dependencies: SafetyDependencies,
): Promise<UnmatchUserResponse> {
  return dependencies.store.unmatchUser(uid, input, dependencies.now());
}

export async function requestAccountDeletionForUid(
  uid: string,
  input: RequestAccountDeletionInput,
  dependencies: SafetyDependencies,
): Promise<RequestAccountDeletionResponse> {
  const now = dependencies.now();
  const verified = await dependencies.reauthentication.isRecentlyVerified(
    uid,
    input.reauthenticationToken,
    now,
  );
  if (!verified) {
    throw new AppError("reauthentication_required");
  }

  return dependencies.store.requestAccountDeletion(uid, input, now);
}

export async function processAccountDeletionForUid(
  uid: string,
  dependencies: Pick<SafetyDependencies, "store" | "now">,
): Promise<ProcessAccountDeletionResponse> {
  return dependencies.store.processAccountDeletion(uid, dependencies.now());
}

export function normalizeSafetyText(text: string | undefined): string | undefined {
  if (text === undefined) {
    return undefined;
  }

  let normalized = "";
  for (const char of text.normalize("NFKC")) {
    const code = char.charCodeAt(0);
    normalized += isUnsafeControlCode(code) ? " " : char;
  }

  const trimmed = normalized.replace(/\s+/gu, " ").trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.length > REPORT_DESCRIPTION_LIMIT) {
    throw new AppError("input_invalid");
  }

  return trimmed;
}

function isUnsafeControlCode(code: number): boolean {
  return (code >= 0 && code <= 8) ||
    code === 11 ||
    code === 12 ||
    (code >= 14 && code <= 31) ||
    code === 127;
}

export function reportTokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function reportTokenForMatch(matchId: string): string {
  return `match:${matchId}`;
}

export function reportTokenForMessage(matchId: string, messageId: string): string {
  return `message:${matchId}:${messageId}`;
}

async function reportContentTransaction(options: {
  firestore: Firestore;
  transaction: Transaction;
  uid: string;
  input: ReportContentInput;
  now: Date;
}): Promise<ReportContentResponse> {
  const description = normalizeSafetyText(options.input.description);
  const reportContext = await resolveReportContext(options);
  const createdAt = Timestamp.fromDate(options.now);
  const tokenHash = reportTokenHash(options.input.reportToken);
  const dedupeKey = reportDedupeKey({
    reporterId: options.uid,
    targetType: options.input.targetType,
    targetId: options.input.targetId,
    matchId: reportContext.matchId,
    messageId: reportContext.messageId,
    category: options.input.category,
  });
  const reportRef = options.firestore.collection("reports").doc(dedupeKey);
  const rateRef = options.firestore
    .collection("rate_limits")
    .doc(options.uid)
    .collection("safety")
    .doc(`report_${dayKey(options.now)}`);
  const [reportSnapshot, rateSnapshot] = await Promise.all([
    options.transaction.get(reportRef),
    options.transaction.get(rateRef),
  ]);

  if (reportSnapshot.exists) {
    return { status: "reported", reportId: reportRef.id };
  }

  assertDailyLimit(rateSnapshot.data());
  options.transaction.set(rateRef, {
    count: (readCount(rateSnapshot.data()) + 1),
    updatedAt: createdAt,
  }, { merge: true });
  const reportData: Record<string, unknown> = {
    reporterId: options.uid,
    targetType: options.input.targetType,
    targetId: options.input.targetId,
    matchId: reportContext.matchId,
    messageId: reportContext.messageId,
    category: options.input.category,
    status: "open",
    createdAt,
    dedupeKey,
    reportTokenHash: tokenHash,
    safeSnapshot: reportContext.safeSnapshot,
    retentionClass: TBD_LEGAL_REVIEW,
  };
  if (description !== undefined) {
    reportData.description = description;
  }
  options.transaction.create(reportRef, reportData);

  return { status: "reported", reportId: reportRef.id };
}

async function resolveReportContext(options: {
  firestore: Firestore;
  transaction: Transaction;
  uid: string;
  input: ReportContentInput;
}) {
  if (options.input.targetType === "match") {
    if (options.input.reportToken !== reportTokenForMatch(options.input.targetId)) {
      throw new AppError("report_token_invalid");
    }
    const matchSnapshot = await options.transaction.get(
      options.firestore.collection("matches").doc(options.input.targetId),
    );
    const match = assertMatchMember(matchSnapshot.data(), options.uid);
    return {
      matchId: options.input.targetId,
      messageId: null,
      safeSnapshot: { memberCount: match.memberIds.length },
    };
  }

  if (options.input.targetType === "message") {
    const matchId = options.input.matchId;
    if (!matchId || options.input.reportToken !== reportTokenForMessage(matchId, options.input.targetId)) {
      throw new AppError("report_token_invalid");
    }
    const matchRef = options.firestore.collection("matches").doc(matchId);
    const messageRef = matchRef.collection("messages").doc(options.input.targetId);
    const [matchSnapshot, messageSnapshot] = await Promise.all([
      options.transaction.get(matchRef),
      options.transaction.get(messageRef),
    ]);
    assertMatchMember(matchSnapshot.data(), options.uid);
    const message = messageSnapshot.data();
    if (!messageSnapshot.exists || typeof message?.senderId !== "string") {
      throw new AppError("not_found");
    }

    return {
      matchId,
      messageId: options.input.targetId,
      safeSnapshot: {
        messageType: message.type === "text" ? "text" : "unknown",
        reportedSenderId: message.senderId,
      },
    };
  }

  const matchId = options.input.matchId;
  if (!matchId || options.input.reportToken !== reportTokenForMatch(matchId)) {
    throw new AppError("report_token_invalid");
  }
  if (options.input.targetId === options.uid) {
    throw new AppError("input_invalid");
  }
  const matchSnapshot = await options.transaction.get(
    options.firestore.collection("matches").doc(matchId),
  );
  const match = assertMatchMember(matchSnapshot.data(), options.uid);
  if (!match.memberIds.includes(options.input.targetId)) {
    throw new AppError("permission_denied");
  }

  return {
    matchId,
    messageId: null,
    safeSnapshot: { relationship: "match_member" },
  };
}

async function blockUserTransaction(options: {
  firestore: Firestore;
  transaction: Transaction;
  uid: string;
  input: BlockUserInput;
  now: Date;
}): Promise<BlockUserResponse> {
  if (options.input.targetUserId === options.uid) {
    throw new AppError("input_invalid");
  }

  const pairKey = pairKeyFor(options.uid, options.input.targetUserId);
  const matchRef = options.firestore.collection("matches").doc(options.input.matchId ?? pairKey);
  const blockRef = options.firestore
    .collection("blocks")
    .doc(options.uid)
    .collection("blocked")
    .doc(options.input.targetUserId);
  const [matchSnapshot, blockSnapshot] = await Promise.all([
    options.transaction.get(matchRef),
    options.transaction.get(blockRef),
  ]);
  const match = assertBlockContext(
    matchSnapshot.data(),
    options.uid,
    options.input.targetUserId,
  );
  const blockedAt = Timestamp.fromDate(options.now);

  if (!blockSnapshot.exists) {
    options.transaction.create(blockRef, {
      blockerId: options.uid,
      targetId: options.input.targetUserId,
      pairKey,
      reason: options.input.reason ?? "safety",
      createdAt: blockedAt,
      retentionClass: TBD_LEGAL_REVIEW,
    });
  }

  if (matchSnapshot.exists && match.status === "active") {
    options.transaction.update(matchRef, {
      status: "blocked",
      messagingEnabled: false,
      blockedBy: options.uid,
      blockedAt,
      updatedAt: blockedAt,
    });
  }

  return { status: "blocked" };
}

async function unmatchUserTransaction(options: {
  firestore: Firestore;
  transaction: Transaction;
  uid: string;
  input: UnmatchUserInput;
  now: Date;
}): Promise<UnmatchUserResponse> {
  const matchRef = options.firestore.collection("matches").doc(options.input.matchId);
  const matchSnapshot = await options.transaction.get(matchRef);
  const match = assertMatchMember(matchSnapshot.data(), options.uid);
  const unmatchedAt = Timestamp.fromDate(options.now);

  if (match.status !== "unmatched") {
    options.transaction.update(matchRef, {
      status: "unmatched",
      messagingEnabled: false,
      unmatchedBy: options.uid,
      unmatchedAt,
      updatedAt: unmatchedAt,
    });
  }

  return { status: "unmatched" };
}

async function requestAccountDeletionTransaction(options: {
  firestore: Firestore;
  transaction: Transaction;
  uid: string;
  now: Date;
}): Promise<RequestAccountDeletionResponse> {
  const internalRef = options.firestore.collection("users_internal").doc(options.uid);
  const preferencesRef = options.firestore.collection("preferences").doc(options.uid);
  const profileRef = options.firestore.collection("profiles").doc(options.uid);
  const jobRef = options.firestore.collection("deletion_jobs").doc(options.uid);
  const matchesQuery = options.firestore.collection("matches")
    .where("memberIds", "array-contains", options.uid);
  const sessionsQuery = options.firestore.collection("discovery_sessions")
    .where("ownerId", "==", options.uid);
  const [internalSnapshot, jobSnapshot, matchesSnapshot, sessionsSnapshot] =
    await Promise.all([
      options.transaction.get(internalRef),
      options.transaction.get(jobRef),
      options.transaction.get(matchesQuery),
      options.transaction.get(sessionsQuery),
    ]);
  const requestedAt = Timestamp.fromDate(options.now);

  if (internalSnapshot.exists &&
    internalSnapshot.data()?.accountStatus === "deletion_pending" &&
    jobSnapshot.exists) {
    return { status: "deletion_pending" };
  }

  options.transaction.set(internalRef, {
    accountStatus: "deletion_pending",
    deletionRequestedAt: requestedAt,
  }, { merge: true });
  options.transaction.set(preferencesRef, {
    discoveryEnabled: false,
    deletionRequestedAt: requestedAt,
  }, { merge: true });
  options.transaction.set(profileRef, {
    profileStatus: "rejected",
    deletionRequestedAt: requestedAt,
  }, { merge: true });
  for (const matchDoc of matchesSnapshot.docs) {
    const data = matchDoc.data();
    if (data.status === "active") {
      options.transaction.update(matchDoc.ref, {
        status: "deletion_pending",
        messagingEnabled: false,
        deletionPendingBy: options.uid,
        deletionPendingAt: requestedAt,
        updatedAt: requestedAt,
      });
    }
  }
  for (const sessionDoc of sessionsSnapshot.docs) {
    options.transaction.update(sessionDoc.ref, {
      revoked: true,
      revokedAt: requestedAt,
      revokeReason: "account_deletion",
    });
  }
  options.transaction.set(jobRef, {
    ownerId: options.uid,
    status: "pending",
    requestedAt,
    completedSteps: [],
    retentionClass: TBD_LEGAL_REVIEW,
  }, { merge: true });

  return { status: "deletion_pending" };
}

function assertMatchMember(data: DocumentData | undefined, uid: string): {
  memberIds: string[];
  status: string;
} {
  if (!data) {
    throw new AppError("not_found");
  }
  const memberIds = data.memberIds;
  if (!Array.isArray(memberIds) || !memberIds.every((memberId) => typeof memberId === "string")) {
    throw new AppError("internal");
  }
  if (!memberIds.includes(uid)) {
    throw new AppError("permission_denied");
  }

  return {
    memberIds,
    status: typeof data.status === "string" ? data.status : "inactive",
  };
}

function assertBlockContext(
  data: DocumentData | undefined,
  blockerId: string,
  targetId: string,
): { status: string } {
  const match = assertMatchMember(data, blockerId);
  if (!match.memberIds.includes(targetId)) {
    throw new AppError("permission_denied");
  }

  return { status: match.status };
}

function reportDedupeKey(options: {
  reporterId: string;
  targetType: string;
  targetId: string;
  matchId: string | null;
  messageId: string | null;
  category: string;
}): string {
  return createHash("sha256")
    .update([
      options.reporterId,
      options.targetType,
      options.targetId,
      options.matchId ?? "",
      options.messageId ?? "",
      options.category,
    ].join("\u0000"), "utf8")
    .digest("hex");
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function readCount(data: DocumentData | undefined): number {
  return typeof data?.count === "number" && Number.isInteger(data.count) ?
    data.count :
    0;
}

function assertDailyLimit(data: DocumentData | undefined): void {
  if (readCount(data) >= REPORT_DAILY_LIMIT) {
    throw new AppError("rate_limited");
  }
}

function completedStepsFrom(data: DocumentData | undefined): string[] {
  const value = data?.completedSteps;
  return Array.isArray(value) && value.every((item) => typeof item === "string") ?
    value :
    [];
}

export const safetyTestExports = {
  normalizeSafetyText,
  reportTokenForMatch,
  reportTokenForMessage,
  reportTokenHash,
  TBD_LEGAL_REVIEW,
};
