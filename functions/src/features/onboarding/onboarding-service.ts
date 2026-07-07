import { getAuth } from "firebase-admin/auth";
import { Firestore, getFirestore, Transaction } from "firebase-admin/firestore";
import { AppError } from "../../callable/app-error";
import { validateAdultBirthDate } from "./age-validation";
import { createConsentRecordId } from "./consent-record-id";
import {
  CompleteOnboardingDependencies,
  CompleteOnboardingInput,
  CompleteOnboardingResponse,
  ConsentRecordInput,
  ConsentSummary,
  FINALIZED_PHOTO_STATUSES,
  OnboardingDocumentData,
  OnboardingStore,
  OnboardingTransaction,
} from "./onboarding-types";

const ONBOARDING_REVISION_ID = "onboarding_initial";

class AdminAuthUserReader {
  async getEmail(uid: string): Promise<string> {
    try {
      const userRecord = await getAuth().getUser(uid);

      if (!userRecord.email) {
        throw new AppError("unauthenticated");
      }

      return userRecord.email;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("unauthenticated", { cause: error });
    }
  }
}

class AdminOnboardingTransaction implements OnboardingTransaction {
  constructor(
    private readonly firestore: Firestore,
    private readonly transaction: Transaction,
  ) {}

  async get(path: string): Promise<OnboardingDocumentData | undefined> {
    const snapshot = await this.transaction.get(this.firestore.doc(path));
    return snapshot.exists ? snapshot.data() : undefined;
  }

  set(path: string, data: OnboardingDocumentData): void {
    this.transaction.set(this.firestore.doc(path), data);
  }

  async hasFinalizedProfilePhoto(uid: string): Promise<boolean> {
    const snapshot = await this.transaction.get(
      this.firestore.collection("profile_photos")
        .where("ownerId", "==", uid)
        .where("status", "in", FINALIZED_PHOTO_STATUSES)
        .limit(1),
    );

    return !snapshot.empty;
  }
}

class AdminOnboardingStore implements OnboardingStore {
  private readonly firestore = getFirestore();

  async runTransaction<T>(handler: (transaction: OnboardingTransaction) => Promise<T>): Promise<T> {
    return this.firestore.runTransaction((transaction) => handler(
      new AdminOnboardingTransaction(this.firestore, transaction),
    ));
  }
}

export function createDefaultCompleteOnboardingDependencies(): CompleteOnboardingDependencies {
  return {
    auth: new AdminAuthUserReader(),
    store: new AdminOnboardingStore(),
    now: () => new Date(),
  };
}

function pathFor(collection: string, uid: string): string {
  return `${collection}/${uid}`;
}

function revisionPath(uid: string): string {
  return `profile_revisions/${uid}/items/${ONBOARDING_REVISION_ID}`;
}

function consentRecordPath(uid: string, record: ConsentRecordInput): string {
  return `consent_history/${uid}/records/${createConsentRecordId(record.type, record.version)}`;
}

function buildConsentSummary(records: readonly ConsentRecordInput[], recordedAt: Date): ConsentSummary {
  const summary: ConsentSummary = {};

  for (const record of records) {
    summary[record.type] = {
      version: record.version,
      granted: record.granted,
      recordedAt,
    };
  }

  return summary;
}

function readString(data: OnboardingDocumentData | undefined, field: string): string | undefined {
  const value = data?.[field];
  return typeof value === "string" ? value : undefined;
}

function readBoolean(data: OnboardingDocumentData | undefined, field: string): boolean | undefined {
  const value = data?.[field];
  return typeof value === "boolean" ? value : undefined;
}

function readStringArray(data: OnboardingDocumentData | undefined, field: string): string[] | undefined {
  const value = data?.[field];

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return undefined;
  }

  return value;
}

function normalizedConsentRecords(records: readonly ConsentRecordInput[]): ConsentRecordInput[] {
  return [...records].sort((left, right) => left.type.localeCompare(right.type));
}

function assertAllowedExistingAccountState(data: OnboardingDocumentData | undefined): void {
  const status = data?.accountStatus;

  if (status === undefined) {
    return;
  }

  if (status === "active") {
    return;
  }

  if (status === "suspended" || status === "deletion_pending" || status === "deleted") {
    throw new AppError("account_restricted");
  }

  throw new AppError("internal");
}

function consentSummaryMatches(
  summary: unknown,
  records: readonly ConsentRecordInput[],
): boolean {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return false;
  }

  const summaryRecord = summary as Record<string, unknown>;
  const expectedRecords = normalizedConsentRecords(records);
  const keys = Object.keys(summaryRecord).sort();
  const expectedKeys = expectedRecords.map((record) => record.type).sort();

  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    return false;
  }

  return expectedRecords.every((record) => {
    const entry = summaryRecord[record.type];

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return false;
    }

    const entryRecord = entry as Record<string, unknown>;
    return entryRecord.version === record.version && entryRecord.granted === record.granted;
  });
}

async function consentHistoryMatches(
  transaction: OnboardingTransaction,
  uid: string,
  records: readonly ConsentRecordInput[],
): Promise<boolean> {
  for (const record of records) {
    const storedRecord = await transaction.get(consentRecordPath(uid, record));

    if (
      !storedRecord ||
      storedRecord.consentType !== record.type ||
      storedRecord.version !== record.version ||
      storedRecord.granted !== record.granted
    ) {
      return false;
    }
  }

  return true;
}

async function isEquivalentCompletedOnboarding(
  transaction: OnboardingTransaction,
  uid: string,
  email: string,
  data: CompleteOnboardingInput,
  documents: {
    privateData: OnboardingDocumentData;
    internalData: OnboardingDocumentData;
    profileData: OnboardingDocumentData;
    preferencesData: OnboardingDocumentData;
    revisionData: OnboardingDocumentData;
  },
): Promise<boolean> {
  const expectedConsentRecords = normalizedConsentRecords(data.consentRecords);

  return (
    readString(documents.privateData, "email") === email &&
    readString(documents.privateData, "birthDate") === data.birthDate &&
    consentSummaryMatches(documents.privateData.consentSummary, expectedConsentRecords) &&
    readString(documents.internalData, "accountStatus") === "active" &&
    readString(documents.profileData, "profileStatus") === "pending" &&
    readString(documents.profileData, "activeRevisionId") === ONBOARDING_REVISION_ID &&
    readStringArray(documents.profileData, "photoIds")?.length === 0 &&
    readString(documents.revisionData, "ownerId") === uid &&
    readString(documents.revisionData, "proposedDisplayName") === data.displayName &&
    readString(documents.revisionData, "proposedCityId") === data.cityId &&
    readString(documents.revisionData, "proposedBio") === data.bio &&
    arraysEqual(readStringArray(documents.revisionData, "proposedInterests"), data.interests) &&
    readString(documents.revisionData, "proposedIntent") === data.intent &&
    readString(documents.revisionData, "status") === "pending" &&
    readString(documents.preferencesData, "selfGender") === data.selfGender &&
    arraysEqual(readStringArray(documents.preferencesData, "shownGenderPreferences"), data.shownGenderPreferences) &&
    readBoolean(documents.preferencesData, "discoveryEnabled") === false &&
    await consentHistoryMatches(transaction, uid, expectedConsentRecords)
  );
}

function arraysEqual(left: readonly string[] | undefined, right: readonly string[]): boolean {
  if (!left || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function hasCompletedPrimaryState(documents: {
  privateData?: OnboardingDocumentData;
  internalData?: OnboardingDocumentData;
  profileData?: OnboardingDocumentData;
  preferencesData?: OnboardingDocumentData;
  revisionData?: OnboardingDocumentData;
}): documents is {
  privateData: OnboardingDocumentData;
  internalData: OnboardingDocumentData;
  profileData: OnboardingDocumentData;
  preferencesData: OnboardingDocumentData;
  revisionData: OnboardingDocumentData;
} {
  return Boolean(
    documents.privateData &&
    documents.internalData &&
    documents.profileData &&
    documents.preferencesData &&
    documents.revisionData,
  );
}

function hasPartialPrimaryState(documents: {
  privateData?: OnboardingDocumentData;
  profileData?: OnboardingDocumentData;
  preferencesData?: OnboardingDocumentData;
  revisionData?: OnboardingDocumentData;
}): boolean {
  return Boolean(
    documents.privateData ||
    documents.profileData ||
    documents.preferencesData ||
    documents.revisionData,
  );
}

function buildResponse(): CompleteOnboardingResponse {
  return {
    status: "completed",
    profileStatus: "pending",
    discoveryEligible: false,
  };
}

function writeOnboardingState(
  transaction: OnboardingTransaction,
  uid: string,
  email: string,
  data: CompleteOnboardingInput,
  operationTime: Date,
): void {
  const sortedConsentRecords = normalizedConsentRecords(data.consentRecords);
  const consentSummary = buildConsentSummary(sortedConsentRecords, operationTime);

  transaction.set(pathFor("users_private", uid), {
    email,
    birthDate: data.birthDate,
    consentSummary,
    createdAt: operationTime,
  });

  transaction.set(pathFor("users_internal", uid), {
    accountStatus: "active",
  });

  transaction.set(pathFor("profiles", uid), {
    displayName: null,
    cityId: null,
    bio: null,
    interests: [],
    intent: null,
    photoIds: [],
    profileStatus: "pending",
    activeRevisionId: ONBOARDING_REVISION_ID,
    createdAt: operationTime,
    updatedAt: operationTime,
  });

  transaction.set(revisionPath(uid), {
    ownerId: uid,
    proposedDisplayName: data.displayName,
    proposedCityId: data.cityId,
    proposedBio: data.bio,
    proposedInterests: data.interests,
    proposedIntent: data.intent,
    status: "pending",
    createdAt: operationTime,
    submittedAt: operationTime,
  });

  transaction.set(pathFor("preferences", uid), {
    selfGender: data.selfGender,
    shownGenderPreferences: data.shownGenderPreferences,
    discoveryEnabled: false,
    updatedAt: operationTime,
  });

  for (const record of sortedConsentRecords) {
    transaction.set(consentRecordPath(uid, record), {
      consentType: record.type,
      version: record.version,
      granted: record.granted,
      recordedAt: operationTime,
    });
  }
}

export async function completeOnboardingForUid(
  uid: string,
  data: CompleteOnboardingInput,
  dependencies: CompleteOnboardingDependencies,
): Promise<CompleteOnboardingResponse> {
  validateAdultBirthDate(data.birthDate, dependencies.now());
  const email = await dependencies.auth.getEmail(uid);
  const operationTime = dependencies.now();

  return dependencies.store.runTransaction(async (transaction) => {
    const privateData = await transaction.get(pathFor("users_private", uid));
    const internalData = await transaction.get(pathFor("users_internal", uid));
    const profileData = await transaction.get(pathFor("profiles", uid));
    const preferencesData = await transaction.get(pathFor("preferences", uid));
    const revisionData = await transaction.get(revisionPath(uid));
    const documents = {
      privateData,
      internalData,
      profileData,
      preferencesData,
      revisionData,
    };

    assertAllowedExistingAccountState(internalData);

    if (hasCompletedPrimaryState(documents)) {
      if (await isEquivalentCompletedOnboarding(transaction, uid, email, data, documents)) {
        return buildResponse();
      }

      throw new AppError("already_exists");
    }

    if (hasPartialPrimaryState(documents)) {
      throw new AppError("internal");
    }

    if (!await transaction.hasFinalizedProfilePhoto(uid)) {
      throw new AppError("input_invalid");
    }

    writeOnboardingState(transaction, uid, email, data, operationTime);
    return buildResponse();
  });
}

export const onboardingTestExports = {
  ONBOARDING_REVISION_ID,
  consentRecordPath,
  normalizedConsentRecords,
};
