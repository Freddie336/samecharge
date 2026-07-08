import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getDatabase } from "firebase-admin/database";
import { DocumentData, FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { AppError } from "../../callable/app-error";
import {
  CandidateView,
  DISCOVERY_BATTERY_STATES,
  DISCOVERY_PRESENCE_FRESH_MS,
  DISCOVERY_SUPPORTED_CITY_ID,
  DISCOVERY_TOKEN_TTL_MS,
  DiscoveryApprovedPhoto,
  DiscoveryBatteryState,
  DiscoveryProfileRecord,
  DiscoveryRange,
  DiscoverySessionWrite,
  DiscoveryStore,
  DiscoveryUserInternalRecord,
  DiscoveryUserPrivateRecord,
  PresenceRecord,
  StartDiscoveryDependencies,
  StartDiscoveryInput,
  StartDiscoveryResponse,
} from "./discovery-types";

class AdminDiscoveryStore implements DiscoveryStore {
  private readonly firestore = getFirestore();
  private readonly database = getDatabase();

  async getPrivate(uid: string): Promise<DiscoveryUserPrivateRecord | undefined> {
    const snapshot = await this.firestore.doc(`users_private/${uid}`).get();
    return snapshot.exists ? privateFrom(snapshot.data()) : undefined;
  }

  async getInternal(uid: string): Promise<DiscoveryUserInternalRecord | undefined> {
    const snapshot = await this.firestore.doc(`users_internal/${uid}`).get();
    return snapshot.exists ? internalFrom(snapshot.data()) : undefined;
  }

  async getProfile(uid: string): Promise<DiscoveryProfileRecord | undefined> {
    const snapshot = await this.firestore.doc(`profiles/${uid}`).get();
    return snapshot.exists ? profileFrom(uid, snapshot.data()) : undefined;
  }

  async getPreferences(uid: string) {
    const snapshot = await this.firestore.doc(`preferences/${uid}`).get();
    const data = snapshot.data();
    return snapshot.exists ? {
      discoveryEnabled: typeof data?.discoveryEnabled === "boolean" ? data.discoveryEnabled : undefined,
    } : undefined;
  }

  async getApprovedPhotos(uid: string): Promise<DiscoveryApprovedPhoto[]> {
    const snapshot = await this.firestore.collection("profile_photos")
      .where("ownerId", "==", uid)
      .where("status", "==", "approved")
      .limit(4)
      .get();

    return snapshot.docs.map((doc) => ({ photoId: doc.id }));
  }

  async getPresence(uid: string): Promise<PresenceRecord | undefined> {
    const snapshot = await this.database.ref(`presence/${uid}`).get();
    return snapshot.exists() ? presenceFrom(snapshot.val()) : undefined;
  }

  async listApprovedProfiles(cityId: typeof DISCOVERY_SUPPORTED_CITY_ID): Promise<DiscoveryProfileRecord[]> {
    const snapshot = await this.firestore.collection("profiles")
      .where("profileStatus", "==", "approved")
      .where("cityId", "==", cityId)
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => profileFrom(doc.id, doc.data()));
  }

  async writeDiscoverySession(write: DiscoverySessionWrite): Promise<void> {
    const batch = this.firestore.batch();
    const sessionRef = this.firestore.collection("discovery_sessions").doc(write.sessionId);

    batch.create(sessionRef, {
      ownerId: write.requesterId,
      requestedRange: write.requestedRange,
      createdAt: Timestamp.fromDate(write.createdAt),
      expiresAt: Timestamp.fromDate(write.expiresAt),
      candidateCount: write.tokenRecords.length,
    });

    for (const tokenRecord of write.tokenRecords) {
      const tokenRef = sessionRef.collection("candidates").doc(tokenRecord.tokenHash);
      batch.create(tokenRef, {
        tokenHash: tokenRecord.tokenHash,
        candidateId: tokenRecord.candidateId,
        expiresAt: Timestamp.fromDate(tokenRecord.expiresAt),
        used: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  }
}

export function createDefaultStartDiscoveryDependencies(): StartDiscoveryDependencies {
  return {
    store: new AdminDiscoveryStore(),
    tokens: {
      createRawToken: () => randomBytes(32).toString("base64url"),
      hashToken: hashCandidateToken,
      createSessionId: () => randomUUID(),
    },
    now: () => new Date(),
  };
}

export async function startDiscoveryForUid(
  uid: string,
  input: StartDiscoveryInput,
  dependencies: StartDiscoveryDependencies,
): Promise<StartDiscoveryResponse> {
  const now = dependencies.now();
  const requester = await loadEligibleRequester(uid, dependencies.store, now);
  const candidateProfiles = await dependencies.store.listApprovedProfiles(requester.profile.cityId);
  const candidates = await eligibleCandidates({
    requesterUid: uid,
    requesterPresence: requester.presence,
    profiles: candidateProfiles,
    requestedRange: input.requestedRange,
    pageSize: input.pageSize,
    store: dependencies.store,
    now,
  });
  const expiresAt = new Date(now.getTime() + DISCOVERY_TOKEN_TTL_MS);
  const sessionId = dependencies.tokens.createSessionId();
  const views: CandidateView[] = [];
  const tokenRecords = [];

  for (const candidate of candidates) {
    const rawToken = dependencies.tokens.createRawToken();
    const tokenHash = dependencies.tokens.hashToken(rawToken);

    tokenRecords.push({
      tokenHash,
      candidateId: candidate.profile.uid,
      expiresAt,
    });
    views.push({
      candidateToken: rawToken,
      displayName: candidate.profile.displayName,
      age: ageFromBirthDate(candidate.privateData.birthDate, now),
      cityLabel: "Istanbul",
      bio: candidate.profile.bio,
      interests: candidate.profile.interests,
      photoRefs: candidate.photos.map((photo) => ({ photoId: photo.photoId })),
      batteryLabel: batteryLabel(candidate.presence.batteryLevel, candidate.presence.batteryState),
      batteryDifference: Math.abs(candidate.presence.batteryLevel - requester.presence.batteryLevel),
      expiresAt: expiresAt.toISOString(),
    });
  }

  await dependencies.store.writeDiscoverySession({
    sessionId,
    requesterId: uid,
    requestedRange: input.requestedRange,
    createdAt: now,
    expiresAt,
    tokenRecords,
  });

  return {
    candidates: views,
    expiresAt: expiresAt.toISOString(),
  };
}

export function hashCandidateToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function loadEligibleRequester(uid: string, store: DiscoveryStore, now: Date) {
  const [privateData, internal, profile, preferences, photos, presence] = await Promise.all([
    store.getPrivate(uid),
    store.getInternal(uid),
    store.getProfile(uid),
    store.getPreferences(uid),
    store.getApprovedPhotos(uid),
    store.getPresence(uid),
  ]);

  if (!privateData || !internal || !profile || !preferences) {
    throw new AppError("profile_not_eligible");
  }

  assertAdult(privateData.birthDate, now);
  assertEligibleAccount(internal);
  assertEligibleProfile(profile, preferences, photos);
  assertFreshPresence(presence, now);

  return {
    privateData,
    internal,
    profile,
    preferences,
    photos,
    presence,
  };
}

async function eligibleCandidates(options: {
  requesterUid: string;
  requesterPresence: PresenceRecord;
  profiles: DiscoveryProfileRecord[];
  requestedRange: DiscoveryRange;
  pageSize: number;
  store: DiscoveryStore;
  now: Date;
}) {
  const loaded = [];

  for (const profile of options.profiles) {
    if (profile.uid === options.requesterUid) {
      continue;
    }

    const [privateData, internal, preferences, photos, presence] = await Promise.all([
      options.store.getPrivate(profile.uid),
      options.store.getInternal(profile.uid),
      options.store.getPreferences(profile.uid),
      options.store.getApprovedPhotos(profile.uid),
      options.store.getPresence(profile.uid),
    ]);

    if (!privateData || !internal || !preferences || !presence) {
      continue;
    }

    if (!isAdult(privateData.birthDate, options.now) ||
      internal.accountStatus !== "active" ||
      photos.length === 0 ||
      preferences.discoveryEnabled !== true ||
      !isFreshPresence(presence, options.now)) {
      continue;
    }

    const rank = batteryRank(options.requesterPresence, presence, options.requestedRange);
    if (rank === undefined) {
      continue;
    }

    loaded.push({
      profile,
      privateData,
      photos,
      presence,
      rank,
      difference: Math.abs(options.requesterPresence.batteryLevel - presence.batteryLevel),
    });
  }

  return loaded
    .sort((left, right) => left.rank - right.rank || left.difference - right.difference)
    .slice(0, options.pageSize);
}

function assertEligibleAccount(internal: DiscoveryUserInternalRecord): void {
  if (internal.accountStatus !== "active") {
    throw new AppError("account_restricted");
  }
}

function assertEligibleProfile(
  profile: DiscoveryProfileRecord,
  preferences: { discoveryEnabled?: boolean },
  photos: DiscoveryApprovedPhoto[],
): void {
  if (
    profile.profileStatus !== "approved" ||
    profile.cityId !== DISCOVERY_SUPPORTED_CITY_ID ||
    preferences.discoveryEnabled !== true ||
    photos.length === 0
  ) {
    throw new AppError("profile_not_eligible");
  }
}

function assertFreshPresence(presence: PresenceRecord | undefined, now: Date): asserts presence is PresenceRecord {
  if (!presence || !isFreshPresence(presence, now)) {
    throw new AppError("profile_not_eligible");
  }
}

function isFreshPresence(presence: PresenceRecord, now: Date): boolean {
  return presence.online === true &&
    presence.cityId === DISCOVERY_SUPPORTED_CITY_ID &&
    now.getTime() - presence.lastSeenAt <= DISCOVERY_PRESENCE_FRESH_MS;
}

function batteryRank(
  requesterPresence: PresenceRecord,
  candidatePresence: PresenceRecord,
  requestedRange: DiscoveryRange,
): number | undefined {
  const difference = Math.abs(requesterPresence.batteryLevel - candidatePresence.batteryLevel);

  if (difference === 0) {
    return 0;
  }

  if (requestedRange >= 1 &&
    requesterPresence.batteryState === candidatePresence.batteryState &&
    difference <= 1) {
    return 1;
  }

  if (requestedRange >= 3 && difference <= 3) {
    return 2;
  }

  return undefined;
}

function assertAdult(birthDate: string, now: Date): void {
  if (!isAdult(birthDate, now)) {
    throw new AppError("profile_not_eligible");
  }
}

function isAdult(birthDate: string, now: Date): boolean {
  const date = parseBirthDate(birthDate);
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const birthMonth = date.getUTCMonth();

  if (currentMonth < birthMonth ||
    (currentMonth === birthMonth && now.getUTCDate() < date.getUTCDate())) {
    age -= 1;
  }

  return age >= 18;
}

function ageFromBirthDate(birthDate: string, now: Date): number {
  const date = parseBirthDate(birthDate);
  let age = now.getUTCFullYear() - date.getUTCFullYear();

  if (now.getUTCMonth() < date.getUTCMonth() ||
    (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate())) {
    age -= 1;
  }

  return age;
}

function parseBirthDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new AppError("profile_not_eligible");
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("profile_not_eligible");
  }

  return date;
}

function batteryLabel(level: number, state: DiscoveryBatteryState): string {
  return `${level}% ${state}`;
}

function privateFrom(data: DocumentData | undefined): DiscoveryUserPrivateRecord {
  if (typeof data?.birthDate !== "string") {
    throw new AppError("internal");
  }

  return { birthDate: data.birthDate };
}

function internalFrom(data: DocumentData | undefined): DiscoveryUserInternalRecord {
  const accountStatus = data?.accountStatus;
  if (
    accountStatus !== "active" &&
    accountStatus !== "suspended" &&
    accountStatus !== "deletion_pending" &&
    accountStatus !== "deleted"
  ) {
    throw new AppError("internal");
  }

  return { accountStatus };
}

function profileFrom(uid: string, data: DocumentData | undefined): DiscoveryProfileRecord {
  const displayName = data?.displayName;
  const cityId = data?.cityId;
  const bio = data?.bio;
  const interests = data?.interests;
  const profileStatus = data?.profileStatus;
  const photoIds = data?.photoIds;

  if (
    typeof displayName !== "string" ||
    cityId !== DISCOVERY_SUPPORTED_CITY_ID ||
    typeof bio !== "string" ||
    !Array.isArray(interests) ||
    !interests.every((interest) => typeof interest === "string") ||
    profileStatus !== "approved"
  ) {
    throw new AppError("internal");
  }

  return {
    uid,
    displayName,
    cityId,
    bio,
    interests,
    profileStatus,
    photoIds: Array.isArray(photoIds) && photoIds.every((photoId) => typeof photoId === "string") ? photoIds : [],
  };
}

function presenceFrom(data: unknown): PresenceRecord {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new AppError("internal");
  }

  const record = data as Record<string, unknown>;
  const batteryState = record.batteryState;

  if (
    typeof record.batteryLevel !== "number" ||
    !Number.isInteger(record.batteryLevel) ||
    record.batteryLevel < 0 ||
    record.batteryLevel > 100 ||
    !DISCOVERY_BATTERY_STATES.includes(batteryState as DiscoveryBatteryState) ||
    record.cityId !== DISCOVERY_SUPPORTED_CITY_ID ||
    typeof record.online !== "boolean" ||
    typeof record.lastSeenAt !== "number"
  ) {
    throw new AppError("internal");
  }

  return {
    batteryLevel: record.batteryLevel,
    batteryState: batteryState as DiscoveryBatteryState,
    cityId: record.cityId,
    online: record.online,
    lastSeenAt: record.lastSeenAt,
  };
}

export const discoveryTestExports = {
  batteryRank,
  hashCandidateToken,
  isFreshPresence,
};
