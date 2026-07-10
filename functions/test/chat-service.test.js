const assert = require("node:assert/strict");
const test = require("node:test");
const { AppError } = require("../lib/callable/app-error");
const { parseInput } = require("../lib/callable/input-validation");
const {
  markMatchReadSchema,
  sendMessageSchema,
  setMatchMutedSchema,
} = require("../lib/features/chat/chat-schema");
const {
  chatTestExports,
  markMatchReadForUid,
  sendMessageForUid,
  setMatchMutedForUid,
} = require("../lib/features/chat/chat-service");

const NOW = new Date("2026-07-10T10:00:00.000Z");
const MATCH_ID = "a".repeat(64);
const { messageIdFor, normalizeMessageText } = chatTestExports;

class MemoryChatStore {
  constructor(seed = {}) {
    this.matches = new Map(Object.entries(seed.matches ?? {
      [MATCH_ID]: {
        memberIds: ["alice", "bob"],
        status: "active",
        messagingEnabled: true,
        blockedBy: null,
        unreadCounts: { alice: 0, bob: 0 },
        mutedBy: {},
        lastReadAt: {},
      },
    }));
    this.messages = new Map(Object.entries(seed.messages ?? {}));
  }

  async sendMessage(uid, input, now) {
    const text = normalizeMessageText(input.text);
    if (text.length < 1 || text.length > 1000) {
      throw new AppError("input_invalid");
    }

    const match = this._sendable(input.matchId, uid);
    const messageId = messageIdFor(uid, input.clientMessageId);
    const key = `${input.matchId}/${messageId}`;
    const existing = this.messages.get(key);
    if (existing) {
      if (
        existing.senderId !== uid ||
        existing.clientMessageId !== input.clientMessageId ||
        existing.text !== text
      ) {
        throw new AppError("already_exists");
      }

      return {
        status: "sent",
        messageId,
        createdAt: existing.createdAt,
        text,
      };
    }

    const createdAt = now.toISOString();
    this.messages.set(key, {
      senderId: uid,
      type: "text",
      text,
      createdAt,
      clientMessageId: input.clientMessageId,
      moderationStatus: "clean",
    });
    match.lastMessageAt = createdAt;
    match.lastMessagePreview = text;
    match.updatedAt = createdAt;
    for (const memberId of match.memberIds) {
      if (memberId !== uid) {
        match.unreadCounts[memberId] = (match.unreadCounts[memberId] ?? 0) + 1;
      }
    }

    return { status: "sent", messageId, createdAt, text };
  }

  async markMatchRead(uid, input, now) {
    const match = this._readable(input.matchId, uid);
    match.unreadCounts[uid] = 0;
    match.lastReadAt[uid] = now.toISOString();
    match.updatedAt = now.toISOString();
    return { status: "read" };
  }

  async setMatchMuted(uid, input, now) {
    const match = this._readable(input.matchId, uid);
    match.mutedBy[uid] = input.muted;
    match.updatedAt = now.toISOString();
    return { status: "muted", muted: input.muted };
  }

  _sendable(matchId, uid) {
    const match = this._readable(matchId, uid);
    if (match.status !== "active") {
      throw new AppError("match_not_active");
    }
    if (match.messagingEnabled !== true) {
      throw new AppError("messaging_disabled");
    }
    if (match.blockedBy !== null && match.blockedBy !== undefined) {
      throw new AppError("match_not_active");
    }

    return match;
  }

  _readable(matchId, uid) {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new AppError("not_found");
    }
    if (!match.memberIds.includes(uid)) {
      throw new AppError("permission_denied");
    }

    return match;
  }
}

function dependencies(store) {
  return {
    store,
    now: () => NOW,
  };
}

function validInput(overrides = {}) {
  return {
    matchId: MATCH_ID,
    clientMessageId: "client-msg-1",
    text: " Merhaba ",
    ...overrides,
  };
}

test("chat schemas reject invalid and unknown fields", () => {
  assert.throws(
    () => parseInput(sendMessageSchema, validInput({ senderId: "mallory" })),
    /input_invalid/,
  );
  assert.throws(
    () => parseInput(sendMessageSchema, validInput({ matchId: "not-a-match" })),
    /input_invalid/,
  );
  assert.throws(
    () => parseInput(sendMessageSchema, validInput({ clientMessageId: "bad id" })),
    /input_invalid/,
  );
  assert.throws(
    () => parseInput(markMatchReadSchema, { matchId: MATCH_ID, uid: "bob" }),
    /input_invalid/,
  );
  assert.throws(
    () => parseInput(setMatchMutedSchema, { matchId: MATCH_ID, muted: true, uid: "bob" }),
    /input_invalid/,
  );
});

test("sendMessage enforces membership and match messaging state", async () => {
  await assert.rejects(
    () => sendMessageForUid("mallory", validInput(), dependencies(new MemoryChatStore())),
    (error) => error instanceof AppError && error.appCode === "permission_denied",
  );
  await assert.rejects(
    () => sendMessageForUid("alice", validInput(), dependencies(new MemoryChatStore({
      matches: {
        [MATCH_ID]: {
          memberIds: ["alice", "bob"],
          status: "inactive",
          messagingEnabled: true,
          blockedBy: null,
          unreadCounts: {},
          mutedBy: {},
          lastReadAt: {},
        },
      },
    }))),
    (error) => error instanceof AppError && error.appCode === "match_not_active",
  );
  await assert.rejects(
    () => sendMessageForUid("alice", validInput(), dependencies(new MemoryChatStore({
      matches: {
        [MATCH_ID]: {
          memberIds: ["alice", "bob"],
          status: "active",
          messagingEnabled: false,
          blockedBy: null,
          unreadCounts: {},
          mutedBy: {},
          lastReadAt: {},
        },
      },
    }))),
    (error) => error instanceof AppError && error.appCode === "messaging_disabled",
  );
  await assert.rejects(
    () => sendMessageForUid("alice", validInput(), dependencies(new MemoryChatStore({
      matches: {
        [MATCH_ID]: {
          memberIds: ["alice", "bob"],
          status: "active",
          messagingEnabled: true,
          blockedBy: "bob",
          unreadCounts: {},
          mutedBy: {},
          lastReadAt: {},
        },
      },
    }))),
    (error) => error instanceof AppError && error.appCode === "match_not_active",
  );
});

test("sendMessage validates, normalizes, and stores text-only messages", async () => {
  const store = new MemoryChatStore();
  await assert.rejects(
    () => sendMessageForUid("alice", validInput({ text: " \n\t " }), dependencies(store)),
    (error) => error instanceof AppError && error.appCode === "input_invalid",
  );
  await assert.rejects(
    () => sendMessageForUid("alice", validInput({ text: "a".repeat(1001) }), dependencies(store)),
    (error) => error instanceof AppError && error.appCode === "input_invalid",
  );

  const result = await sendMessageForUid(
    "alice",
    validInput({ text: "  Merhaba\u0000   Bob  " }),
    dependencies(store),
  );
  const message = [...store.messages.values()][0];

  assert.equal(result.text, "Merhaba Bob");
  assert.equal(message.senderId, "alice");
  assert.equal(message.type, "text");
  assert.equal(message.moderationStatus, "clean");
  assert.equal(store.matches.get(MATCH_ID).lastMessagePreview, "Merhaba Bob");
  assert.equal(store.matches.get(MATCH_ID).unreadCounts.bob, 1);
});

test("sendMessage is idempotent by sender and clientMessageId", async () => {
  const store = new MemoryChatStore();
  const input = validInput({ text: "Merhaba" });
  const first = await sendMessageForUid("alice", input, dependencies(store));
  const retry = await sendMessageForUid("alice", input, dependencies(store));

  assert.deepEqual(retry, first);
  assert.equal(store.messages.size, 1);
  assert.equal(store.matches.get(MATCH_ID).unreadCounts.bob, 1);

  await assert.rejects(
    () => sendMessageForUid("alice", validInput({ text: "Different" }), dependencies(store)),
    (error) => error instanceof AppError && error.appCode === "already_exists",
  );
});

test("markMatchRead and setMatchMuted are member-only and own-member scoped", async () => {
  const store = new MemoryChatStore();
  await sendMessageForUid("alice", validInput({ text: "Merhaba" }), dependencies(store));

  await assert.rejects(
    () => markMatchReadForUid("mallory", { matchId: MATCH_ID }, dependencies(store)),
    (error) => error instanceof AppError && error.appCode === "permission_denied",
  );
  await markMatchReadForUid("bob", { matchId: MATCH_ID }, dependencies(store));
  assert.equal(store.matches.get(MATCH_ID).unreadCounts.bob, 0);
  assert.equal(typeof store.matches.get(MATCH_ID).lastReadAt.bob, "string");

  await assert.rejects(
    () => setMatchMutedForUid("mallory", { matchId: MATCH_ID, muted: true }, dependencies(store)),
    (error) => error instanceof AppError && error.appCode === "permission_denied",
  );
  const result = await setMatchMutedForUid(
    "bob",
    { matchId: MATCH_ID, muted: true },
    dependencies(store),
  );

  assert.deepEqual(result, { status: "muted", muted: true });
  assert.equal(store.matches.get(MATCH_ID).mutedBy.bob, true);
  assert.equal(store.matches.get(MATCH_ID).mutedBy.alice, undefined);
  assert.equal(store.matches.get(MATCH_ID).messagingEnabled, true);
});
