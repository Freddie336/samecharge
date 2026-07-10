const assert = require("node:assert/strict");
const test = require("node:test");
const admin = require("firebase-admin");
const sharp = require("sharp");
const {
  blockUser,
  completeOnboarding,
  finalizeProfilePhoto,
  getAppBootstrap,
  markMatchRead,
  reportContent,
  requestAccountDeletion,
  sendMessage,
  setMatchMuted,
  startDiscovery,
  submitDiscoveryDecision,
  unmatchUser,
} = require("../lib/index");
const { createConsentRecordId } = require("../lib/features/onboarding/consent-record-id");
const { hashCandidateToken, pairKeyFor } = require("../lib/features/discovery/discovery-service");
const { chatTestExports } = require("../lib/features/chat/chat-service");
const {
  createDefaultSafetyDependencies,
  processAccountDeletionForUid,
  reportTokenForMatch,
  reportTokenForMessage,
  requestAccountDeletionForUid,
  safetyTestExports,
} = require("../lib/features/safety/safety-service");

const auth = admin.auth();
const firestore = admin.firestore();
const database = admin.database();
const bucket = admin.storage().bucket();
const { messageIdFor } = chatTestExports;
const { TBD_LEGAL_REVIEW } = safetyTestExports;
let testCounter = 0;
let currentUid = "alice-0";
let currentEmail = "alice-0@example.invalid";
const chatMatchId = "b".repeat(64);

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

async function clearDatabase() {
  await database.ref().set(null);
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

async function seedDiscoveryUser(uid, overrides = {}) {
  const email = overrides.email ?? `${uid}@example.invalid`;
  try {
    await auth.createUser({ uid, email });
  } catch {
    // The current test user may already exist.
  }

  await firestore.doc(`users_private/${uid}`).set({
    email,
    birthDate: overrides.birthDate ?? "2000-01-01",
  });
  await firestore.doc(`users_internal/${uid}`).set({
    accountStatus: overrides.accountStatus ?? "active",
  });
  await firestore.doc(`profiles/${uid}`).set({
    displayName: overrides.displayName ?? uid,
    cityId: "istanbul",
    bio: overrides.bio ?? `${uid} bio`,
    interests: overrides.interests ?? ["coffee"],
    photoIds: [`photo-${uid}`],
    profileStatus: overrides.profileStatus ?? "approved",
  });
  await firestore.doc(`preferences/${uid}`).set({
    discoveryEnabled: overrides.discoveryEnabled ?? true,
  });
  await firestore.collection("profile_photos").doc(`photo-${uid}`).set({
    ownerId: uid,
    status: overrides.photoStatus ?? "approved",
    storagePath: `profile_photos/${uid}/photo-${uid}.webp`,
  });
  await database.ref(`presence/${uid}`).set({
    batteryLevel: overrides.batteryLevel ?? 77,
    batteryState: overrides.batteryState ?? "discharging",
    cityId: "istanbul",
    online: overrides.online ?? true,
    lastSeenAt: overrides.lastSeenAt ?? Date.now(),
  });
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

async function seedChatMatch(overrides = {}) {
  await firestore.collection("matches").doc(overrides.matchId ?? chatMatchId).set({
    memberIds: overrides.memberIds ?? [currentUid, "bob-chat"].sort(),
    status: overrides.status ?? "active",
    messagingEnabled: overrides.messagingEnabled ?? true,
    blockedBy: Object.prototype.hasOwnProperty.call(overrides, "blockedBy") ?
      overrides.blockedBy :
      null,
    lastMessageAt: null,
    lastMessagePreview: null,
    unreadCounts: overrides.unreadCounts ?? {
      [currentUid]: 0,
      "bob-chat": 0,
    },
    mutedBy: overrides.mutedBy ?? {},
    lastReadAt: overrides.lastReadAt ?? {},
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
  await clearDatabase();
  await clearStorage();
  await resetUser(currentUid, currentEmail);
  await seedFinalizedPhoto(currentUid);
});

test.after(() => {
  database.goOffline();
});

test("integration: exported callable count is exactly twelve", () => {
  assert.deepEqual(Object.keys(require("../lib/index")).sort(), [
    "blockUser",
    "completeOnboarding",
    "finalizeProfilePhoto",
    "getAppBootstrap",
    "markMatchRead",
    "reportContent",
    "requestAccountDeletion",
    "sendMessage",
    "setMatchMuted",
    "startDiscovery",
    "submitDiscoveryDecision",
    "unmatchUser",
  ]);
  assert.equal(typeof blockUser.run, "function");
  assert.equal(typeof completeOnboarding.run, "function");
  assert.equal(typeof finalizeProfilePhoto.run, "function");
  assert.equal(typeof getAppBootstrap.run, "function");
  assert.equal(typeof markMatchRead.run, "function");
  assert.equal(typeof reportContent.run, "function");
  assert.equal(typeof requestAccountDeletion.run, "function");
  assert.equal(typeof sendMessage.run, "function");
  assert.equal(typeof setMatchMuted.run, "function");
  assert.equal(typeof startDiscovery.run, "function");
  assert.equal(typeof submitDiscoveryDecision.run, "function");
  assert.equal(typeof unmatchUser.run, "function");
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
  await assert.rejects(
    () => startDiscovery.run({ ...request({ requestedRange: 0, pageSize: 10 }), auth: undefined }),
    (error) => error.details.code === "unauthenticated",
  );
  await assert.rejects(
    () => submitDiscoveryDecision.run({
      ...request({
        candidateToken: "opaque-token-000000000000000000000000",
        decision: "like",
      }),
      auth: undefined,
    }),
    (error) => error.details.code === "unauthenticated",
  );
  await assert.rejects(
    () => sendMessage.run({
      ...request({
        matchId: chatMatchId,
        clientMessageId: "client-message-1",
        text: "Merhaba",
      }),
      auth: undefined,
    }),
    (error) => error.details.code === "unauthenticated",
  );
  await assert.rejects(
    () => sendMessage.run({
      ...request({
        matchId: chatMatchId,
        clientMessageId: "client-message-1",
        text: "Merhaba",
      }),
      app: undefined,
    }),
    (error) => error.details.code === "app_check_required",
  );
  await assert.rejects(
    () => reportContent.run({
      ...request({
        reportToken: reportTokenForMatch(chatMatchId),
        targetType: "match",
        targetId: chatMatchId,
        category: "spam",
      }),
      auth: undefined,
    }),
    (error) => error.details.code === "unauthenticated",
  );
});

test("integration: startDiscovery rejects invalid payload and stale presence", async () => {
  await clearFirestore();
  await clearDatabase();
  await seedDiscoveryUser(currentUid, {
    lastSeenAt: Date.now() - 91_000,
  });

  await assert.rejects(
    () => startDiscovery.run(request({ requestedRange: 2, pageSize: 10 })),
    (error) => error.details.code === "input_invalid",
  );
  await assert.rejects(
    () => startDiscovery.run(request({ requestedRange: 0, pageSize: 10 })),
    (error) => error.details.code === "profile_not_eligible",
  );
  await assert.rejects(
    () => submitDiscoveryDecision.run(request({
      candidateToken: "opaque-token-000000000000000000000000",
      decision: "super-like",
    })),
    (error) => error.details.code === "input_invalid",
  );
  await assert.rejects(
    () => submitDiscoveryDecision.run(request({
      candidateToken: "opaque-token-000000000000000000000000",
      decision: "like",
      candidateId: "bob-discovery",
    })),
    (error) => error.details.code === "input_invalid",
  );
  await assert.rejects(
    () => sendMessage.run(request({
      matchId: chatMatchId,
      clientMessageId: "client-message-1",
      text: "Merhaba",
      senderId: "mallory",
    })),
    (error) => error.details.code === "input_invalid",
  );
  await assert.rejects(
    () => sendMessage.run(request({
      matchId: chatMatchId,
      clientMessageId: "client-message-1",
      text: "   ",
    })),
    (error) => error.details.code === "input_invalid",
  );
  await assert.rejects(
    () => sendMessage.run(request({
      matchId: chatMatchId,
      clientMessageId: "client-message-1",
      text: "a".repeat(1001),
    })),
    (error) => error.details.code === "input_invalid",
  );
  await assert.rejects(
    () => reportContent.run(request({
      reportToken: reportTokenForMatch(chatMatchId),
      targetType: "match",
      targetId: chatMatchId,
      category: "spam",
      email: currentEmail,
    })),
    (error) => error.details.code === "input_invalid",
  );
});

test("integration: sendMessage creates one text message and is idempotent", async () => {
  await clearFirestore();
  await seedChatMatch();

  const input = {
    matchId: chatMatchId,
    clientMessageId: "client-message-1",
    text: "  Merhaba\u0000   Bob  ",
  };
  const result = await sendMessage.run(request(input));
  const retry = await sendMessage.run(request(input));
  const match = (await firestore.collection("matches").doc(chatMatchId).get()).data();
  const messages = await firestore.collection("matches")
    .doc(chatMatchId)
    .collection("messages")
    .get();
  const message = messages.docs[0].data();

  assert.equal(result.status, "sent");
  assert.equal(result.messageId, messageIdFor(currentUid, input.clientMessageId));
  assert.equal(result.text, "Merhaba Bob");
  assert.deepEqual(retry, result);
  assert.equal(messages.size, 1);
  assert.equal(message.senderId, currentUid);
  assert.equal(message.type, "text");
  assert.equal(message.text, "Merhaba Bob");
  assert.equal(message.moderationStatus, "clean");
  assert.equal(match.lastMessagePreview, "Merhaba Bob");
  assert.equal(match.unreadCounts["bob-chat"], 1);
  assert.equal(JSON.stringify(result).includes(currentEmail), false);

  await assert.rejects(
    () => sendMessage.run(request({
      ...input,
      text: "Different text",
    })),
    (error) => error.details.code === "already_exists",
  );
  const afterConflict = await firestore.collection("matches")
    .doc(chatMatchId)
    .collection("messages")
    .get();
  assert.equal(afterConflict.size, 1);
  assert.equal((await firestore.collection("matches").doc(chatMatchId).get()).data()
    .unreadCounts["bob-chat"], 1);
});

test("integration: sendMessage rejects non-member and disabled match states", async () => {
  await clearFirestore();
  await seedChatMatch();
  await assert.rejects(
    () => sendMessage.run(request({
      matchId: chatMatchId,
      clientMessageId: "client-message-1",
      text: "Merhaba",
    }, "mallory")),
    (error) => error.details.code === "permission_denied",
  );

  for (const [overrides, code] of [
    [{ status: "inactive" }, "match_not_active"],
    [{ messagingEnabled: false }, "messaging_disabled"],
    [{ blockedBy: "bob-chat" }, "match_not_active"],
  ]) {
    await clearFirestore();
    await seedChatMatch(overrides);
    await assert.rejects(
      () => sendMessage.run(request({
        matchId: chatMatchId,
        clientMessageId: "client-message-1",
        text: "Merhaba",
      })),
      (error) => error.details.code === code,
    );
  }
});

test("integration: markMatchRead and setMatchMuted are member-only", async () => {
  await clearFirestore();
  await seedChatMatch({ unreadCounts: { [currentUid]: 2, "bob-chat": 0 } });

  await assert.rejects(
    () => markMatchRead.run(request({ matchId: chatMatchId }, "mallory")),
    (error) => error.details.code === "permission_denied",
  );
  assert.deepEqual(await markMatchRead.run(request({ matchId: chatMatchId })), {
    status: "read",
  });

  let match = (await firestore.collection("matches").doc(chatMatchId).get()).data();
  assert.equal(match.unreadCounts[currentUid], 0);
  assert.ok(match.lastReadAt[currentUid]);

  await assert.rejects(
    () => setMatchMuted.run(request({ matchId: chatMatchId, muted: true }, "mallory")),
    (error) => error.details.code === "permission_denied",
  );
  assert.deepEqual(await setMatchMuted.run(request({
    matchId: chatMatchId,
    muted: true,
  })), {
    status: "muted",
    muted: true,
  });

  match = (await firestore.collection("matches").doc(chatMatchId).get()).data();
  assert.equal(match.mutedBy[currentUid], true);
  assert.equal(match.mutedBy["bob-chat"], undefined);
  assert.equal(match.messagingEnabled, true);
});

test("integration: reportContent stores minimal report and hashes report token", async () => {
  await clearFirestore();
  await seedChatMatch();
  const messageId = "message-1";
  await firestore.collection("matches")
    .doc(chatMatchId)
    .collection("messages")
    .doc(messageId)
    .set({
      senderId: "bob-chat",
      type: "text",
      text: "Unsafe message",
      clientMessageId: "client-message-1",
      createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-07-10T10:00:00.000Z")),
      moderationStatus: "clean",
    });

  const input = {
    reportToken: reportTokenForMessage(chatMatchId, messageId),
    targetType: "message",
    targetId: messageId,
    matchId: chatMatchId,
    category: "harassment",
    description: "  Please review\u0000 this  ",
  };
  const result = await reportContent.run(request(input));
  const retry = await reportContent.run(request(input));
  const report = (await firestore.collection("reports").doc(result.reportId).get()).data();
  const serialized = JSON.stringify(report);

  assert.equal(result.status, "reported");
  assert.deepEqual(retry, result);
  assert.equal(report.reporterId, currentUid);
  assert.equal(report.targetType, "message");
  assert.equal(report.matchId, chatMatchId);
  assert.equal(report.messageId, messageId);
  assert.equal(report.description, "Please review this");
  assert.equal(report.status, "open");
  assert.equal(report.retentionClass, TBD_LEGAL_REVIEW);
  assert.equal(serialized.includes(input.reportToken), false);
  assert.equal(serialized.includes(currentEmail), false);
  assert.equal(serialized.includes("birthDate"), false);

  await assert.rejects(
    () => reportContent.run(request({
      reportToken: reportTokenForMessage(chatMatchId, messageId),
      targetType: "message",
      targetId: messageId,
      matchId: chatMatchId,
      category: "harassment",
    }, "mallory")),
    (error) => error.details.code === "permission_denied",
  );
  await assert.rejects(
    () => reportContent.run(request({
      ...input,
      reportToken: "fake-token",
    })),
    (error) => error.details.code === "report_token_invalid",
  );
});

test("integration: blockUser blocks match, prevents messaging and future discovery", async () => {
  await clearFirestore();
  await clearDatabase();
  await seedDiscoveryUser(currentUid, {
    displayName: "Alice",
    batteryLevel: 77,
  });
  await seedDiscoveryUser("bob-chat", {
    displayName: "Bob",
    birthDate: "1998-05-05",
    batteryLevel: 77,
  });
  const matchId = pairKeyFor(currentUid, "bob-chat");
  await seedChatMatch({
    matchId,
    memberIds: [currentUid, "bob-chat"].sort(),
  });

  const result = await blockUser.run(request({
    targetUserId: "bob-chat",
    matchId,
    reason: "harassment",
  }));
  const retry = await blockUser.run(request({
    targetUserId: "bob-chat",
    matchId,
    reason: "harassment",
  }));
  const match = (await firestore.collection("matches").doc(matchId).get()).data();
  const block = (await firestore.collection("blocks")
    .doc(currentUid)
    .collection("blocked")
    .doc("bob-chat")
    .get()).data();
  const discovery = await startDiscovery.run(request({ requestedRange: 0, pageSize: 10 }));

  assert.deepEqual(result, { status: "blocked" });
  assert.deepEqual(retry, result);
  assert.equal(match.status, "blocked");
  assert.equal(match.messagingEnabled, false);
  assert.equal(match.blockedBy, currentUid);
  assert.equal(block.blockerId, currentUid);
  assert.equal(block.targetId, "bob-chat");
  assert.equal(block.retentionClass, TBD_LEGAL_REVIEW);
  assert.equal(discovery.candidates.length, 0);
  await assert.rejects(
    () => sendMessage.run(request({
      matchId,
      clientMessageId: "client-message-1",
      text: "Merhaba",
    })),
    (error) => error.details.code === "match_not_active",
  );
});

test("integration: unmatchUser closes match without creating a block", async () => {
  await clearFirestore();
  await seedChatMatch();

  const result = await unmatchUser.run(request({ matchId: chatMatchId }));
  const retry = await unmatchUser.run(request({ matchId: chatMatchId }));
  const match = (await firestore.collection("matches").doc(chatMatchId).get()).data();
  const blocks = await firestore.collection("blocks")
    .doc(currentUid)
    .collection("blocked")
    .get();

  assert.deepEqual(result, { status: "unmatched" });
  assert.deepEqual(retry, result);
  assert.equal(match.status, "unmatched");
  assert.equal(match.messagingEnabled, false);
  assert.equal(match.unmatchedBy, currentUid);
  assert.equal(blocks.size, 0);
  await assert.rejects(
    () => unmatchUser.run(request({ matchId: chatMatchId }, "mallory")),
    (error) => error.details.code === "permission_denied",
  );
  await assert.rejects(
    () => sendMessage.run(request({
      matchId: chatMatchId,
      clientMessageId: "client-message-1",
      text: "Merhaba",
    })),
    (error) => error.details.code === "match_not_active",
  );
});

test("integration: requestAccountDeletion requires reauthentication and service request is idempotent", async () => {
  await clearFirestore();
  await clearDatabase();
  await seedDiscoveryUser(currentUid, {
    displayName: "Alice",
    batteryLevel: 77,
  });
  await seedDiscoveryUser("bob-delete", {
    displayName: "Bob",
    birthDate: "1998-05-05",
    batteryLevel: 77,
  });
  await seedChatMatch({ memberIds: [currentUid, "bob-delete"].sort() });

  await assert.rejects(
    () => requestAccountDeletion.run(request({ confirmation: "DELETE_MY_ACCOUNT" })),
    (error) => error.details.code === "reauthentication_required",
  );

  const dependencies = createDefaultSafetyDependencies();
  dependencies.reauthentication = {
    isRecentlyVerified: async () => true,
  };
  const input = {
    confirmation: "DELETE_MY_ACCOUNT",
    reauthenticationToken: "verified-recent-session-token",
  };
  const result = await requestAccountDeletionForUid(currentUid, input, dependencies);
  const retry = await requestAccountDeletionForUid(currentUid, input, dependencies);
  const internal = (await firestore.doc(`users_internal/${currentUid}`).get()).data();
  const preferences = (await firestore.doc(`preferences/${currentUid}`).get()).data();
  const job = (await firestore.collection("deletion_jobs").doc(currentUid).get()).data();
  const match = (await firestore.collection("matches").doc(chatMatchId).get()).data();
  const presence = await database.ref(`presence/${currentUid}`).get();

  assert.deepEqual(result, { status: "deletion_pending" });
  assert.deepEqual(retry, result);
  assert.equal(internal.accountStatus, "deletion_pending");
  assert.equal(preferences.discoveryEnabled, false);
  assert.equal(job.status, "pending");
  assert.equal(job.retentionClass, TBD_LEGAL_REVIEW);
  assert.equal(match.status, "deletion_pending");
  assert.equal(match.messagingEnabled, false);
  assert.equal(presence.exists(), false);
  await assert.rejects(
    () => startDiscovery.run(request({ requestedRange: 0, pageSize: 10 })),
    (error) => error.details.code === "account_restricted",
  );
  await assert.rejects(
    () => sendMessage.run(request({
      matchId: chatMatchId,
      clientMessageId: "client-message-1",
      text: "Merhaba",
    })),
    (error) => error.details.code === "account_restricted",
  );
});

test("integration: processAccountDeletion is resumable and preserves retention records", async () => {
  await clearFirestore();
  await clearDatabase();
  await seedDiscoveryUser(currentUid, {
    displayName: "Alice",
    batteryLevel: 77,
  });
  await seedChatMatch();
  await firestore.collection("reports").doc("open-report").set({
    reporterId: "bob-chat",
    targetType: "user",
    targetId: currentUid,
    status: "open",
    retentionClass: TBD_LEGAL_REVIEW,
  });
  await firestore.collection("deletion_jobs").doc(currentUid).set({
    ownerId: currentUid,
    status: "pending",
    completedSteps: ["presence_removed"],
    retentionClass: TBD_LEGAL_REVIEW,
  });

  const dependencies = createDefaultSafetyDependencies();
  const first = await processAccountDeletionForUid(currentUid, dependencies);
  const second = await processAccountDeletionForUid(currentUid, dependencies);
  const profile = (await firestore.doc(`profiles/${currentUid}`).get()).data();
  const report = (await firestore.collection("reports").doc("open-report").get()).data();
  const job = (await firestore.collection("deletion_jobs").doc(currentUid).get()).data();

  assert.deepEqual(second, first);
  assert.equal(first.status, "processed");
  assert.ok(first.completedSteps.includes("presence_removed"));
  assert.ok(first.completedSteps.includes("profile_anonymized"));
  assert.ok(first.completedSteps.includes("matches_closed"));
  assert.equal(profile.displayName, "Deleted member");
  assert.equal(report.status, "open");
  assert.equal(report.retentionClass, TBD_LEGAL_REVIEW);
  assert.equal(job.retentionClass, TBD_LEGAL_REVIEW);
});

test("integration: startDiscovery accepts fresh presence and stores hashed candidate tokens", async () => {
  await clearFirestore();
  await clearDatabase();
  await seedDiscoveryUser(currentUid, {
    displayName: "Alice",
    batteryLevel: 77,
  });
  await seedDiscoveryUser("bob-discovery", {
    displayName: "Bob",
    email: "bob@example.invalid",
    birthDate: "1998-05-05",
    batteryLevel: 77,
    bio: "Safe Bob bio",
  });
  await seedDiscoveryUser("carol-discovery", {
    displayName: "Carol",
    batteryLevel: 80,
  });

  const result = await startDiscovery.run(request({ requestedRange: 3, pageSize: 10 }));
  const serialized = JSON.stringify(result);

  assert.equal(result.candidates.length, 2);
  assert.equal(result.candidates[0].displayName, "Bob");
  assert.equal(result.candidates[0].batteryDifference, 0);
  assert.equal(result.candidates[0].cityLabel, "Istanbul");
  assert.equal(serialized.includes("bob@example.invalid"), false);
  assert.equal(serialized.includes("birthDate"), false);
  assert.equal(serialized.includes("risk"), false);
  assert.equal(serialized.includes("moderation"), false);

  const sessions = await firestore.collection("discovery_sessions").get();
  assert.equal(sessions.size, 1);
  const candidates = await sessions.docs[0].ref.collection("candidates").get();
  const firstTokenDoc = candidates.docs.find((doc) => {
    return doc.data().tokenHash === hashCandidateToken(result.candidates[0].candidateToken);
  });

  assert.equal(candidates.size, 2);
  assert.ok(firstTokenDoc);
  assert.equal(JSON.stringify(candidates.docs.map((doc) => doc.data())).includes(result.candidates[0].candidateToken), false);
});

test("integration: submitDiscoveryDecision pass consumes token without match", async () => {
  await clearFirestore();
  await clearDatabase();
  await seedDiscoveryUser(currentUid, {
    displayName: "Alice",
    batteryLevel: 77,
  });
  await seedDiscoveryUser("bob-pass", {
    displayName: "Bob",
    batteryLevel: 77,
  });

  const discovery = await startDiscovery.run(request({ requestedRange: 0, pageSize: 10 }));
  const candidate = discovery.candidates[0];
  const result = await submitDiscoveryDecision.run(request({
    candidateToken: candidate.candidateToken,
    decision: "pass",
  }));
  const retry = await submitDiscoveryDecision.run(request({
    candidateToken: candidate.candidateToken,
    decision: "pass",
  }));
  const sessions = await firestore.collection("discovery_sessions").get();
  const tokenDocs = await sessions.docs[0].ref.collection("candidates").get();
  const decisions = await firestore.collection("discovery_decisions").get();
  const matches = await firestore.collection("matches").get();

  assert.deepEqual(result, { status: "passed" });
  assert.deepEqual(retry, { status: "passed" });
  assert.equal(tokenDocs.docs[0].data().used, true);
  assert.equal(JSON.stringify(tokenDocs.docs.map((doc) => doc.data())).includes(candidate.candidateToken), false);
  assert.equal(decisions.size, 1);
  assert.equal(matches.size, 0);

  const rediscovery = await startDiscovery.run(request({ requestedRange: 0, pageSize: 10 }));
  assert.equal(rediscovery.candidates.length, 0);
});

test("integration: submitDiscoveryDecision mutual likes create one sanitized match", async () => {
  await clearFirestore();
  await clearDatabase();
  await seedDiscoveryUser(currentUid, {
    displayName: "Alice",
    batteryLevel: 77,
  });
  await seedDiscoveryUser("bob-match", {
    displayName: "Bob",
    email: "bob@example.invalid",
    birthDate: "1998-05-05",
    batteryLevel: 77,
    bio: "Safe Bob bio",
  });

  const bobDiscovery = await startDiscovery.run(
    request({ requestedRange: 0, pageSize: 10 }, "bob-match"),
  );
  await submitDiscoveryDecision.run(
    request({
      candidateToken: bobDiscovery.candidates[0].candidateToken,
      decision: "like",
    }, "bob-match"),
  );

  const aliceDiscovery = await startDiscovery.run(request({ requestedRange: 0, pageSize: 10 }));
  const result = await submitDiscoveryDecision.run(request({
    candidateToken: aliceDiscovery.candidates[0].candidateToken,
    decision: "like",
  }));
  const retry = await submitDiscoveryDecision.run(request({
    candidateToken: aliceDiscovery.candidates[0].candidateToken,
    decision: "like",
  }));
  const serialized = JSON.stringify(result);
  const matches = await firestore.collection("matches").get();
  const decisions = await firestore.collection("discovery_decisions").get();

  assert.equal(result.status, "matched");
  assert.equal(result.match.displayName, "Bob");
  assert.deepEqual(result.match.photoRefs, [{ photoId: "photo-bob-match" }]);
  assert.equal(serialized.includes("bob@example.invalid"), false);
  assert.equal(serialized.includes("birthDate"), false);
  assert.equal(serialized.includes("risk"), false);
  assert.equal(serialized.includes("moderation"), false);
  assert.deepEqual(retry, result);
  assert.equal(matches.size, 1);
  assert.equal(decisions.size, 2);
  assert.deepEqual(matches.docs[0].data().memberIds, [currentUid, "bob-match"].sort());
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
