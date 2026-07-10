import { defineClientCallable } from "../../callable/define-client-callable";
import { unmatchUserSchema } from "./safety-schema";
import {
  createDefaultSafetyDependencies,
  unmatchUserForUid,
} from "./safety-service";

export const unmatchUser = defineClientCallable({
  name: "unmatchUser",
  inputSchema: unmatchUserSchema,
  handler: (context) => unmatchUserForUid(
    context.uid,
    context.data,
    createDefaultSafetyDependencies(),
  ),
});
