import { defineClientCallable } from "../../callable/define-client-callable";
import { completeOnboardingSchema } from "./onboarding-schema";
import {
  completeOnboardingForUid,
  createDefaultCompleteOnboardingDependencies,
} from "./onboarding-service";

export const completeOnboarding = defineClientCallable({
  name: "completeOnboarding",
  inputSchema: completeOnboardingSchema,
  handler: (context) => completeOnboardingForUid(
    context.uid,
    context.data,
    createDefaultCompleteOnboardingDependencies(),
  ),
});
