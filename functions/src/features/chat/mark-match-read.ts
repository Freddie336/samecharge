import { defineClientCallable } from "../../callable/define-client-callable";
import { markMatchReadSchema } from "./chat-schema";
import {
  createDefaultChatDependencies,
  markMatchReadForUid,
} from "./chat-service";

export const markMatchRead = defineClientCallable({
  name: "markMatchRead",
  inputSchema: markMatchReadSchema,
  handler: (context) => markMatchReadForUid(
    context.uid,
    context.data,
    createDefaultChatDependencies(),
  ),
});
