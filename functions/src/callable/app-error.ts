import {
  FunctionsErrorCode,
  HttpsError,
} from "firebase-functions/v2/https";
import { APP_ERROR_CODES, AppErrorCode } from "./app-error-code";

const PUBLIC_ERROR_MESSAGE = "Request failed.";

export class AppError extends Error {
  readonly appCode: AppErrorCode;
  readonly cause?: unknown;

  constructor(appCode: AppErrorCode, options: { cause?: unknown } = {}) {
    super(appCode);
    this.name = "AppError";
    this.appCode = appCode;
    this.cause = options.cause;
  }
}

export const FIREBASE_ERROR_CODE_BY_APP_CODE: Record<AppErrorCode, FunctionsErrorCode> = {
  unauthenticated: "unauthenticated",
  app_check_required: "failed-precondition",
  rate_limited: "resource-exhausted",
  input_invalid: "invalid-argument",
  profile_not_eligible: "failed-precondition",
  candidate_token_invalid: "failed-precondition",
  candidate_token_expired: "failed-precondition",
  candidate_token_used: "failed-precondition",
  candidate_token_revoked: "failed-precondition",
  report_token_invalid: "failed-precondition",
  report_token_expired: "failed-precondition",
  report_token_used: "failed-precondition",
  discovery_limit_reached: "resource-exhausted",
  match_not_active: "failed-precondition",
  messaging_disabled: "failed-precondition",
  content_rejected: "failed-precondition",
  account_restricted: "permission-denied",
  not_found: "not-found",
  already_exists: "already-exists",
  permission_denied: "permission-denied",
  reauthentication_required: "unauthenticated",
  internal: "internal",
};

export interface SafeErrorDetails {
  code: AppErrorCode;
  requestId: string;
}

export function normalizeAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError("internal", { cause: error });
}

export function toHttpsError(error: unknown, requestId: string): HttpsError {
  const appError = normalizeAppError(error);
  const firebaseCode = FIREBASE_ERROR_CODE_BY_APP_CODE[appError.appCode];
  const details: SafeErrorDetails = {
    code: appError.appCode,
    requestId,
  };

  return new HttpsError(firebaseCode, PUBLIC_ERROR_MESSAGE, details);
}

export function assertAppErrorMappingsAreExhaustive(): boolean {
  return APP_ERROR_CODES.every((code) => FIREBASE_ERROR_CODE_BY_APP_CODE[code] !== undefined);
}
