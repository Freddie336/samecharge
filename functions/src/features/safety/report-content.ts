import { defineClientCallable } from "../../callable/define-client-callable";
import { reportContentSchema } from "./safety-schema";
import {
  createDefaultSafetyDependencies,
  reportContentForUid,
} from "./safety-service";

export const reportContent = defineClientCallable({
  name: "reportContent",
  inputSchema: reportContentSchema,
  handler: (context) => reportContentForUid(
    context.uid,
    context.data,
    createDefaultSafetyDependencies(),
  ),
});
