const assert = require("node:assert/strict");
const test = require("node:test");
const { AppError } = require("../lib/callable/app-error");
const { parseInput } = require("../lib/callable/input-validation");
const {
  blockUserSchema,
  reportContentSchema,
  requestAccountDeletionSchema,
  unmatchUserSchema,
} = require("../lib/features/safety/safety-schema");
const {
  blockUserForUid,
  processAccountDeletionForUid,
  reportContentForUid,
  requestAccountDeletionForUid,
  safetyTestExports,
  unmatchUserForUid,
} = require("../lib/features/safety/safety-service");

const NOW = new Date("2026-07-11T10:00:00.000Z");
const MATCH_ID = "c".repeat(64);
const { normalizeSafetyText, reportTokenForMatch, reportTokenForMessage, TBD_LEGAL_REVIEW } =
  safetyTestExports;

class MemorySafetyStore {
  constructor() {
    this.calls = [];
  }

  async reportContent(uid, input, now) {
    this.calls.push(["reportContent", uid, input, now]);
    return { status: "reported", reportId: "report-1" };
  }

  async blockUser(uid, input, now) {
    this.calls.push(["blockUser", uid, input, now]);
    return { status: "blocked" };
  }

  async unmatchUser(uid, input, now) {
    this.calls.push(["unmatchUser", uid, input, now]);
    return { status: "unmatched" };
  }

  async requestAccountDeletion(uid, input, now) {
    this.calls.push(["requestAccountDeletion", uid, input, now]);
    return { status: "deletion_pending" };
  }

  async processAccountDeletion(uid, now) {
    this.calls.push(["processAccountDeletion", uid, undefined, now]);
    return {
      status: "processed",
      completedSteps: ["matches_closed", "presence_removed", "profile_anonymized"],
    };
  }
}

function dependencies(store, reauthenticated = true) {
  return {
    store,
    reauthentication: {
      isRecentlyVerified: async () => reauthenticated,
    },
    now: () => NOW,
  };
}

test("safety schemas reject invalid and unknown fields", () => {
  assert.throws(
    () => parseInput(reportContentSchema, {
      reportToken: reportTokenForMatch(MATCH_ID),
      targetType: "user",
      targetId: "bob",
      matchId: MATCH_ID,
      category: "harassment",
      email: "mallory@example.invalid",
    }),
    /input_invalid/,
  );
  assert.throws(
    () => parseInput(reportContentSchema, {
      reportToken: reportTokenForMatch(MATCH_ID),
      targetType: "user",
      targetId: "bob",
      matchId: MATCH_ID,
      category: "bad",
    }),
    /input_invalid/,
  );
  assert.throws(
    () => parseInput(blockUserSchema, { targetUserId: "bad user" }),
    /input_invalid/,
  );
  assert.throws(
    () => parseInput(unmatchUserSchema, { matchId: MATCH_ID, targetUserId: "bob" }),
    /input_invalid/,
  );
  assert.throws(
    () => parseInput(requestAccountDeletionSchema, { confirmation: "delete" }),
    /input_invalid/,
  );
});

test("safety text normalization and report tokens are safe", () => {
  assert.equal(normalizeSafetyText("  Merhaba\u0000   Bob  "), "Merhaba Bob");
  assert.equal(normalizeSafetyText(" \n\t "), undefined);
  assert.equal(reportTokenForMatch(MATCH_ID), `match:${MATCH_ID}`);
  assert.equal(reportTokenForMessage(MATCH_ID, "message_1"), `message:${MATCH_ID}:message_1`);
  assert.equal(TBD_LEGAL_REVIEW, "TBD_LEGAL_REVIEW");
});

test("safety service forwards callable identity and requires reauthentication", async () => {
  const store = new MemorySafetyStore();
  const deps = dependencies(store);

  assert.deepEqual(
    await reportContentForUid("alice", {
      reportToken: reportTokenForMatch(MATCH_ID),
      targetType: "match",
      targetId: MATCH_ID,
      category: "spam",
    }, deps),
    { status: "reported", reportId: "report-1" },
  );
  assert.deepEqual(
    await blockUserForUid("alice", { targetUserId: "bob", matchId: MATCH_ID }, deps),
    { status: "blocked" },
  );
  assert.deepEqual(
    await unmatchUserForUid("alice", { matchId: MATCH_ID }, deps),
    { status: "unmatched" },
  );
  assert.deepEqual(
    await requestAccountDeletionForUid(
      "alice",
      { confirmation: "DELETE_MY_ACCOUNT", reauthenticationToken: "recent-token-1234" },
      deps,
    ),
    { status: "deletion_pending" },
  );
  assert.deepEqual(
    await processAccountDeletionForUid("alice", deps),
    {
      status: "processed",
      completedSteps: ["matches_closed", "presence_removed", "profile_anonymized"],
    },
  );

  await assert.rejects(
    () => requestAccountDeletionForUid(
      "alice",
      { confirmation: "DELETE_MY_ACCOUNT" },
      dependencies(new MemorySafetyStore(), false),
    ),
    (error) => error instanceof AppError && error.appCode === "reauthentication_required",
  );
  assert.equal(store.calls.every((call) => call[1] === "alice"), true);
});
