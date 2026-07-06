import { randomUUID } from "node:crypto";
import { CallableRequest } from "firebase-functions/v2/https";
import { z } from "zod/v3";
import { AppError, normalizeAppError, toHttpsError } from "./app-error";
import { CallableHandler } from "./callable-context";
import { requireAppCheck, requireAuthenticatedUid } from "./callable-guards";
import { parseInput } from "./input-validation";
import { productionSafeLogger, SafeLogger } from "./safe-logger";

export interface ExecuteCallableDependencies {
  createRequestId?: () => string;
  nowMs?: () => number;
  logger?: SafeLogger;
}

export interface ExecuteCallableOptions<TSchema extends z.ZodTypeAny, TResult> {
  functionName: string;
  inputSchema: TSchema;
  request: CallableRequest<unknown>;
  handler: CallableHandler<z.output<TSchema>, TResult>;
  dependencies?: ExecuteCallableDependencies;
}

export async function executeCallable<TSchema extends z.ZodTypeAny, TResult>(
  options: ExecuteCallableOptions<TSchema, TResult>,
): Promise<TResult> {
  const createRequestId = options.dependencies?.createRequestId ?? randomUUID;
  const nowMs = options.dependencies?.nowMs ?? Date.now;
  const logger = options.dependencies?.logger ?? productionSafeLogger;
  const requestId = createRequestId();
  const startedAt = nowMs();
  const authPresent = options.request.auth !== undefined;
  const appCheckPresent = options.request.app !== undefined;

  logger.write({
    event: "callable_start",
    functionName: options.functionName,
    requestId,
    outcome: "started",
    authPresent,
    appCheckPresent,
  });

  try {
    const uid = requireAuthenticatedUid(options.request);
    requireAppCheck(options.request);
    const data = parseInput(options.inputSchema, options.request.data);
    const result = await options.handler({
      data,
      uid,
      requestId,
    });

    logger.write({
      event: "callable_success",
      functionName: options.functionName,
      requestId,
      outcome: "success",
      durationMs: nowMs() - startedAt,
      authPresent,
      appCheckPresent,
    });

    return result;
  } catch (error) {
    const appError = normalizeAppError(error);

    logger.write({
      event: "callable_failure",
      functionName: options.functionName,
      requestId,
      outcome: "failure",
      applicationErrorCode: appError.appCode,
      durationMs: nowMs() - startedAt,
      authPresent,
      appCheckPresent,
    });

    throw toHttpsError(appError, requestId);
  }
}

export function throwAppError(code: AppError["appCode"]): never {
  throw new AppError(code);
}
