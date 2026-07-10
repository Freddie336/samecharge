import { defineClientCallable } from "../../callable/define-client-callable";
import { submitDiscoveryDecisionSchema } from "./discovery-schema";
import {
  createDefaultSubmitDiscoveryDecisionDependencies,
  submitDiscoveryDecisionForUid,
} from "./discovery-service";

export const submitDiscoveryDecision = defineClientCallable({
  name: "submitDiscoveryDecision",
  inputSchema: submitDiscoveryDecisionSchema,
  handler: (context) => submitDiscoveryDecisionForUid(
    context.uid,
    context.data,
    createDefaultSubmitDiscoveryDecisionDependencies(),
  ),
});
