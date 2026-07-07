import { createHash } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as sharp from "sharp";
import { AppError } from "../../callable/app-error";
import {
  ACTIVE_PHOTO_STATUSES,
  FINALIZE_PHOTO_STATUS,
  FinalizeProfilePhotoDependencies,
  FinalizeProfilePhotoInput,
  FinalizeProfilePhotoResponse,
  MAX_IMAGE_HEIGHT,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_WIDTH,
  MAX_PROFILE_PHOTO_COUNT,
  MAX_TEMP_OBJECT_SIZE_BYTES,
  PhotoMetadataStore,
  PhotoStorage,
  ProcessedImage,
  StoredObjectMetadata,
  SUPPORTED_CONTENT_TYPES,
  TEMP_UPLOAD_PATTERN,
} from "./profile-photo-types";

const OUTPUT_CONTENT_TYPE = "image/webp";
const OUTPUT_QUALITY = 82;
type SharpFactory = (
  input?: sharp.SharpInput,
  options?: sharp.SharpOptions,
) => sharp.Sharp;
const createSharp = sharp as unknown as SharpFactory;

class AdminPhotoStorage implements PhotoStorage {
  private readonly bucket = getStorage().bucket();

  async getMetadata(path: string): Promise<StoredObjectMetadata> {
    const file = this.bucket.file(path);
    const [exists] = await file.exists();

    if (!exists) {
      return { exists: false, size: 0 };
    }

    const [metadata] = await file.getMetadata();
    return {
      exists: true,
      size: Number(metadata.size ?? 0),
      contentType: metadata.contentType,
    };
  }

  async download(path: string): Promise<Buffer> {
    const [bytes] = await this.bucket.file(path).download();
    return bytes;
  }

  async save(path: string, bytes: Buffer, contentType: string): Promise<void> {
    await this.bucket.file(path).save(bytes, {
      contentType,
      resumable: false,
      metadata: {
        cacheControl: "private, max-age=0, no-transform",
      },
    });
  }

  async delete(path: string): Promise<void> {
    await this.bucket.file(path).delete({ ignoreNotFound: true });
  }
}

class AdminPhotoMetadataStore implements PhotoMetadataStore {
  private readonly firestore = getFirestore();

  async getPhoto(photoId: string): Promise<Record<string, unknown> | undefined> {
    const snapshot = await this.firestore.collection("profile_photos").doc(photoId).get();
    return snapshot.exists ? snapshot.data() : undefined;
  }

  async activePhotoCount(uid: string): Promise<number> {
    const snapshot = await this.firestore.collection("profile_photos")
      .where("ownerId", "==", uid)
      .where("status", "in", ACTIVE_PHOTO_STATUSES)
      .limit(MAX_PROFILE_PHOTO_COUNT + 1)
      .get();
    return snapshot.size;
  }

  async createPhoto(photoId: string, data: Record<string, unknown>): Promise<void> {
    await this.firestore.collection("profile_photos").doc(photoId).create(data);
  }
}

export function createDefaultFinalizeProfilePhotoDependencies(): FinalizeProfilePhotoDependencies {
  return {
    storage: new AdminPhotoStorage(),
    store: new AdminPhotoMetadataStore(),
    now: () => new Date(),
    processImage: processProfilePhotoImage,
  };
}

export async function processProfilePhotoImage(
  bytes: Buffer,
  declaredContentType: string,
): Promise<ProcessedImage> {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_TEMP_OBJECT_SIZE_BYTES) {
    throw new AppError("content_rejected");
  }

  try {
    let image = createSharp(bytes, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).rotate();
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height || !metadata.format) {
      throw new AppError("content_rejected");
    }

    if (metadata.width > MAX_IMAGE_WIDTH || metadata.height > MAX_IMAGE_HEIGHT) {
      throw new AppError("content_rejected");
    }

    const actualContentType = contentTypeForSharpFormat(metadata.format);
    if (actualContentType !== declaredContentType) {
      throw new AppError("content_rejected");
    }

    image = image.resize({
      width: Math.min(metadata.width, 1600),
      height: Math.min(metadata.height, 1600),
      fit: "inside",
      withoutEnlargement: true,
    });
    const bytesOut = await image.webp({ quality: OUTPUT_QUALITY }).toBuffer();
    const outputMetadata = await createSharp(bytesOut, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata();

    if (!outputMetadata.width || !outputMetadata.height) {
      throw new AppError("content_rejected");
    }

    return {
      bytes: bytesOut,
      width: outputMetadata.width,
      height: outputMetadata.height,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("content_rejected", { cause: error });
  }
}

export async function finalizeProfilePhotoForUid(
  uid: string,
  input: FinalizeProfilePhotoInput,
  dependencies: FinalizeProfilePhotoDependencies,
): Promise<FinalizeProfilePhotoResponse> {
  const parsedPath = parseTempUploadPath(input.tempFilePath);
  if (parsedPath.uid !== uid) {
    throw new AppError("input_invalid");
  }

  const photoId = deterministicPhotoId(uid, parsedPath.uploadId);
  const permanentPath = permanentPathFor(uid, photoId);
  const existingPhoto = await dependencies.store.getPhoto(photoId);
  if (existingPhoto) {
    assertExistingPhotoBelongsToUser(existingPhoto, uid, permanentPath);
    await dependencies.storage.delete(input.tempFilePath);
    return { photoId, status: FINALIZE_PHOTO_STATUS };
  }

  const metadata = await dependencies.storage.getMetadata(input.tempFilePath);
  validateObjectMetadata(metadata);
  const originalBytes = await dependencies.storage.download(input.tempFilePath);
  const processed = await dependencies.processImage(originalBytes, metadata.contentType ?? "");

  if (await dependencies.store.activePhotoCount(uid) >= MAX_PROFILE_PHOTO_COUNT) {
    throw new AppError("rate_limited");
  }

  let permanentWritten = false;
  try {
    const operationTime = Timestamp.fromDate(dependencies.now());
    await dependencies.storage.save(permanentPath, processed.bytes, OUTPUT_CONTENT_TYPE);
    permanentWritten = true;
    await dependencies.store.createPhoto(photoId, {
      ownerId: uid,
      storagePath: permanentPath,
      status: FINALIZE_PHOTO_STATUS,
      fileSizeBytes: processed.bytes.length,
      mimeType: OUTPUT_CONTENT_TYPE,
      imageWidthPx: processed.width,
      imageHeightPx: processed.height,
      createdAt: operationTime,
      updatedAt: operationTime,
    });
    await dependencies.storage.delete(input.tempFilePath);
  } catch (error) {
    if (permanentWritten) {
      await dependencies.storage.delete(permanentPath).catch(() => undefined);
    }

    if (isAlreadyExistsError(error)) {
      const replayed = await dependencies.store.getPhoto(photoId);
      if (replayed) {
        assertExistingPhotoBelongsToUser(replayed, uid, permanentPath);
        await dependencies.storage.delete(input.tempFilePath);
        return { photoId, status: FINALIZE_PHOTO_STATUS };
      }
    }

    throw new AppError("internal", { cause: error });
  }

  return { photoId, status: FINALIZE_PHOTO_STATUS };
}

export function deterministicPhotoId(uid: string, uploadId: string): string {
  return createHash("sha256")
    .update(`${uid}\0${uploadId}`, "utf8")
    .digest("hex");
}

export function permanentPathFor(uid: string, photoId: string): string {
  return `profile_photos/${uid}/${photoId}.webp`;
}

export function parseTempUploadPath(path: string): { uid: string; uploadId: string } {
  const match = TEMP_UPLOAD_PATTERN.exec(path);

  if (!match) {
    throw new AppError("input_invalid");
  }

  return {
    uid: match[1],
    uploadId: match[2],
  };
}

function validateObjectMetadata(metadata: StoredObjectMetadata): void {
  if (!metadata.exists) {
    throw new AppError("input_invalid");
  }

  if (metadata.size <= 0 || metadata.size > MAX_TEMP_OBJECT_SIZE_BYTES) {
    throw new AppError("content_rejected");
  }

  if (!SUPPORTED_CONTENT_TYPES.includes(metadata.contentType as never)) {
    throw new AppError("content_rejected");
  }
}

function assertExistingPhotoBelongsToUser(
  photo: Record<string, unknown>,
  uid: string,
  expectedStoragePath: string,
): void {
  if (
    photo.ownerId !== uid ||
    photo.storagePath !== expectedStoragePath ||
    photo.status !== FINALIZE_PHOTO_STATUS
  ) {
    throw new AppError("internal");
  }
}

function contentTypeForSharpFormat(format: string): string {
  if (format === "jpeg" || format === "jpg") {
    return "image/jpeg";
  }

  if (format === "png") {
    return "image/png";
  }

  if (format === "webp") {
    return "image/webp";
  }

  throw new AppError("content_rejected");
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return (error as { code?: unknown }).code === 6;
}
