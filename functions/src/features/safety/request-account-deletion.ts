import { defineClientCallable } from "../../callable/define-client-callable";
import { requestAccountDeletionSchema } from "./safety-schema";
import {
  createDefaultSafetyDependencies,
  requestAccountDeletionForUid,
} from "./safety-service";

export const requestAccountDeletion = defineClientCallable({
  name: "requestAccountDeletion",
  inputSchema: requestAccountDeletionSchema,
  handler: (context) => requestAccountDeletionForUid(
    context.uid,
    context.data,
    createDefaultSafetyDependencies(),
  ),
});
