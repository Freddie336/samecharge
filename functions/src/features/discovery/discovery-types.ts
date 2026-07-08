export const DISCOVERY_ALLOWED_RANGES = [0, 1, 3] as const;
export const DISCOVERY_SUPPORTED_CITY_ID = "istanbul";
export const DISCOVERY_PRESENCE_FRESH_MS = 90_000;
export const DISCOVERY_TOKEN_TTL_MS = 5 * 60_000;
export const DISCOVERY_BATTERY_STATES = ["charging", "discharging", "full", "unknown"] as const;

export type DiscoveryRange = typeof DISCOVERY_ALLOWED_RANGES[number];
export type DiscoveryBatteryState = typeof DISCOVERY_BATTERY_STATES[number];

export interface StartDiscoveryInput {
  requestedRange: DiscoveryRange;
  pageSize: number;
}

export interface CandidatePhotoRef {
  photoId: string;
}

export interface CandidateView {
  candidateToken: string;
  displayName: string;
  age: number;
  cityLabel: "Istanbul";
  bio: string;
  interests: string[];
  photoRefs: CandidatePhotoRef[];
  batteryLabel: string;
  batteryDifference: number;
  expiresAt: string;
}

export interface StartDiscoveryResponse {
  candidates: CandidateView[];
  expiresAt: string;
}

export interface PresenceRecord {
  batteryLevel: number;
  batteryState: DiscoveryBatteryState;
  cityId: typeof DISCOVERY_SUPPORTED_CITY_ID;
  online: boolean;
  lastSeenAt: number;
}

export interface DiscoveryProfileRecord {
  uid: string;
  displayName: string;
  cityId: typeof DISCOVERY_SUPPORTED_CITY_ID;
  bio: string;
  interests: string[];
  profileStatus: "approved";
  photoIds?: string[];
}

export interface DiscoveryUserPrivateRecord {
  birthDate: string;
}

export interface DiscoveryUserInternalRecord {
  accountStatus: "active" | "suspended" | "deletion_pending" | "deleted";
}

export interface DiscoveryPreferencesRecord {
  discoveryEnabled?: boolean;
}

export interface DiscoveryApprovedPhoto {
  photoId: string;
}

export interface DiscoverySessionWrite {
  sessionId: string;
  requesterId: string;
  requestedRange: DiscoveryRange;
  createdAt: Date;
  expiresAt: Date;
  tokenRecords: DiscoveryCandidateTokenWrite[];
}

export interface DiscoveryCandidateTokenWrite {
  tokenHash: string;
  candidateId: string;
  expiresAt: Date;
}

export interface DiscoveryStore {
  getPrivate(uid: string): Promise<DiscoveryUserPrivateRecord | undefined>;
  getInternal(uid: string): Promise<DiscoveryUserInternalRecord | undefined>;
  getProfile(uid: string): Promise<DiscoveryProfileRecord | undefined>;
  getPreferences(uid: string): Promise<DiscoveryPreferencesRecord | undefined>;
  getApprovedPhotos(uid: string): Promise<DiscoveryApprovedPhoto[]>;
  getPresence(uid: string): Promise<PresenceRecord | undefined>;
  listApprovedProfiles(cityId: typeof DISCOVERY_SUPPORTED_CITY_ID): Promise<DiscoveryProfileRecord[]>;
  writeDiscoverySession(write: DiscoverySessionWrite): Promise<void>;
}

export interface DiscoveryTokenFactory {
  createRawToken: () => string;
  hashToken: (token: string) => string;
  createSessionId: () => string;
}

export interface StartDiscoveryDependencies {
  store: DiscoveryStore;
  tokens: DiscoveryTokenFactory;
  now: () => Date;
}
