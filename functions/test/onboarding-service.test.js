const assert = require("node:assert/strict");
const test = require("node:test");
const { AppError } = require("../lib/callable/app-error");
const { createConsentRecordId } = require("../lib/features/onboarding/consent-record-id");
const {
  completeOnboardingForUid,
  onboardingTestExports,
} = require("../lib/features/onboarding/onboarding-service");
const {
  MemoryAuthUserReader,
  MemoryOnboardingStore,
  fixedNow,
  storeWithFinalizedPhoto,
  validOnboardingInput,
} = require("./onboarding-test-helpers");

const UID = "auth-alice";
const EMAIL = "alice@example.invalid";

function dependencies(store, auth = new MemoryAuthUserReader({ [UID]: EMAIL })) {
  return {
    auth,
    store,
    now: fixedNow(),
  };
}

async function complete(input = validOnboardingInput(), store = storeWithFinalizedPhoto(UID)) {
  const result = await completeOnboardingForUid(UID, input, dependencies(store));
  return { result, store };
}

function consentPath(type, version = "v1") {
  return `consent_history/${UID}/records/${createConsentRecordId(type, version)}`;
}

test("completeOnboarding writes exactly the documented onboarding records", async () => {
  const input = validOnboardingInput();
  const { result, store } = await complete(input);

  assert.deepEqual(result, {
    status: "completed",
    profileStatus: "pending",
    discoveryEligible: false,
  });
  assert.deepEqual(store.writePaths().sort(), [
    consentPath("analytics"),
    consentPath("explicit_data"),
    consentPath("privacy"),
    consentPath("terms"),
    "preferences/auth-alice",
    "profile_revisions/auth-alice/items/onboarding_initial",
    "profiles/auth-alice",
    "users_internal/auth-alice",
    "users_private/auth-alice",
  ].sort());
  assert.deepEqual(store.get("users_private/auth-alice"), {
    email: EMAIL,
    birthDate: "2000-07-06",
    consentSummary: {
      analytics: { version: "v1", granted: false, recordedAt: new Date("2026-07-06T12:00:00.000Z") },
      explicit_data: { version: "v1", granted: true, recordedAt: new Date("2026-07-06T12:00:00.000Z") },
      privacy: { version: "v1", granted: true, recordedAt: new Date("2026-07-06T12:00:00.000Z") },
      terms: { version: "v1", granted: true, recordedAt: new Date("2026-07-06T12:00:00.000Z") },
    },
    createdAt: new Date("2026-07-06T12:00:00.000Z"),
  });
  assert.deepEqual(store.get("users_internal/auth-alice"), {
    accountStatus: "active",
  });
  assert.deepEqual(store.get("profiles/auth-alice"), {
    displayName: null,
    cityId: null,
    bio: null,
    interests: [],
    intent: null,
    photoIds: [],
    profileStatus: "pending",
    activeRevisionId: "onboarding_initial",
    createdAt: new Date("2026-07-06T12:00:00.000Z"),
    updatedAt: new Date("2026-07-06T12:00:00.000Z"),
  });
  assert.deepEqual(store.get("profile_revisions/auth-alice/items/onboarding_initial"), {
    ownerId: UID,
    proposedDisplayName: "Deniz",
    proposedCityId: "istanbul",
    proposedBio: "Merhaba",
    proposedInterests: ["music", "coffee"],
    proposedIntent: "dating",
    status: "pending",
    createdAt: new Date("2026-07-06T12:00:00.000Z"),
    submittedAt: new Date("2026-07-06T12:00:00.000Z"),
  });
  assert.deepEqual(store.get("preferences/auth-alice"), {
    selfGender: "unspecified",
    shownGenderPreferences: [],
    discoveryEnabled: false,
    updatedAt: new Date("2026-07-06T12:00:00.000Z"),
  });
  assert.equal(store.get("profiles/auth-alice").birthDate, undefined);
  assert.equal(store.get("preferences/auth-alice").birthDate, undefined);
  assert.equal(store.get("profiles/auth-alice").riskScore, undefined);
  assert.equal(store.get("users_internal/auth-alice").riskScore, undefined);
});

test("completeOnboarding stores required consent history separately and keeps optional absence absent", async () => {
  const input = validOnboardingInput({
    consentRecords: [
      { type: "terms", version: "v1", granted: true },
      { type: "privacy", version: "v1", granted: true },
      { type: "explicit_data", version: "v1", granted: true },
    ],
  });
  const { store } = await complete(input);

  assert.deepEqual(store.get(consentPath("terms")), {
    consentType: "terms",
    version: "v1",
    granted: true,
    recordedAt: new Date("2026-07-06T12:00:00.000Z"),
  });
  assert.deepEqual(store.get(consentPath("privacy")).consentType, "privacy");
  assert.deepEqual(store.get(consentPath("explicit_data")).consentType, "explicit_data");
  assert.equal(store.get(consentPath("analytics")), undefined);
  assert.equal(store.get("users_private/auth-alice").consentSummary.analytics, undefined);
});

test("completeOnboarding uses authenticated UID and Auth email only", async () => {
  const store = storeWithFinalizedPhoto(UID);
  const auth = new MemoryAuthUserReader({ [UID]: EMAIL, "attacker-uid": "attacker@example.invalid" });

  await completeOnboardingForUid(UID, validOnboardingInput({
    uid: "attacker-uid",
    email: "attacker@example.invalid",
  }), dependencies(store, auth));

  assert.deepEqual(auth.requestedUids, [UID]);
  assert.equal(store.get("users_private/auth-alice").email, EMAIL);
  assert.equal(store.get("users_private/attacker-uid"), undefined);
});

test("completeOnboarding rejects missing Auth user or missing finalized photo without writes", async () => {
  const missingAuthStore = storeWithFinalizedPhoto(UID);
  await assert.rejects(
    () => completeOnboardingForUid(UID, validOnboardingInput(), dependencies(
      missingAuthStore,
      new MemoryAuthUserReader(),
    )),
    (error) => {
      assert.equal(error.appCode, "unauthenticated");
      return true;
    },
  );
  assert.deepEqual(missingAuthStore.writePaths(), []);

  const noPhotoStore = new MemoryOnboardingStore();
  await assert.rejects(
    () => completeOnboardingForUid(UID, validOnboardingInput(), dependencies(noPhotoStore)),
    (error) => {
      assert.equal(error.appCode, "input_invalid");
      return true;
    },
  );
  assert.deepEqual(noPhotoStore.writePaths(), []);
});

test("completeOnboarding rejects restricted existing accounts before writes", async () => {
  for (const accountStatus of ["suspended", "deletion_pending", "deleted"]) {
    const store = storeWithFinalizedPhoto(UID, {
      "users_internal/auth-alice": { accountStatus },
    });

    await assert.rejects(
      () => completeOnboardingForUid(UID, validOnboardingInput(), dependencies(store)),
      (error) => {
        assert.equal(error.appCode, "account_restricted");
        return true;
      },
    );
    assert.deepEqual(store.writePaths(), []);
  }
});

test("completeOnboarding equivalent retry succeeds without duplicate writes", async () => {
  const input = validOnboardingInput();
  const { store } = await complete(input);
  const firstWriteCount = store.writePaths().length;
  const replay = await completeOnboardingForUid(UID, input, dependencies(store));

  assert.deepEqual(replay, {
    status: "completed",
    profileStatus: "pending",
    discoveryEligible: false,
  });
  assert.equal(store.writePaths().length, firstWriteCount);
});

test("completeOnboarding conflicting retry returns already_exists and overwrites nothing", async () => {
  const { store } = await complete(validOnboardingInput());
  const originalPrivate = store.get("users_private/auth-alice");
  const conflicts = [
    { displayName: "Derya" },
    { birthDate: "1999-07-06" },
    { cityId: "istanbul", intent: "friendship" },
    {
      consentRecords: [
        { type: "terms", version: "v1", granted: true },
        { type: "privacy", version: "v1", granted: true },
        { type: "explicit_data", version: "v1", granted: true },
        { type: "analytics", version: "v2", granted: false },
      ],
    },
    {
      consentRecords: [
        { type: "terms", version: "v1", granted: true },
        { type: "privacy", version: "v1", granted: true },
        { type: "explicit_data", version: "v1", granted: true },
        { type: "analytics", version: "v1", granted: true },
      ],
    },
  ];

  for (const override of conflicts) {
    await assert.rejects(
      () => completeOnboardingForUid(UID, validOnboardingInput(override), dependencies(store)),
      (error) => {
        assert.equal(error.appCode, "already_exists");
        return true;
      },
    );
  }

  assert.deepEqual(store.get("users_private/auth-alice"), originalPrivate);
});

test("completeOnboarding transaction failure leaves no partial logical state", async () => {
  const store = storeWithFinalizedPhoto(UID);
  store.failBeforeCommit = true;

  await assert.rejects(
    () => completeOnboardingForUid(UID, validOnboardingInput(), dependencies(store)),
    /SIMULATED_TRANSACTION_FAILURE/,
  );
  assert.equal(store.get("users_private/auth-alice"), undefined);
  assert.equal(store.get("users_internal/auth-alice"), undefined);
  assert.equal(store.get("profiles/auth-alice"), undefined);
  assert.equal(store.get("preferences/auth-alice"), undefined);
  assert.deepEqual(store.writePaths(), []);
});

test("completeOnboarding keeps different UIDs isolated", async () => {
  const bobUid = "auth-bob";
  const store = storeWithFinalizedPhoto(UID, {
    "profile_photos/photo-bob": { ownerId: bobUid, status: "pending" },
  });
  const auth = new MemoryAuthUserReader({
    [UID]: EMAIL,
    [bobUid]: "bob@example.invalid",
  });

  await completeOnboardingForUid(UID, validOnboardingInput(), dependencies(store, auth));
  await completeOnboardingForUid(bobUid, validOnboardingInput({
    displayName: "Bob",
    interests: ["books"],
  }), {
    auth,
    store,
    now: fixedNow("2026-07-07T12:00:00.000Z"),
  });

  assert.equal(store.get("users_private/auth-alice").email, EMAIL);
  assert.equal(store.get("users_private/auth-bob").email, "bob@example.invalid");
  assert.equal(store.get("profile_revisions/auth-bob/items/onboarding_initial").proposedDisplayName, "Bob");
});

test("onboarding service exposes deterministic internal path helpers only for tests", () => {
  assert.equal(onboardingTestExports.ONBOARDING_REVISION_ID, "onboarding_initial");
  assert.equal(typeof onboardingTestExports.consentRecordPath, "function");
  assert.equal(typeof onboardingTestExports.normalizedConsentRecords, "function");
});
