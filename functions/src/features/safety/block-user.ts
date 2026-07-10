import { defineClientCallable } from "../../callable/define-client-callable";
import { blockUserSchema } from "./safety-schema";
import {
  blockUserForUid,
  createDefaultSafetyDependencies,
} from "./safety-service";

export const blockUser = defineClientCallable({
  name: "blockUser",
  inputSchema: blockUserSchema,
  handler: (context) => blockUserForUid(
    context.uid,
    context.data,
    createDefaultSafetyDependencies(),
  ),
});
