const assert = require("node:assert/strict");
const test = require("node:test");
const sharp = require("sharp");
const { AppError } = require("../lib/callable/app-error");
const {
  deterministicPhotoId,
  finalizeProfilePhotoForUid,
  parseTempUploadPath,
  permanentPathFor,
  processProfilePhotoImage,
} = require("../lib/features/profile-photo/profile-photo-service");
const {
  MAX_PROFILE_PHOTO_COUNT,
} = require("../lib/features/profile-photo/profile-photo-types");

const UID = "auth-alice";
const UPLOAD_ID = "AbCdEfGhIjKlMnOp";
const TEMP_PATH = `temp_uploads/${UID}/${UPLOAD_ID}`;

class MemoryPhotoStorage {
  constructor(objects = {}) {
    this.objects = new Map(Object.entries(objects));
    this.saved = [];
    this.deleted = [];
    this.failSave = false;
  }

  async getMetadata(path) {
    const object = this.objects.get(path);
    if (!object) {
      return { exists: false, size: 0 };
    }

    return {
      exists: true,
      size: object.bytes.length,
      contentType: object.contentType,
    };
  }

  async download(path) {
    return this.objects.get(path).bytes;
  }

  async save(path, bytes, contentType) {
    if (this.failSave) {
      throw new Error("SAVE_FAILED");
    }

    this.saved.push(path);
    this.objects.set(path, { bytes, contentType });
  }

  async delete(path) {
    this.deleted.push(path);
    this.objects.delete(path);
  }
}

class MemoryPhotoStore {
  constructor(photos = {}) {
    this.photos = new Map(Object.entries(photos));
    this.failCreate = false;
  }

  async getPhoto(photoId) {
    return this.photos.get(photoId);
  }

  async activePhotoCount(uid) {
    return [...this.photos.values()]
      .filter((photo) => photo.ownerId === uid)
      .filter((photo) => ["pending", "approved", "needs_review"].includes(photo.status))
      .length;
  }

  async createPhoto(photoId, data) {
    if (this.failCreate) {
      throw new Error("CREATE_FAILED");
    }

    if (this.photos.has(photoId)) {
      const error = new Error("ALREADY_EXISTS");
      error.code = 6;
      throw error;
    }

    this.photos.set(photoId, data);
  }
}

async function jpegBytes() {
  return sharp({
    create: {
      width: 32,
      height: 24,
      channels: 3,
      background: "#24795b",
    },
  }).jpeg().withMetadata({ exif: { IFD0: { Copyright: "SECRET_MARKER" } } }).toBuffer();
}

function dependencies(storage, store, processImage = processProfilePhotoImage) {
  return {
    storage,
    store,
    now: () => new Date("2026-07-07T12:00:00.000Z"),
    processImage,
  };
}

async function finalize(overrides = {}) {
  const bytes = overrides.bytes ?? await jpegBytes();
  const storage = overrides.storage ?? new MemoryPhotoStorage({
    [TEMP_PATH]: {
      bytes,
      contentType: overrides.contentType ?? "image/jpeg",
    },
  });
  const store = overrides.store ?? new MemoryPhotoStore(overrides.photos);
  const result = await finalizeProfilePhotoForUid(
    overrides.uid ?? UID,
    { tempFilePath: overrides.tempFilePath ?? TEMP_PATH },
    dependencies(storage, store, overrides.processImage),
  );

  return { result, storage, store };
}

test("parseTempUploadPath accepts only the documented owner temp path", () => {
  assert.deepEqual(parseTempUploadPath(TEMP_PATH), {
    uid: UID,
    uploadId: UPLOAD_ID,
  });

  for (const path of [
    `temp_uploads/${UID}/short`,
    `temp_uploads/${UID}/${UPLOAD_ID}/nested`,
    `temp_uploads/${UID}/../${UPLOAD_ID}`,
    `profile_photos/${UID}/${UPLOAD_ID}.webp`,
  ]) {
    assert.throws(() => parseTempUploadPath(path), (error) => error.appCode === "input_invalid");
  }
});

test("finalizeProfilePhoto validates ownership, object metadata and real image bytes", async () => {
  await assert.rejects(
    () => finalize({ uid: "auth-bob" }),
    (error) => error.appCode === "input_invalid",
  );
  await assert.rejects(
    () => finalize({ contentType: "text/plain" }),
    (error) => error.appCode === "content_rejected",
  );
  await assert.rejects(
    () => finalize({ bytes: Buffer.alloc(5 * 1024 * 1024 + 1) }),
    (error) => error.appCode === "content_rejected",
  );
  await assert.rejects(
    () => finalize({ bytes: Buffer.from("not an image") }),
    (error) => error instanceof AppError && error.appCode === "content_rejected",
  );
});

test("processProfilePhotoImage re-encodes to metadata-free WebP", async () => {
  const processed = await processProfilePhotoImage(await jpegBytes(), "image/jpeg");
  const metadata = await sharp(processed.bytes).metadata();

  assert.equal(metadata.format, "webp");
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
  assert.equal(processed.width, 32);
  assert.equal(processed.height, 24);
  assert.equal(processed.bytes.includes(Buffer.from("SECRET_MARKER")), false);
});

test("finalizeProfilePhoto creates deterministic metadata and no public URL", async () => {
  const { result, storage, store } = await finalize();
  const photoId = deterministicPhotoId(UID, UPLOAD_ID);
  const permanentPath = permanentPathFor(UID, photoId);
  const stored = store.photos.get(photoId);

  assert.deepEqual(result, { photoId, status: "pending" });
  assert.equal(stored.ownerId, UID);
  assert.equal(stored.storagePath, permanentPath);
  assert.equal(stored.status, "pending");
  assert.equal(stored.mimeType, "image/webp");
  assert.equal("downloadUrl" in stored, false);
  assert.equal(storage.objects.has(permanentPath), true);
  assert.equal(storage.objects.has(TEMP_PATH), false);
});

test("finalizeProfilePhoto replay converges without duplicate metadata", async () => {
  const first = await finalize();
  const secondStorage = new MemoryPhotoStorage({
    [TEMP_PATH]: {
      bytes: await jpegBytes(),
      contentType: "image/jpeg",
    },
  });
  const second = await finalize({
    storage: secondStorage,
    store: first.store,
  });

  assert.deepEqual(second.result, first.result);
  assert.equal(first.store.photos.size, 1);
  assert.deepEqual(secondStorage.saved, []);
  assert.deepEqual(secondStorage.deleted, [TEMP_PATH]);
});

test("finalizeProfilePhoto enforces the active four-photo limit", async () => {
  const photos = {};
  for (let index = 0; index < MAX_PROFILE_PHOTO_COUNT; index += 1) {
    photos[`photo-${index}`] = {
      ownerId: UID,
      status: "pending",
      storagePath: `profile_photos/${UID}/photo-${index}.webp`,
    };
  }

  await assert.rejects(
    () => finalize({ photos }),
    (error) => error.appCode === "rate_limited",
  );
});

test("finalizeProfilePhoto compensates orphan permanent object after metadata failure", async () => {
  const storage = new MemoryPhotoStorage({
    [TEMP_PATH]: {
      bytes: await jpegBytes(),
      contentType: "image/jpeg",
    },
  });
  const store = new MemoryPhotoStore();
  store.failCreate = true;

  await assert.rejects(
    () => finalize({ storage, store }),
    (error) => error.appCode === "internal",
  );

  assert.equal(storage.saved.length, 1);
  assert.equal(storage.deleted.includes(storage.saved[0]), true);
  assert.equal(storage.objects.has(TEMP_PATH), true);
});
