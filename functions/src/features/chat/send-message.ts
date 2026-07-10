import { defineClientCallable } from "../../callable/define-client-callable";
import { sendMessageSchema } from "./chat-schema";
import {
  createDefaultChatDependencies,
  sendMessageForUid,
} from "./chat-service";

export const sendMessage = defineClientCallable({
  name: "sendMessage",
  inputSchema: sendMessageSchema,
  handler: (context) => sendMessageForUid(
    context.uid,
    context.data,
    createDefaultChatDependencies(),
  ),
});
