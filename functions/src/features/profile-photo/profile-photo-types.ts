export const FINALIZE_PHOTO_STATUS = "pending" as const;
export const MAX_TEMP_OBJECT_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_PROFILE_PHOTO_COUNT = 4;
export const MAX_IMAGE_WIDTH = 4096;
export const MAX_IMAGE_HEIGHT = 4096;
export const MAX_IMAGE_PIXELS = 16_000_000;
export const TEMP_UPLOAD_PATTERN = /^temp_uploads\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]{16,64})$/u;
export const SUPPORTED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACTIVE_PHOTO_STATUSES = ["pending", "approved", "needs_review"] as const;

export type SupportedContentType = typeof SUPPORTED_CONTENT_TYPES[number];

export interface FinalizeProfilePhotoInput {
  tempFilePath: string;
}

export interface FinalizeProfilePhotoResponse {
  photoId: string;
  status: typeof FINALIZE_PHOTO_STATUS;
}

export interface StoredObjectMetadata {
  exists: boolean;
  size: number;
  contentType?: string;
}

export interface ProcessedImage {
  bytes: Buffer;
  width: number;
  height: number;
}

export interface PhotoStorage {
  getMetadata(path: string): Promise<StoredObjectMetadata>;
  download(path: string): Promise<Buffer>;
  save(path: string, bytes: Buffer, contentType: string): Promise<void>;
  delete(path: string): Promise<void>;
}

export interface PhotoMetadataStore {
  getPhoto(photoId: string): Promise<Record<string, unknown> | undefined>;
  activePhotoCount(uid: string): Promise<number>;
  createPhoto(photoId: string, data: Record<string, unknown>): Promise<void>;
}

export interface FinalizeProfilePhotoDependencies {
  storage: PhotoStorage;
  store: PhotoMetadataStore;
  now: () => Date;
  processImage: (bytes: Buffer, declaredContentType: string) => Promise<ProcessedImage>;
}
