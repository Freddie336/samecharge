import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { getAppBootstrap } from "./features/bootstrap/get-app-bootstrap";
import { completeOnboarding } from "./features/onboarding/complete-onboarding";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options, including default region to europe-west1
setGlobalOptions({
  region: "europe-west1",
});

export {
  getAppBootstrap,
  completeOnboarding,
};
