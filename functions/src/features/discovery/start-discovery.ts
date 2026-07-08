import { defineClientCallable } from "../../callable/define-client-callable";
import { startDiscoverySchema } from "./discovery-schema";
import {
  createDefaultStartDiscoveryDependencies,
  startDiscoveryForUid,
} from "./discovery-service";

export const startDiscovery = defineClientCallable({
  name: "startDiscovery",
  inputSchema: startDiscoverySchema,
  handler: (context) => startDiscoveryForUid(
    context.uid,
    context.data,
    createDefaultStartDiscoveryDependencies(),
  ),
});
