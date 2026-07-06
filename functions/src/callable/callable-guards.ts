import { CallableRequest } from "firebase-functions/v2/https";
import { AppError } from "./app-error";

export function requireAuthenticatedUid(request: Pick<CallableRequest<unknown>, "auth">): string {
  if (!request.auth) {
    throw new AppError("unauthenticated");
  }

  return request.auth.uid;
}

export function requireAppCheck(request: Pick<CallableRequest<unknown>, "app">): void {
  if (!request.app) {
    throw new AppError("app_check_required");
  }
}
