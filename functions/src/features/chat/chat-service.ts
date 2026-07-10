import { createHash } from "node:crypto";
import {
  DocumentData,
  FieldPath,
  FieldValue,
  Firestore,
  getFirestore,
  Timestamp,
  Transaction,
} from "firebase-admin/firestore";
import { AppError } from "../../callable/app-error";
import {
  ChatDependencies,
  ChatStore,
  MarkMatchReadInput,
  MarkMatchReadResponse,
  SendMessageInput,
  SendMessageResponse,
  SetMatchMutedInput,
  SetMatchMutedResponse,
} from "./chat-types";

const MAX_MESSAGE_LENGTH = 1_000;

class AdminChatStore implements ChatStore {
  private readonly firestore = getFirestore();

  async sendMessage(
    uid: string,
    input: SendMessageInput,
    now: Date,
  ): Promise<SendMessageResponse> {
    return this.firestore.runTransaction((transaction) => {
      return sendMessageTransaction({
        firestore: this.firestore,
        transaction,
        uid,
        input,
        now,
      });
    });
  }

  async markMatchRead(
    uid: string,
    input: MarkMatchReadInput,
    now: Date,
  ): Promise<MarkMatchReadResponse> {
    return this.firestore.runTransaction((transaction) => {
      return markMatchReadTransaction({
        firestore: this.firestore,
        transaction,
        uid,
        input,
        now,
      });
    });
  }

  async setMatchMuted(
    uid: string,
    input: SetMatchMutedInput,
    now: Date,
  ): Promise<SetMatchMutedResponse> {
    return this.firestore.runTransaction((transaction) => {
      return setMatchMutedTransaction({
        firestore: this.firestore,
        transaction,
        uid,
        input,
        now,
      });
    });
  }
}

export function createDefaultChatDependencies(): ChatDependencies {
  return {
    store: new AdminChatStore(),
    now: () => new Date(),
  };
}

export function sendMessageForUid(
  uid: string,
  input: SendMessageInput,
  dependencies: ChatDependencies,
): Promise<SendMessageResponse> {
  return dependencies.store.sendMessage(uid, input, dependencies.now());
}

export function markMatchReadForUid(
  uid: string,
  input: MarkMatchReadInput,
  dependencies: ChatDependencies,
): Promise<MarkMatchReadResponse> {
  return dependencies.store.markMatchRead(uid, input, dependencies.now());
}

export function setMatchMutedForUid(
  uid: string,
  input: SetMatchMutedInput,
  dependencies: ChatDependencies,
): Promise<SetMatchMutedResponse> {
  return dependencies.store.setMatchMuted(uid, input, dependencies.now());
}

export function normalizeMessageText(text: string): string {
  let withoutUnsafeControls = "";
  for (const char of text.normalize("NFKC")) {
    const code = char.charCodeAt(0);
    withoutUnsafeControls += isUnsafeControlCode(code) ? " " : char;
  }

  return withoutUnsafeControls
    .replace(/\s+/gu, " ")
    .trim();
}

function isUnsafeControlCode(code: number): boolean {
  return (code >= 0 && code <= 8) ||
    code === 11 ||
    code === 12 ||
    (code >= 14 && code <= 31) ||
    code === 127;
}

export function messageIdFor(senderId: string, clientMessageId: string): string {
  return createHash("sha256")
    .update(`${senderId}\u0000${clientMessageId}`, "utf8")
    .digest("hex");
}

async function sendMessageTransaction(options: {
  firestore: Firestore;
  transaction: Transaction;
  uid: string;
  input: SendMessageInput;
  now: Date;
}): Promise<SendMessageResponse> {
  const text = normalizeAndAssertText(options.input.text);
  const matchRef = options.firestore.collection("matches").doc(options.input.matchId);
  const messageId = messageIdFor(options.uid, options.input.clientMessageId);
  const messageRef = matchRef.collection("messages").doc(messageId);
  const [matchSnapshot, messageSnapshot] = await Promise.all([
    options.transaction.get(matchRef),
    options.transaction.get(messageRef),
  ]);
  const match = assertSendableMatch(matchSnapshot.data(), options.uid);

  if (messageSnapshot.exists) {
    return replayExistingMessage({
      data: messageSnapshot.data(),
      expectedSenderId: options.uid,
      expectedClientMessageId: options.input.clientMessageId,
      expectedText: text,
    });
  }

  const createdAt = Timestamp.fromDate(options.now);
  options.transaction.create(messageRef, {
    senderId: options.uid,
    type: "text",
    text,
    createdAt,
    clientMessageId: options.input.clientMessageId,
    moderationStatus: "clean",
  });

  const updateData = {
    lastMessageAt: createdAt,
    lastMessagePreview: text,
    updatedAt: createdAt,
  };
  options.transaction.update(matchRef, updateData);

  for (const memberId of match.memberIds) {
    if (memberId !== options.uid) {
      options.transaction.update(
        matchRef,
        new FieldPath("unreadCounts", memberId),
        FieldValue.increment(1),
      );
    }
  }

  return {
    status: "sent",
    messageId,
    createdAt: options.now.toISOString(),
    text,
  };
}

async function markMatchReadTransaction(options: {
  firestore: Firestore;
  transaction: Transaction;
  uid: string;
  input: MarkMatchReadInput;
  now: Date;
}): Promise<MarkMatchReadResponse> {
  const matchRef = options.firestore.collection("matches").doc(options.input.matchId);
  const matchSnapshot = await options.transaction.get(matchRef);
  assertReadableMatch(matchSnapshot.data(), options.uid);
  const readAt = Timestamp.fromDate(options.now);

  options.transaction.update(matchRef, { updatedAt: readAt });
  options.transaction.update(
    matchRef,
    new FieldPath("lastReadAt", options.uid),
    readAt,
  );
  options.transaction.update(
    matchRef,
    new FieldPath("unreadCounts", options.uid),
    0,
  );

  return { status: "read" };
}

async function setMatchMutedTransaction(options: {
  firestore: Firestore;
  transaction: Transaction;
  uid: string;
  input: SetMatchMutedInput;
  now: Date;
}): Promise<SetMatchMutedResponse> {
  const matchRef = options.firestore.collection("matches").doc(options.input.matchId);
  const matchSnapshot = await options.transaction.get(matchRef);
  assertReadableMatch(matchSnapshot.data(), options.uid);

  options.transaction.update(matchRef, {
    updatedAt: Timestamp.fromDate(options.now),
  });
  options.transaction.update(
    matchRef,
    new FieldPath("mutedBy", options.uid),
    options.input.muted,
  );

  return { status: "muted", muted: options.input.muted };
}

function normalizeAndAssertText(text: string): string {
  const normalized = normalizeMessageText(text);
  if (normalized.length < 1 || normalized.length > MAX_MESSAGE_LENGTH) {
    throw new AppError("input_invalid");
  }

  return normalized;
}

function replayExistingMessage(options: {
  data: DocumentData | undefined;
  expectedSenderId: string;
  expectedClientMessageId: string;
  expectedText: string;
}): SendMessageResponse {
  if (
    options.data?.senderId !== options.expectedSenderId ||
    options.data?.clientMessageId !== options.expectedClientMessageId ||
    options.data?.type !== "text"
  ) {
    throw new AppError("already_exists");
  }
  if (options.data.text !== options.expectedText) {
    throw new AppError("already_exists");
  }

  const createdAt = options.data.createdAt;
  if (!(createdAt instanceof Timestamp)) {
    throw new AppError("internal");
  }

  return {
    status: "sent",
    messageId: messageIdFor(options.expectedSenderId, options.expectedClientMessageId),
    createdAt: createdAt.toDate().toISOString(),
    text: options.expectedText,
  };
}

function assertSendableMatch(data: DocumentData | undefined, uid: string): {
  memberIds: string[];
} {
  const match = assertReadableMatch(data, uid);
  if (data?.status !== "active") {
    throw new AppError("match_not_active");
  }
  if (data.messagingEnabled !== true) {
    throw new AppError("messaging_disabled");
  }
  if (data.blockedBy !== null && data.blockedBy !== undefined) {
    throw new AppError("match_not_active");
  }

  return match;
}

function assertReadableMatch(data: DocumentData | undefined, uid: string): {
  memberIds: string[];
} {
  if (!data) {
    throw new AppError("not_found");
  }

  const memberIds = data.memberIds;
  if (
    !Array.isArray(memberIds) ||
    !memberIds.every((memberId) => typeof memberId === "string")
  ) {
    throw new AppError("internal");
  }
  if (!memberIds.includes(uid)) {
    throw new AppError("permission_denied");
  }

  return { memberIds };
}

export const chatTestExports = {
  messageIdFor,
  normalizeMessageText,
};
