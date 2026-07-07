import { getFirestore } from "firebase-admin/firestore";
import { AppError } from "../../callable/app-error";
import {
  BootstrapDocumentData,
  BootstrapStore,
  GetAppBootstrapResponse,
  NotificationPreferences,
  OnboardingStatus,
  ProfileStatus,
  PublicAccountStatus,
} from "./bootstrap-types";

const PUBLIC_ACCOUNT_STATUSES = ["active", "suspended", "deletion_pending"] as const;
const PROFILE_STATUSES = ["draft", "pending", "approved", "rejected", "needs_review"] as const;

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = Object.freeze({
  newMatch: true,
  newMessage: true,
  systemAnnouncements: true,
  marketingNotifications: false,
});

class AdminBootstrapStore implements BootstrapStore {
  async get(path: string): Promise<BootstrapDocumentData | undefined> {
    const snapshot = await getFirestore().doc(path).get();
    return snapshot.exists ? snapshot.data() : undefined;
  }
}

export function createDefaultBootstrapStore(): BootstrapStore {
  return new AdminBootstrapStore();
}

function pathFor(collection: string, uid: string): string {
  return `${collection}/${uid}`;
}

function readString(data: BootstrapDocumentData | undefined, field: string): string | undefined {
  const value = data?.[field];
  return typeof value === "string" ? value : undefined;
}

function readBoolean(data: BootstrapDocumentData | undefined, field: string): boolean | undefined {
  const value = data?.[field];
  return typeof value === "boolean" ? value : undefined;
}

function readStringArray(data: BootstrapDocumentData | undefined, field: string): string[] | undefined {
  const value = data?.[field];

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return undefined;
  }

  return value;
}

function validateAccountStatus(value: unknown): PublicAccountStatus {
  if (PUBLIC_ACCOUNT_STATUSES.includes(value as PublicAccountStatus)) {
    return value as PublicAccountStatus;
  }

  throw new AppError("internal");
}

function validateProfileStatus(value: unknown): ProfileStatus {
  if (PROFILE_STATUSES.includes(value as ProfileStatus)) {
    return value as ProfileStatus;
  }

  throw new AppError("internal");
}

function determineOnboardingStatus(documents: {
  privateData?: BootstrapDocumentData;
  internalData?: BootstrapDocumentData;
  profileData?: BootstrapDocumentData;
}): OnboardingStatus {
  if (documents.privateData && documents.internalData && documents.profileData) {
    return "completed";
  }

  if (documents.privateData || documents.profileData) {
    return "in_progress";
  }

  return "not_started";
}

function sanitizeConsentSummary(value: unknown): GetAppBootstrapResponse["consentSummary"] {
  if (value === undefined) {
    return {};
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("internal");
  }

  const summary: GetAppBootstrapResponse["consentSummary"] = {};

  for (const [type, entry] of Object.entries(value)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new AppError("internal");
    }

    const entryRecord = entry as Record<string, unknown>;

    if (typeof entryRecord.version !== "string" || typeof entryRecord.granted !== "boolean") {
      throw new AppError("internal");
    }

    summary[type] = {
      version: entryRecord.version,
      granted: entryRecord.granted,
    };
  }

  return summary;
}

function notificationPreferencesFrom(
  data: BootstrapDocumentData | undefined,
): NotificationPreferences {
  if (!data) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  const preferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  };

  for (const field of Object.keys(DEFAULT_NOTIFICATION_PREFERENCES) as Array<keyof NotificationPreferences>) {
    const value = data[field];

    if (value === undefined) {
      continue;
    }

    if (typeof value !== "boolean") {
      throw new AppError("internal");
    }

    preferences[field] = value;
  }

  return preferences;
}

function isDiscoveryEligible(
  accountStatus: PublicAccountStatus,
  profileStatus: ProfileStatus,
  profileData: BootstrapDocumentData | undefined,
  preferencesData: BootstrapDocumentData | undefined,
): boolean {
  if (accountStatus !== "active" || profileStatus !== "approved") {
    return false;
  }

  const discoveryEnabled = readBoolean(preferencesData, "discoveryEnabled") === true;
  const photoIds = readStringArray(profileData, "photoIds");

  if (photoIds === undefined) {
    throw new AppError("internal");
  }

  return discoveryEnabled && photoIds.length > 0;
}

export async function getAppBootstrapForUid(
  uid: string,
  store: BootstrapStore,
): Promise<GetAppBootstrapResponse> {
  const privateData = await store.get(pathFor("users_private", uid));
  const internalData = await store.get(pathFor("users_internal", uid));
  const profileData = await store.get(pathFor("profiles", uid));
  const preferencesData = await store.get(pathFor("preferences", uid));
  const notificationData = await store.get(pathFor("notification_preferences", uid));
  const onboardingStatus = determineOnboardingStatus({
    privateData,
    internalData,
    profileData,
  });
  const accountStatus = internalData ?
    validateAccountStatus(readString(internalData, "accountStatus")) :
    "active";
  const profileStatus = profileData ?
    validateProfileStatus(readString(profileData, "profileStatus")) :
    "draft";
  const consentSummary = sanitizeConsentSummary(privateData?.consentSummary);

  return {
    onboardingStatus,
    accountStatus,
    profileStatus,
    discoveryEligible: isDiscoveryEligible(accountStatus, profileStatus, profileData, preferencesData),
    moderationActionRequired: profileStatus === "rejected" || profileStatus === "needs_review",
    notificationPreferences: notificationPreferencesFrom(notificationData),
    consentSummary,
  };
}

export const bootstrapTestExports = {
  DEFAULT_NOTIFICATION_PREFERENCES,
  sanitizeConsentSummary,
};
