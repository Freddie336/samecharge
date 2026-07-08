const assert = require("node:assert/strict");
const test = require("node:test");
const admin = require("firebase-admin");
const sharp = require("sharp");
const { completeOnboarding, finalizeProfilePhoto, getAppBootstrap } = require("../lib/index");
const { createConsentRecordId } = require("../lib/features/onboarding/consent-record-id");

const auth = admin.auth();
const firestore = admin.firestore();
const bucket = admin.storage().bucket();
let testCounter = 0;
let currentUid = "alice-0";
let currentEmail = "alice-0@example.invalid";

function request(data, uid = currentUid) {
  return {
    data,
    auth: { uid },
    app: { appId: "debug-app", token: {} },
    rawRequest: { headers: {} },
    acceptsStreaming: false,
  };
}

function validInput(overrides = {}) {
  return {
    displayName: "Deniz",
    birthDate: "2000-07-06",
    cityId: "istanbul",
    bio: "Merhaba",
    interests: ["music", "coffee"],
    intent: "dating",
    selfGender: "unspecified",
    shownGenderPreferences: [],
    consentRecords: [
      { type: "terms", version: "v1", granted: true },
      { type: "privacy", version: "v1", granted: true },
      { type: "explicit_data", version: "v1", granted: true },
      { type: "analytics", version: "v1", granted: false },
    ],
    ...overrides,
  };
}

async function clearFirestore() {
  const collections = await firestore.listCollections();

  for (const collection of collections) {
    await deleteCollection(collection);
  }
}

async function clearStorage() {
  await bucket.deleteFiles({ force: true }).catch(() => undefined);
}

async function deleteCollection(collectionRef) {
  const snapshot = await collectionRef.limit(100).get();

  for (const doc of snapshot.docs) {
    const subcollections = await doc.ref.listCollections();

    for (const subcollection of subcollections) {
      await deleteCollection(subcollection);
    }

    await doc.ref.delete();
  }

  if (!snapshot.empty) {
    await deleteCollection(collectionRef);
  }
}

async function resetUser(uid, email) {
  try {
    await auth.deleteUser(uid);
  } catch {
    // Missing emulator user is already clean.
  }

  await auth.createUser({ uid, email });
}

async function uploadTempImage(uid = currentUid, uploadId = "AbCdEfGhIjKlMnOp") {
  const bytes = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: "#24795b",
    },
  }).png().toBuffer();
  const path = `temp_uploads/${uid}/${uploadId}`;
  await bucket.file(path).save(bytes, {
    contentType: "image/png",
    resumable: false,
  });
  return path;
}

async function seedFinalizedPhoto(uid = currentUid) {
  const storagePath = `profile_photos/${uid}/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp`;
  await bucket.file(storagePath).save(Buffer.from("finalized"), {
    contentType: "image/webp",
    resumable: false,
  });
  await firestore.collection("profile_photos").doc(`photo-${uid}`).set({
    ownerId: uid,
    status: "pending",
    storagePath,
    mimeType: "image/webp",
    createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-07-06T00:00:00.000Z")),
  });
}

async function consentRecordCount(uid = currentUid) {
  const snapshot = await firestore.collection("consent_history").doc(uid).collection("records").get();
  return snapshot.size;
}

function docPath(collection, uid = currentUid) {
  return `${collection}/${uid}`;
}

function revisionPath(uid = currentUid) {
  return `profile_revisions/${uid}/items/onboarding_initial`;
}

function consentPath(type, version = "v1", uid = currentUid) {
  return `consent_history/${uid}/records/${createConsentRecordId(type, version)}`;
}

test.beforeEach(async () => {
  testCounter += 1;
  currentUid = `alice-${testCounter}`;
  currentEmail = `${currentUid}@example.invalid`;
  await clearFirestore();
  await clearStorage();
  await resetUser(currentUid, currentEmail);
  await seedFinalizedPhoto(currentUid);
});

test("integration: exported callable count is exactly three", () => {
  assert.deepEqual(Object.keys(require("../lib/index")).sort(), [
    "completeOnboarding",
    "finalizeProfilePhoto",
    "getAppBootstrap",
  ]);
  assert.equal(typeof completeOnboarding.run, "function");
  assert.equal(typeof finalizeProfilePhoto.run, "function");
  assert.equal(typeof getAppBootstrap.run, "function");
});

test("integration: secure boundary rejects unauthenticated or missing App Check context", async () => {
  await assert.rejects(
    () => completeOnboarding.run({ ...request(validInput()), auth: undefined }),
    (error) => error.details.code === "unauthenticated",
  );
  await assert.rejects(
    () => completeOnboarding.run({ ...request(validInput()), app: undefined }),
    (error) => error.details.code === "app_check_required",
  );
});

test("integration: bootstrap before onboarding returns onboarding-required state", async () => {
  const result = await getAppBootstrap.run(request({}));

  assert.equal(result.onboardingStatus, "not_started");
  assert.equal(result.accountStatus, "active");
  assert.equal(result.profileStatus, "draft");
  assert.equal(result.discoveryEligible, false);
  assert.deepEqual(result.consentSummary, {});
});

test("integration: finalizeProfilePhoto creates one permanent object and metadata", async () => {
  await clearFirestore();
  const tempFilePath = await uploadTempImage();
  const first = await finalizeProfilePhoto.run(request({ tempFilePath }));
  const second = await finalizeProfilePhoto.run(request({ tempFilePath }));

  assert.deepEqual(second, first);
  assert.equal(first.status, "pending");
  assert.equal("downloadUrl" in first, false);

  const metadata = (await firestore.collection("profile_photos").doc(first.photoId).get()).data();
  assert.equal(metadata.ownerId, currentUid);
  assert.equal(metadata.status, "pending");
  assert.equal(metadata.storagePath, `profile_photos/${currentUid}/${first.photoId}.webp`);
  assert.equal(metadata.mimeType, "image/webp");
  assert.equal((await bucket.file(tempFilePath).exists())[0], false);
  assert.equal((await bucket.file(metadata.storagePath).exists())[0], true);
});

test("integration: finalizeProfilePhoto rejects invalid image without metadata", async () => {
  await clearFirestore();
  const path = `temp_uploads/${currentUid}/InvalidImageId01`;
  await bucket.file(path).save(Buffer.from("not an image"), {
    contentType: "image/png",
    resumable: false,
  });

  await assert.rejects(
    () => finalizeProfilePhoto.run(request({ tempFilePath: path })),
    (error) => error.details.code === "content_rejected",
  );
  assert.equal((await firestore.collection("profile_photos").get()).size, 0);
});

test("integration: completeOnboarding accepts finalized photo and rejects zero photo", async () => {
  await clearFirestore();
  await assert.rejects(
    () => completeOnboarding.run(request(validInput())),
    (error) => error.details.code === "input_invalid",
  );

  const tempFilePath = await uploadTempImage();
  await finalizeProfilePhoto.run(request({ tempFilePath }));
  const result = await completeOnboarding.run(request(validInput()));
  assert.equal(result.status, "completed");
});

test("integration: completeOnboarding rejects photo metadata without permanent object", async () => {
  await clearFirestore();
  await firestore.collection("profile_photos").doc("orphaned-photo").set({
    ownerId: currentUid,
    status: "pending",
    storagePath: `profile_photos/${currentUid}/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.webp`,
    mimeType: "image/webp",
    createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-07-06T00:00:00.000Z")),
  });

  await assert.rejects(
    () => completeOnboarding.run(request(validInput())),
    (error) => error.details.code === "input_invalid",
  );
});

test("integration: valid onboarding creates documented records and sanitized bootstrap", async () => {
  const result = await completeOnboarding.run(request(validInput()));

  assert.deepEqual(result, {
    status: "completed",
    profileStatus: "pending",
    discoveryEligible: false,
  });

  const privateData = (await firestore.doc(docPath("users_private")).get()).data();
  const internalData = (await firestore.doc(docPath("users_internal")).get()).data();
  const profileData = (await firestore.doc(docPath("profiles")).get()).data();
  const preferencesData = (await firestore.doc(docPath("preferences")).get()).data();
  const revisionData = (await firestore.doc(revisionPath()).get()).data();

  assert.equal(privateData.email, currentEmail);
  assert.equal(privateData.birthDate, "2000-07-06");
  assert.equal(privateData.consentSummary.analytics.granted, false);
  assert.equal(internalData.accountStatus, "active");
  assert.equal(profileData.profileStatus, "pending");
  assert.deepEqual(profileData.photoIds, []);
  assert.equal(profileData.birthDate, undefined);
  assert.equal(profileData.riskScore, undefined);
  assert.equal(preferencesData.birthDate, undefined);
  assert.equal(preferencesData.discoveryEnabled, false);
  assert.equal(revisionData.proposedDisplayName, "Deniz");
  assert.equal(revisionData.status, "pending");

  const termsRecord = (await firestore
    .doc(consentPath("terms"))
    .get()).data();
  const analyticsRecord = (await firestore
    .doc(consentPath("analytics"))
    .get()).data();

  assert.equal(termsRecord.consentType, "terms");
  assert.equal(termsRecord.granted, true);
  assert.equal(analyticsRecord.consentType, "analytics");
  assert.equal(analyticsRecord.granted, false);
  assert.equal(await consentRecordCount(), 4);

  const bootstrap = await getAppBootstrap.run(request({}));
  const serialized = JSON.stringify(bootstrap);
  assert.equal(bootstrap.onboardingStatus, "completed");
  assert.equal(bootstrap.accountStatus, "active");
  assert.equal(bootstrap.profileStatus, "pending");
  assert.equal(serialized.includes(currentEmail), false);
  assert.equal(serialized.includes("2000-07-06"), false);
  assert.equal(serialized.includes("riskScore"), false);
  assert.equal(serialized.includes("suspensionReason"), false);
  assert.equal(serialized.includes("moderationNotes"), false);
});

test("integration: optional consent absence stays absent", async () => {
  await completeOnboarding.run(request(validInput({
    consentRecords: [
      { type: "terms", version: "v1", granted: true },
      { type: "privacy", version: "v1", granted: true },
      { type: "explicit_data", version: "v1", granted: true },
    ],
  })));

  assert.equal(await consentRecordCount(), 3);
  assert.equal((await firestore
    .doc(consentPath("marketing"))
    .get()).exists, false);
  assert.equal((await firestore.doc(docPath("users_private")).get()).data().consentSummary.marketing, undefined);
});

test("integration: equivalent replay creates no duplicates and conflicting replay overwrites nothing", async () => {
  const input = validInput();
  await completeOnboarding.run(request(input));
  const privateBefore = (await firestore.doc(docPath("users_private")).get()).data();
  const replay = await completeOnboarding.run(request(input));

  assert.deepEqual(replay, {
    status: "completed",
    profileStatus: "pending",
    discoveryEligible: false,
  });
  assert.equal(await consentRecordCount(), 4);

  await assert.rejects(
    () => completeOnboarding.run(request(validInput({ displayName: "Derya" }))),
    (error) => error.details.code === "already_exists",
  );
  assert.deepEqual((await firestore.doc(docPath("users_private")).get()).data(), privateBefore);
  assert.equal((await firestore.doc(revisionPath()).get()).data().proposedDisplayName, "Deniz");
});

test("integration: underage and malformed submissions write nothing", async () => {
  await assert.rejects(
    () => completeOnboarding.run(request(validInput({ birthDate: "2010-07-06" }))),
    (error) => error.details.code === "input_invalid",
  );
  assert.equal((await firestore.doc(docPath("users_private")).get()).exists, false);
  assert.equal(await consentRecordCount(), 0);

  await assert.rejects(
    () => completeOnboarding.run(request(validInput({ cityId: "Istanbul" }))),
    (error) => error.details.code === "input_invalid",
  );
  assert.equal((await firestore.doc(docPath("profiles")).get()).exists, false);
});

test("integration: concurrent equivalent calls converge", async () => {
  const input = validInput({ displayName: "Concurrent" });
  const results = await Promise.all([
    completeOnboarding.run(request(input)),
    completeOnboarding.run(request(input)),
  ]);

  assert.equal(results.length, 2);
  assert.equal(await consentRecordCount(), 4);
  assert.equal((await firestore.doc(revisionPath()).get()).data().proposedDisplayName, "Concurrent");
});

test("integration: suspended and deletion-pending bootstrap responses are sanitized", async () => {
  await completeOnboarding.run(request(validInput()));

  for (const accountStatus of ["suspended", "deletion_pending"]) {
    await firestore.doc(docPath("users_internal")).set({
      accountStatus,
      riskScore: 99,
      suspensionReason: "SECRET_REASON",
      moderationNotes: "SECRET_NOTES",
    });

    const result = await getAppBootstrap.run(request({}));
    const serialized = JSON.stringify(result);

    assert.equal(result.accountStatus, accountStatus);
    assert.equal(result.discoveryEligible, false);
    assert.equal(serialized.includes("SECRET"), false);
    assert.equal(serialized.includes("riskScore"), false);
    assert.equal(serialized.includes("suspensionReason"), false);
    assert.equal(serialized.includes("moderationNotes"), false);
  }
});
