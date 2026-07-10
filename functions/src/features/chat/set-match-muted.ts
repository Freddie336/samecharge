import { defineClientCallable } from "../../callable/define-client-callable";
import { setMatchMutedSchema } from "./chat-schema";
import {
  createDefaultChatDependencies,
  setMatchMutedForUid,
} from "./chat-service";

export const setMatchMuted = defineClientCallable({
  name: "setMatchMuted",
  inputSchema: setMatchMutedSchema,
  handler: (context) => setMatchMutedForUid(
    context.uid,
    context.data,
    createDefaultChatDependencies(),
  ),
});
