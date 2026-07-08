const assert = require("node:assert/strict");
const test = require("node:test");
const { AppError } = require("../lib/callable/app-error");
const {
  hashCandidateToken,
  startDiscoveryForUid,
} = require("../lib/features/discovery/discovery-service");

const NOW = new Date("2026-07-08T12:00:00.000Z");

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

  async writeDiscoverySession(write) {
    this.sessions.push(write);
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
