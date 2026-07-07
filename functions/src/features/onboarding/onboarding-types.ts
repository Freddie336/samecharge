export const INTENT_VALUES = ["dating", "friendship", "chat"] as const;
export const GENDER_VALUES = ["male", "female", "nonbinary", "unspecified"] as const;
export const CONSENT_TYPE_VALUES = ["terms", "privacy", "explicit_data", "analytics", "marketing"] as const;
export const REQUIRED_CONSENT_TYPES = ["terms", "privacy", "explicit_data"] as const;
export const OPTIONAL_CONSENT_TYPES = ["analytics", "marketing"] as const;
export const FINALIZED_PHOTO_STATUSES = ["pending", "approved", "needs_review"] as const;

export type Intent = typeof INTENT_VALUES[number];
export type Gender = typeof GENDER_VALUES[number];
export type ConsentType = typeof CONSENT_TYPE_VALUES[number];
export type RequiredConsentType = typeof REQUIRED_CONSENT_TYPES[number];

export interface ConsentRecordInput {
  type: ConsentType;
  version: string;
  granted: boolean;
}

export interface CompleteOnboardingInput {
  displayName: string;
  birthDate: string;
  cityId: "istanbul";
  bio: string;
  interests: string[];
  intent: Intent;
  selfGender: Gender;
  shownGenderPreferences: Gender[];
  consentRecords: ConsentRecordInput[];
}

export interface CompleteOnboardingResponse {
  status: "completed";
  profileStatus: "pending";
  discoveryEligible: false;
}

export interface ConsentSummaryEntry {
  version: string;
  granted: boolean;
  recordedAt?: unknown;
}

export type ConsentSummary = Partial<Record<ConsentType, ConsentSummaryEntry>>;

export interface OnboardingDocumentData {
  [field: string]: unknown;
}

export interface OnboardingTransaction {
  get(path: string): Promise<OnboardingDocumentData | undefined>;
  set(path: string, data: OnboardingDocumentData): void;
  hasFinalizedProfilePhoto(uid: string): Promise<boolean>;
}

export interface OnboardingStore {
  runTransaction<T>(handler: (transaction: OnboardingTransaction) => Promise<T>): Promise<T>;
}

export interface AuthUserReader {
  getEmail(uid: string): Promise<string>;
}

export interface CompleteOnboardingDependencies {
  auth: AuthUserReader;
  store: OnboardingStore;
  now: () => Date;
}
