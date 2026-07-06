import { CallableFunction, CallableRequest, onCall } from "firebase-functions/v2/https";
import { z } from "zod/v3";
import { CallableHandler } from "./callable-context";
import { getSecureClientCallableOptions } from "./callable-options";
import { ExecuteCallableDependencies, executeCallable } from "./execute-callable";

export interface DefineClientCallableOptions<TSchema extends z.ZodTypeAny, TResult> {
  name: string;
  inputSchema: TSchema;
  handler: CallableHandler<z.output<TSchema>, TResult>;
  dependencies?: ExecuteCallableDependencies;
}

export function defineClientCallable<TSchema extends z.ZodTypeAny, TResult>(
  options: DefineClientCallableOptions<TSchema, TResult>,
): CallableFunction<unknown, Promise<TResult>> {
  return onCall(getSecureClientCallableOptions(), (request: CallableRequest<unknown>) => executeCallable({
    functionName: options.name,
    inputSchema: options.inputSchema,
    request,
    handler: options.handler,
    dependencies: options.dependencies,
  }));
}
