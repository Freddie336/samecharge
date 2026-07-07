function cloneValue(value) {
  if (value === undefined) {
    return undefined;
  }

  return structuredClone(value);
}

class MemoryAuthUserReader {
  constructor(emailsByUid = {}) {
    this.emailsByUid = new Map(Object.entries(emailsByUid));
    this.requestedUids = [];
  }

  async getEmail(uid) {
    this.requestedUids.push(uid);
    const email = this.emailsByUid.get(uid);

    if (!email) {
      const { AppError } = require("../lib/callable/app-error");
      throw new AppError("unauthenticated");
    }

    return email;
  }
}

class MemoryOnboardingStore {
  constructor(initialDocuments = {}) {
    this.documents = new Map();
    this.writes = [];
    this.reads = [];
    this.failBeforeCommit = false;

    for (const [path, data] of Object.entries(initialDocuments)) {
      this.documents.set(path, cloneValue(data));
    }
  }

  async runTransaction(handler) {
    const stagedWrites = [];
    const store = this;
    const transaction = {
      get: async (path) => {
        store.reads.push(path);
        return cloneValue(store.documents.get(path));
      },
      set: (path, data) => {
        stagedWrites.push({ path, data: cloneValue(data) });
      },
      hasFinalizedProfilePhoto: async (uid) => {
        store.reads.push(`profile_photos?ownerId=${uid}`);
        for (const [path, data] of store.documents.entries()) {
          const segments = path.split("/");
          if (
            segments.length === 2 &&
            segments[0] === "profile_photos" &&
            data.ownerId === uid &&
            ["pending", "approved", "needs_review"].includes(data.status)
          ) {
            return true;
          }
        }

        return false;
      },
    };
    const result = await handler(transaction);

    if (this.failBeforeCommit) {
      throw new Error("SIMULATED_TRANSACTION_FAILURE");
    }

    for (const write of stagedWrites) {
      this.documents.set(write.path, cloneValue(write.data));
      this.writes.push(write);
    }

    return result;
  }

  get(path) {
    return cloneValue(this.documents.get(path));
  }

  writePaths() {
    return this.writes.map((write) => write.path);
  }
}

function fixedNow(date = "2026-07-06T12:00:00.000Z") {
  return () => new Date(date);
}

function validOnboardingInput(overrides = {}) {
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

function storeWithFinalizedPhoto(uid = "auth-alice", initial = {}) {
  return new MemoryOnboardingStore({
    [`profile_photos/photo-${uid}`]: {
      ownerId: uid,
      status: "pending",
      createdAt: new Date("2026-07-06T00:00:00.000Z"),
    },
    ...initial,
  });
}

module.exports = {
  MemoryAuthUserReader,
  MemoryOnboardingStore,
  fixedNow,
  storeWithFinalizedPhoto,
  validOnboardingInput,
};
