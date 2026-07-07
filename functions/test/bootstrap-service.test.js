const assert = require("node:assert/strict");
const test = require("node:test");
const {
  bootstrapTestExports,
  getAppBootstrapForUid,
} = require("../lib/features/bootstrap/bootstrap-service");

const UID = "auth-alice";

class MemoryBootstrapStore {
  constructor(documents = {}) {
    this.documents = new Map(Object.entries(documents));
    this.reads = [];
  }

  async get(path) {
    this.reads.push(path);
    return structuredClone(this.documents.get(path));
  }
}

function completedDocuments(overrides = {}) {
  return {
    "users_private/auth-alice": {
      email: "alice@example.invalid",
      birthDate: "2000-07-06",
      consentSummary: {
        terms: { version: "v1", granted: true, recordedAt: new Date("2026-07-06T00:00:00.000Z") },
        privacy: { version: "v1", granted: true, recordedAt: new Date("2026-07-06T00:00:00.000Z") },
        explicit_data: { version: "v1", granted: true, recordedAt: new Date("2026-07-06T00:00:00.000Z") },
        analytics: { version: "v1", granted: false, recordedAt: new Date("2026-07-06T00:00:00.000Z") },
      },
    },
    "users_internal/auth-alice": {
      accountStatus: "active",
      riskScore: 99,
      suspensionReason: "SECRET_REASON",
      moderationNotes: "SECRET_NOTES",
    },
    "profiles/auth-alice": {
      profileStatus: "pending",
      photoIds: [],
      riskScore: 88,
      moderationNotes: "SECRET_PROFILE_NOTES",
    },
    "preferences/auth-alice": {
      discoveryEnabled: false,
    },
    ...overrides,
  };
}

test("getAppBootstrap returns onboarding-required state with default sanitized fields", async () => {
  const store = new MemoryBootstrapStore();
  const result = await getAppBootstrapForUid(UID, store);

  assert.deepEqual(result, {
    onboardingStatus: "not_started",
    accountStatus: "active",
    profileStatus: "draft",
    discoveryEligible: false,
    moderationActionRequired: false,
    notificationPreferences: bootstrapTestExports.DEFAULT_NOTIFICATION_PREFERENCES,
    consentSummary: {},
  });
  assert.deepEqual(store.reads, [
    "users_private/auth-alice",
    "users_internal/auth-alice",
    "profiles/auth-alice",
    "preferences/auth-alice",
    "notification_preferences/auth-alice",
  ]);
});

test("getAppBootstrap returns completed pending, approved, rejected, and needs_review states", async () => {
  const pending = await getAppBootstrapForUid(UID, new MemoryBootstrapStore(completedDocuments()));
  assert.equal(pending.onboardingStatus, "completed");
  assert.equal(pending.profileStatus, "pending");
  assert.equal(pending.discoveryEligible, false);
  assert.equal(pending.moderationActionRequired, false);

  const approved = await getAppBootstrapForUid(UID, new MemoryBootstrapStore(completedDocuments({
    "profiles/auth-alice": {
      profileStatus: "approved",
      photoIds: ["photo-1"],
    },
    "preferences/auth-alice": {
      discoveryEnabled: true,
    },
  })));
  assert.equal(approved.profileStatus, "approved");
  assert.equal(approved.discoveryEligible, true);
  assert.equal(approved.moderationActionRequired, false);

  const rejected = await getAppBootstrapForUid(UID, new MemoryBootstrapStore(completedDocuments({
    "profiles/auth-alice": {
      profileStatus: "rejected",
      photoIds: [],
    },
  })));
  assert.equal(rejected.profileStatus, "rejected");
  assert.equal(rejected.moderationActionRequired, true);

  const needsReview = await getAppBootstrapForUid(UID, new MemoryBootstrapStore(completedDocuments({
    "profiles/auth-alice": {
      profileStatus: "needs_review",
      photoIds: [],
    },
  })));
  assert.equal(needsReview.profileStatus, "needs_review");
  assert.equal(needsReview.moderationActionRequired, true);
});

test("getAppBootstrap sanitizes suspended and deletion-pending account responses", async () => {
  for (const accountStatus of ["suspended", "deletion_pending"]) {
    const result = await getAppBootstrapForUid(UID, new MemoryBootstrapStore(completedDocuments({
      "users_internal/auth-alice": {
        accountStatus,
        riskScore: 100,
        suspensionReason: "SECRET_REASON",
        moderationNotes: "SECRET_NOTES",
      },
      "profiles/auth-alice": {
        profileStatus: "approved",
        photoIds: ["photo-1"],
      },
      "preferences/auth-alice": {
        discoveryEnabled: true,
      },
    })));
    const serialized = JSON.stringify(result);

    assert.equal(result.accountStatus, accountStatus);
    assert.equal(result.discoveryEligible, false);
    assert.equal(serialized.includes("riskScore"), false);
    assert.equal(serialized.includes("suspensionReason"), false);
    assert.equal(serialized.includes("moderationNotes"), false);
    assert.equal(serialized.includes("SECRET"), false);
  }
});

test("getAppBootstrap strips private and internal fields from serialized response", async () => {
  const result = await getAppBootstrapForUid(UID, new MemoryBootstrapStore(completedDocuments()));
  const serialized = JSON.stringify(result);

  assert.deepEqual(Object.keys(result).sort(), [
    "accountStatus",
    "consentSummary",
    "discoveryEligible",
    "moderationActionRequired",
    "notificationPreferences",
    "onboardingStatus",
    "profileStatus",
  ].sort());
  assert.deepEqual(result.consentSummary.analytics, {
    version: "v1",
    granted: false,
  });
  assert.equal(serialized.includes("alice@example.invalid"), false);
  assert.equal(serialized.includes("2000-07-06"), false);
  assert.equal(serialized.includes("recordedAt"), false);
  assert.equal(serialized.includes("riskScore"), false);
  assert.equal(serialized.includes("suspensionReason"), false);
  assert.equal(serialized.includes("moderationNotes"), false);
  assert.equal(serialized.includes("SECRET"), false);
  assert.equal(serialized.includes("users_private"), false);
});

test("getAppBootstrap validates stored enum and response document shapes", async () => {
  await assert.rejects(
    () => getAppBootstrapForUid(UID, new MemoryBootstrapStore(completedDocuments({
      "users_internal/auth-alice": { accountStatus: "deleted" },
    }))),
    (error) => {
      assert.equal(error.appCode, "internal");
      return true;
    },
  );
  await assert.rejects(
    () => getAppBootstrapForUid(UID, new MemoryBootstrapStore(completedDocuments({
      "profiles/auth-alice": { profileStatus: "deleted", photoIds: [] },
    }))),
    (error) => {
      assert.equal(error.appCode, "internal");
      return true;
    },
  );
  await assert.rejects(
    () => getAppBootstrapForUid(UID, new MemoryBootstrapStore(completedDocuments({
      "users_private/auth-alice": { consentSummary: { terms: { version: "v1" } } },
    }))),
    (error) => {
      assert.equal(error.appCode, "internal");
      return true;
    },
  );
});

test("getAppBootstrap handles missing optional documents deterministically", async () => {
  const result = await getAppBootstrapForUid(UID, new MemoryBootstrapStore({
    "users_private/auth-alice": completedDocuments()["users_private/auth-alice"],
    "users_internal/auth-alice": { accountStatus: "active" },
    "profiles/auth-alice": { profileStatus: "draft", photoIds: [] },
  }));

  assert.equal(result.onboardingStatus, "completed");
  assert.equal(result.discoveryEligible, false);
  assert.deepEqual(result.notificationPreferences, bootstrapTestExports.DEFAULT_NOTIFICATION_PREFERENCES);
});

test("getAppBootstrap uses stored notification preferences when present", async () => {
  const result = await getAppBootstrapForUid(UID, new MemoryBootstrapStore(completedDocuments({
    "notification_preferences/auth-alice": {
      newMatch: false,
      newMessage: true,
      systemAnnouncements: false,
      marketingNotifications: true,
      updatedAt: new Date("2026-07-06T00:00:00.000Z"),
    },
  })));

  assert.deepEqual(result.notificationPreferences, {
    newMatch: false,
    newMessage: true,
    systemAnnouncements: false,
    marketingNotifications: true,
  });
});
