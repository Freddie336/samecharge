const assert = require("node:assert/strict");
const test = require("node:test");
const { AppError } = require("../lib/callable/app-error");
const {
  discoveryTestExports,
  hashCandidateToken,
  startDiscoveryForUid,
  submitDiscoveryDecisionForUid,
} = require("../lib/features/discovery/discovery-service");

const NOW = new Date("2026-07-08T12:00:00.000Z");
const { pairKeyFor } = discoveryTestExports;

function presence(overrides = {}) {
  return {
    batteryLevel: 77,
    batteryState: "discharging",
    cityId: "istanbul",
    online: true,
    lastSeenAt: NOW.getTime(),
    ...overrides,
  };
}

function profile(uid, overrides = {}) {
  return {
    uid,
    displayName: uid === "alice" ? "Alice" : uid[0].toUpperCase() + uid.slice(1),
    cityId: "istanbul",
    bio: `${uid} bio`,
    interests: ["coffee"],
    profileStatus: "approved",
    photoIds: [`photo-${uid}`],
    ...overrides,
  };
}

class MemoryDiscoveryStore {
  constructor(seed = {}) {
    this.privateData = new Map(Object.entries(seed.privateData ?? {
      alice: { birthDate: "2000-01-01", email: "alice@example.invalid" },
    }));
    this.internal = new Map(Object.entries(seed.internal ?? {
      alice: { accountStatus: "active" },
    }));
    this.profiles = new Map(Object.entries(seed.profiles ?? {
      alice: profile("alice"),
    }));
    this.preferences = new Map(Object.entries(seed.preferences ?? {
      alice: { discoveryEnabled: true },
    }));
    this.photos = new Map(Object.entries(seed.photos ?? {
      alice: [{ photoId: "photo-alice" }],
    }));
    this.presence = new Map(Object.entries(seed.presence ?? {
      alice: presence(),
    }));
    this.decidedPairKeys = new Set(seed.decidedPairKeys ?? []);
    this.blockedPairKeys = new Set(seed.blockedPairKeys ?? []);
    this.sessions = [];
  }

  async getPrivate(uid) {
    return this.privateData.get(uid);
  }

  async getInternal(uid) {
    return this.internal.get(uid);
  }

  async getProfile(uid) {
    return this.profiles.get(uid);
  }

  async getPreferences(uid) {
    return this.preferences.get(uid);
  }

  async getApprovedPhotos(uid) {
    return this.photos.get(uid) ?? [];
  }

  async getPresence(uid) {
    return this.presence.get(uid);
  }

  async listApprovedProfiles(cityId) {
    return [...this.profiles.values()].filter((item) => item.cityId === cityId);
  }

  async listDecisionPairKeysForRequester(uid) {
    assert.equal(uid, "alice");
    return new Set(this.decidedPairKeys);
  }

  async listBlockedPairKeysForRequester(uid) {
    assert.equal(uid, "alice");
    return new Set(this.blockedPairKeys);
  }

  async writeDiscoverySession(write) {
    this.sessions.push(write);
  }
}

class MemoryDecisionStore {
  constructor(seed = {}) {
    this.privateData = new Map(Object.entries(seed.privateData ?? {
      alice: { birthDate: "2000-01-01", email: "alice@example.invalid" },
      bob: { birthDate: "1998-05-05", email: "bob@example.invalid" },
    }));
    this.internal = new Map(Object.entries(seed.internal ?? {
      alice: { accountStatus: "active" },
      bob: { accountStatus: "active" },
    }));
    this.profiles = new Map(Object.entries(seed.profiles ?? {
      alice: profile("alice"),
      bob: profile("bob", { bio: "Bob safe bio", interests: ["music"] }),
    }));
    this.preferences = new Map(Object.entries(seed.preferences ?? {
      alice: { discoveryEnabled: true },
      bob: { discoveryEnabled: true },
    }));
    this.photos = new Map(Object.entries(seed.photos ?? {
      alice: [{ photoId: "photo-alice" }],
      bob: [{ photoId: "photo-bob" }],
    }));
    this.tokens = new Map(Object.entries(seed.tokens ?? {
      [hashCandidateToken("valid-token-000000000000000000000000")]: {
        requesterId: "alice",
        candidateId: "bob",
        expiresAt: new Date(NOW.getTime() + 60_000),
        used: false,
      },
    }));
    this.decisions = new Map(Object.entries(seed.decisions ?? {}));
    this.matches = new Map(Object.entries(seed.matches ?? {}));
  }

  async submitDecision(uid, tokenHash, decision, now) {
    const token = this.tokens.get(tokenHash);
    if (!token) {
      throw new AppError("candidate_token_invalid");
    }
    if (token.requesterId !== uid || token.candidateId === uid) {
      throw new AppError("candidate_token_invalid");
    }

    const pairKey = pairKeyFor(uid, token.candidateId);
    const decisionId = `${pairKey}:${uid}`;
    const reverseDecisionId = `${pairKey}:${token.candidateId}`;
    const existing = this.decisions.get(decisionId);
    const candidate = this._eligibleCandidate(token.candidateId, now);

    if (existing) {
      if (
        existing.tokenHash !== tokenHash ||
        existing.decision !== decision ||
        existing.candidateId !== token.candidateId
      ) {
        throw new AppError("candidate_token_used");
      }

      return this._response(existing, candidate, now);
    }

    if (token.used) {
      throw new AppError("candidate_token_used");
    }
    if (token.expiresAt.getTime() <= now.getTime()) {
      throw new AppError("candidate_token_expired");
    }

    token.used = true;
    if (decision === "pass") {
      const record = this._record(uid, token.candidateId, pairKey, decision, tokenHash, "passed");
      this.decisions.set(decisionId, record);
      return { status: "passed" };
    }

    const reverse = this.decisions.get(reverseDecisionId);
    const mutual = reverse?.decision === "like" &&
      reverse.requesterId === token.candidateId &&
      reverse.candidateId === uid;
    if (!mutual) {
      const record = this._record(uid, token.candidateId, pairKey, decision, tokenHash, "liked");
      this.decisions.set(decisionId, record);
      return { status: "liked" };
    }

    const existingMatch = this.matches.get(pairKey);
    if (existingMatch && (existingMatch.status !== "active" || existingMatch.blockedBy !== null)) {
      throw new AppError("match_not_active");
    }
    if (!existingMatch) {
      this.matches.set(pairKey, {
        memberIds: ["alice", "bob"],
        status: "active",
        blockedBy: null,
      });
    }

    const record = {
      ...this._record(uid, token.candidateId, pairKey, decision, tokenHash, "matched"),
      matchId: pairKey,
      matchedAt: now.toISOString(),
    };
    this.decisions.set(decisionId, record);
    return this._response(record, candidate, now);
  }

  _eligibleCandidate(uid, now) {
    const privateData = this.privateData.get(uid);
    const internal = this.internal.get(uid);
    const profileData = this.profiles.get(uid);
    const preferences = this.preferences.get(uid);
    const photos = this.photos.get(uid) ?? [];

    if (
      !privateData ||
      !internal ||
      !profileData ||
      !preferences ||
      internal.accountStatus !== "active" ||
      profileData.profileStatus !== "approved" ||
      preferences.discoveryEnabled !== true ||
      photos.length === 0
    ) {
      throw new AppError("profile_not_eligible");
    }

    const age = now.getUTCFullYear() - Number(privateData.birthDate.slice(0, 4));
    if (age < 18) {
      throw new AppError("profile_not_eligible");
    }

    return { privateData, profile: profileData, photos };
  }

  _record(requesterId, candidateId, pairKey, decision, tokenHash, status) {
    return { requesterId, candidateId, pairKey, decision, tokenHash, status };
  }

  _response(record, candidate, now) {
    if (record.status === "passed") {
      return { status: "passed" };
    }
    if (record.status === "liked") {
      return { status: "liked" };
    }

    return {
      status: "matched",
      matchId: record.matchId,
      matchedAt: record.matchedAt ?? now.toISOString(),
      match: {
        displayName: candidate.profile.displayName,
        age: now.getUTCFullYear() - Number(candidate.privateData.birthDate.slice(0, 4)),
        photoRefs: candidate.photos.map((photo) => ({ photoId: photo.photoId })),
      },
    };
  }
}

function dependencies(store, rawTokens = ["raw-token-1", "raw-token-2", "raw-token-3"]) {
  let tokenIndex = 0;

  return {
    store,
    tokens: {
      createRawToken: () => rawTokens[tokenIndex++],
      hashToken: hashCandidateToken,
      createSessionId: () => "session-1",
    },
    now: () => NOW,
  };
}

async function discover(store, input = { requestedRange: 3, pageSize: 10 }) {
  return startDiscoveryForUid("alice", input, dependencies(store));
}

function decisionDependencies(store) {
  return {
    store,
    tokens: { hashToken: hashCandidateToken },
    now: () => NOW,
  };
}

async function decide(store, input = {
  candidateToken: "valid-token-000000000000000000000000",
  decision: "like",
}) {
  return submitDiscoveryDecisionForUid("alice", input, decisionDependencies(store));
}

test("startDiscovery rejects ineligible requester states", async () => {
  for (const seed of [
    { photos: { alice: [] } },
    { internal: { alice: { accountStatus: "suspended" } } },
    { privateData: { alice: { birthDate: "2010-01-01" } } },
    { presence: { alice: presence({ lastSeenAt: NOW.getTime() - 91_000 }) } },
  ]) {
    await assert.rejects(
      () => discover(new MemoryDiscoveryStore(seed)),
      (error) => error instanceof AppError &&
        (error.appCode === "profile_not_eligible" || error.appCode === "account_restricted"),
    );
  }
});

test("startDiscovery returns an empty safe response when no candidate qualifies", async () => {
  const store = new MemoryDiscoveryStore();
  const result = await discover(store);

  assert.deepEqual(result, {
    candidates: [],
    expiresAt: "2026-07-08T12:05:00.000Z",
  });
  assert.equal(store.sessions.length, 1);
  assert.deepEqual(store.sessions[0].tokenRecords, []);
});

test("startDiscovery returns sanitized candidates and stores only token hashes", async () => {
  const store = new MemoryDiscoveryStore({
    privateData: {
      alice: { birthDate: "2000-01-01", email: "alice@example.invalid" },
      bob: { birthDate: "1998-05-05", email: "bob@example.invalid" },
      carol: { birthDate: "1997-05-05" },
    },
    internal: {
      alice: { accountStatus: "active" },
      bob: { accountStatus: "active" },
      carol: { accountStatus: "active" },
    },
    profiles: {
      alice: profile("alice"),
      bob: profile("bob", { bio: "Bob safe bio", interests: ["music"] }),
      carol: profile("carol"),
    },
    preferences: {
      alice: { discoveryEnabled: true },
      bob: { discoveryEnabled: true },
      carol: { discoveryEnabled: true },
    },
    photos: {
      alice: [{ photoId: "photo-alice" }],
      bob: [{ photoId: "photo-bob" }],
      carol: [{ photoId: "photo-carol" }],
    },
    presence: {
      alice: presence({ batteryLevel: 77 }),
      bob: presence({ batteryLevel: 77 }),
      carol: presence({ batteryLevel: 78 }),
    },
  });

  const result = await discover(store, { requestedRange: 1, pageSize: 2 });
  const serialized = JSON.stringify(result);

  assert.equal(result.candidates.length, 2);
  assert.equal(result.candidates[0].displayName, "Bob");
  assert.equal(result.candidates[0].batteryDifference, 0);
  assert.equal(result.candidates[1].displayName, "Carol");
  assert.equal(result.candidates[1].batteryDifference, 1);
  assert.equal(serialized.includes("email"), false);
  assert.equal(serialized.includes("birthDate"), false);
  assert.equal(serialized.includes("risk"), false);
  assert.equal(serialized.includes("bob@example.invalid"), false);
  assert.deepEqual(result.candidates[0].photoRefs, [{ photoId: "photo-bob" }]);
  assert.equal(result.candidates[0].candidateToken, "raw-token-1");

  const session = store.sessions[0];
  assert.equal(session.tokenRecords.length, 2);
  assert.equal(session.tokenRecords[0].tokenHash, hashCandidateToken("raw-token-1"));
  assert.equal(JSON.stringify(session).includes("raw-token-1"), false);
  assert.equal(session.tokenRecords[0].expiresAt.toISOString(), "2026-07-08T12:05:00.000Z");
});

test("startDiscovery omits candidates already decided by the requester", async () => {
  const store = new MemoryDiscoveryStore({
    privateData: {
      alice: { birthDate: "2000-01-01" },
      bob: { birthDate: "1998-05-05" },
      carol: { birthDate: "1997-05-05" },
    },
    internal: {
      alice: { accountStatus: "active" },
      bob: { accountStatus: "active" },
      carol: { accountStatus: "active" },
    },
    profiles: {
      alice: profile("alice"),
      bob: profile("bob"),
      carol: profile("carol"),
    },
    preferences: {
      alice: { discoveryEnabled: true },
      bob: { discoveryEnabled: true },
      carol: { discoveryEnabled: true },
    },
    photos: {
      alice: [{ photoId: "photo-alice" }],
      bob: [{ photoId: "photo-bob" }],
      carol: [{ photoId: "photo-carol" }],
    },
    presence: {
      alice: presence({ batteryLevel: 77 }),
      bob: presence({ batteryLevel: 77 }),
      carol: presence({ batteryLevel: 78 }),
    },
    decidedPairKeys: [pairKeyFor("alice", "bob")],
  });

  const result = await discover(store, { requestedRange: 1, pageSize: 10 });

  assert.deepEqual(
    result.candidates.map((candidate) => candidate.displayName),
    ["Carol"],
  );
  assert.equal(store.sessions[0].tokenRecords.length, 1);
  assert.equal(store.sessions[0].tokenRecords[0].candidateId, "carol");
});

test("startDiscovery omits blocked pairs", async () => {
  const store = new MemoryDiscoveryStore({
    privateData: {
      alice: { birthDate: "2000-01-01" },
      bob: { birthDate: "1998-05-05" },
      carol: { birthDate: "1997-05-05" },
    },
    internal: {
      alice: { accountStatus: "active" },
      bob: { accountStatus: "active" },
      carol: { accountStatus: "active" },
    },
    profiles: {
      alice: profile("alice"),
      bob: profile("bob"),
      carol: profile("carol"),
    },
    preferences: {
      alice: { discoveryEnabled: true },
      bob: { discoveryEnabled: true },
      carol: { discoveryEnabled: true },
    },
    photos: {
      alice: [{ photoId: "photo-alice" }],
      bob: [{ photoId: "photo-bob" }],
      carol: [{ photoId: "photo-carol" }],
    },
    presence: {
      alice: presence({ batteryLevel: 77 }),
      bob: presence({ batteryLevel: 77 }),
      carol: presence({ batteryLevel: 78 }),
    },
    blockedPairKeys: [pairKeyFor("alice", "bob")],
  });

  const result = await discover(store, { requestedRange: 1, pageSize: 10 });

  assert.deepEqual(
    result.candidates.map((candidate) => candidate.displayName),
    ["Carol"],
  );
});

test("startDiscovery applies exact, same-state ±1, and ±3 battery range behavior", async () => {
  const baseSeed = {
    privateData: {
      alice: { birthDate: "2000-01-01" },
      bob: { birthDate: "1998-05-05" },
      carol: { birthDate: "1997-05-05" },
      derya: { birthDate: "1996-05-05" },
    },
    internal: {
      alice: { accountStatus: "active" },
      bob: { accountStatus: "active" },
      carol: { accountStatus: "active" },
      derya: { accountStatus: "active" },
    },
    profiles: {
      alice: profile("alice"),
      bob: profile("bob"),
      carol: profile("carol"),
      derya: profile("derya"),
    },
    preferences: {
      alice: { discoveryEnabled: true },
      bob: { discoveryEnabled: true },
      carol: { discoveryEnabled: true },
      derya: { discoveryEnabled: true },
    },
    photos: {
      alice: [{ photoId: "photo-alice" }],
      bob: [{ photoId: "photo-bob" }],
      carol: [{ photoId: "photo-carol" }],
      derya: [{ photoId: "photo-derya" }],
    },
    presence: {
      alice: presence({ batteryLevel: 77, batteryState: "charging" }),
      bob: presence({ batteryLevel: 77, batteryState: "discharging" }),
      carol: presence({ batteryLevel: 78, batteryState: "charging" }),
      derya: presence({ batteryLevel: 80, batteryState: "discharging" }),
    },
  };

  assert.deepEqual(
    (await discover(new MemoryDiscoveryStore(baseSeed), { requestedRange: 0, pageSize: 10 }))
      .candidates.map((candidate) => candidate.displayName),
    ["Bob"],
  );
  assert.deepEqual(
    (await discover(new MemoryDiscoveryStore(baseSeed), { requestedRange: 1, pageSize: 10 }))
      .candidates.map((candidate) => candidate.displayName),
    ["Bob", "Carol"],
  );
  assert.deepEqual(
    (await discover(new MemoryDiscoveryStore(baseSeed), { requestedRange: 3, pageSize: 10 }))
      .candidates.map((candidate) => candidate.displayName),
    ["Bob", "Carol", "Derya"],
  );
});

test("submitDiscoveryDecision rejects fake, expired, used, and wrong-owner tokens", async () => {
  await assert.rejects(
    () => decide(new MemoryDecisionStore(), {
      candidateToken: "fake-token-000000000000000000000000",
      decision: "like",
    }),
    (error) => error instanceof AppError && error.appCode === "candidate_token_invalid",
  );
  await assert.rejects(
    () => decide(new MemoryDecisionStore({
      tokens: {
        [hashCandidateToken("valid-token-000000000000000000000000")]: {
          requesterId: "alice",
          candidateId: "bob",
          expiresAt: new Date(NOW.getTime() - 1),
          used: false,
        },
      },
    })),
    (error) => error instanceof AppError && error.appCode === "candidate_token_expired",
  );
  await assert.rejects(
    () => decide(new MemoryDecisionStore({
      tokens: {
        [hashCandidateToken("valid-token-000000000000000000000000")]: {
          requesterId: "alice",
          candidateId: "bob",
          expiresAt: new Date(NOW.getTime() + 60_000),
          used: true,
        },
      },
    })),
    (error) => error instanceof AppError && error.appCode === "candidate_token_used",
  );
  await assert.rejects(
    () => decide(new MemoryDecisionStore({
      tokens: {
        [hashCandidateToken("valid-token-000000000000000000000000")]: {
          requesterId: "carol",
          candidateId: "bob",
          expiresAt: new Date(NOW.getTime() + 60_000),
          used: false,
        },
      },
    })),
    (error) => error instanceof AppError && error.appCode === "candidate_token_invalid",
  );
});

test("submitDiscoveryDecision records pass once and creates no match", async () => {
  const store = new MemoryDecisionStore();
  const input = {
    candidateToken: "valid-token-000000000000000000000000",
    decision: "pass",
  };
  const result = await decide(store, input);
  const retry = await decide(store, input);

  assert.deepEqual(result, { status: "passed" });
  assert.deepEqual(retry, { status: "passed" });
  assert.equal(store.decisions.size, 1);
  assert.equal(store.matches.size, 0);
  assert.equal(store.tokens.get(hashCandidateToken(input.candidateToken)).used, true);
});

test("submitDiscoveryDecision records like without mutual match once", async () => {
  const store = new MemoryDecisionStore();
  const result = await decide(store);
  const retry = await decide(store);

  assert.deepEqual(result, { status: "liked" });
  assert.deepEqual(retry, { status: "liked" });
  assert.equal(store.decisions.size, 1);
  assert.equal(store.matches.size, 0);
});

test("submitDiscoveryDecision creates one sanitized match for mutual likes", async () => {
  const pairKey = pairKeyFor("alice", "bob");
  const store = new MemoryDecisionStore({
    decisions: {
      [`${pairKey}:bob`]: {
        requesterId: "bob",
        candidateId: "alice",
        pairKey,
        decision: "like",
        tokenHash: hashCandidateToken("reverse-token-0000000000000000000000"),
        status: "liked",
      },
    },
  });

  const result = await decide(store);
  const retry = await decide(store);
  const serialized = JSON.stringify(result);

  assert.equal(result.status, "matched");
  assert.equal(result.matchId, pairKey);
  assert.deepEqual(result.match.photoRefs, [{ photoId: "photo-bob" }]);
  assert.equal(serialized.includes("bob@example.invalid"), false);
  assert.equal(serialized.includes("birthDate"), false);
  assert.equal(serialized.includes("risk"), false);
  assert.deepEqual(retry, result);
  assert.equal(store.matches.size, 1);
  assert.equal(store.decisions.size, 2);
});

test("submitDiscoveryDecision rejects conflicting retry and blocked rematch", async () => {
  const pairKey = pairKeyFor("alice", "bob");
  const store = new MemoryDecisionStore();
  await decide(store, {
    candidateToken: "valid-token-000000000000000000000000",
    decision: "pass",
  });

  await assert.rejects(
    () => decide(store),
    (error) => error instanceof AppError && error.appCode === "candidate_token_used",
  );

  const blockedStore = new MemoryDecisionStore({
    decisions: {
      [`${pairKey}:bob`]: {
        requesterId: "bob",
        candidateId: "alice",
        pairKey,
        decision: "like",
        tokenHash: hashCandidateToken("reverse-token-0000000000000000000000"),
        status: "liked",
      },
    },
    matches: {
      [pairKey]: {
        memberIds: ["alice", "bob"],
        status: "blocked",
        blockedBy: "bob",
      },
    },
  });

  await assert.rejects(
    () => decide(blockedStore),
    (error) => error instanceof AppError && error.appCode === "match_not_active",
  );
});
