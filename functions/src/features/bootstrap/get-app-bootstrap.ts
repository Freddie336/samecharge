import { defineClientCallable } from "../../callable/define-client-callable";
import { getAppBootstrapSchema } from "./bootstrap-schema";
import { createDefaultBootstrapStore, getAppBootstrapForUid } from "./bootstrap-service";

export const getAppBootstrap = defineClientCallable({
  name: "getAppBootstrap",
  inputSchema: getAppBootstrapSchema,
  handler: (context) => getAppBootstrapForUid(context.uid, createDefaultBootstrapStore()),
});
