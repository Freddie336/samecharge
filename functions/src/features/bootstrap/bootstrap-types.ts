export type OnboardingStatus = "not_started" | "in_progress" | "completed";
export type PublicAccountStatus = "active" | "suspended" | "deletion_pending";
export type ProfileStatus = "draft" | "pending" | "approved" | "rejected" | "needs_review";

export interface NotificationPreferences {
  newMatch: boolean;
  newMessage: boolean;
  systemAnnouncements: boolean;
  marketingNotifications: boolean;
}

export interface BootstrapConsentSummaryEntry {
  version: string;
  granted: boolean;
}

export interface GetAppBootstrapResponse {
  onboardingStatus: OnboardingStatus;
  accountStatus: PublicAccountStatus;
  profileStatus: ProfileStatus;
  discoveryEligible: boolean;
  moderationActionRequired: boolean;
  notificationPreferences: NotificationPreferences;
  consentSummary: Record<string, BootstrapConsentSummaryEntry>;
}

export interface BootstrapDocumentData {
  [field: string]: unknown;
}

export interface BootstrapStore {
  get(path: string): Promise<BootstrapDocumentData | undefined>;
}
