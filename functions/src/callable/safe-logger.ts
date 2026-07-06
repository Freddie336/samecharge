import * as functionsLogger from "firebase-functions/logger";
import { AppErrorCode } from "./app-error-code";

export type SafeLogEvent = "callable_start" | "callable_success" | "callable_failure";
export type SafeLogOutcome = "started" | "success" | "failure";

export interface SafeLogFields {
  event: SafeLogEvent;
  functionName: string;
  requestId: string;
  outcome: SafeLogOutcome;
  applicationErrorCode?: AppErrorCode;
  durationMs?: number;
  authPresent?: boolean;
  appCheckPresent?: boolean;
}

export interface SafeLogger {
  write(fields: SafeLogFields): void;
}

export class FirebaseSafeLogger implements SafeLogger {
  write(fields: SafeLogFields): void {
    const severity = fields.outcome === "failure" ? "ERROR" : "INFO";
    functionsLogger.write({
      severity,
      message: fields.event,
      event: fields.event,
      functionName: fields.functionName,
      requestId: fields.requestId,
      outcome: fields.outcome,
      applicationErrorCode: fields.applicationErrorCode,
      durationMs: fields.durationMs,
      authPresent: fields.authPresent,
      appCheckPresent: fields.appCheckPresent,
    });
  }
}

export class MemorySafeLogger implements SafeLogger {
  readonly events: SafeLogFields[] = [];

  write(fields: SafeLogFields): void {
    this.events.push({ ...fields });
  }
}

export const productionSafeLogger = new FirebaseSafeLogger();
