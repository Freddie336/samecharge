import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { getAppBootstrap } from "./features/bootstrap/get-app-bootstrap";
import { blockUser } from "./features/safety/block-user";
import { markMatchRead } from "./features/chat/mark-match-read";
import { reportContent } from "./features/safety/report-content";
import { requestAccountDeletion } from "./features/safety/request-account-deletion";
import { sendMessage } from "./features/chat/send-message";
import { setMatchMuted } from "./features/chat/set-match-muted";
import { startDiscovery } from "./features/discovery/start-discovery";
import { submitDiscoveryDecision } from "./features/discovery/submit-discovery-decision";
import { completeOnboarding } from "./features/onboarding/complete-onboarding";
import { finalizeProfilePhoto } from "./features/profile-photo/finalize-profile-photo";
import { unmatchUser } from "./features/safety/unmatch-user";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options, including default region to europe-west1
setGlobalOptions({
  region: "europe-west1",
});

export {
  blockUser,
  getAppBootstrap,
  completeOnboarding,
  finalizeProfilePhoto,
  markMatchRead,
  reportContent,
  requestAccountDeletion,
  sendMessage,
  setMatchMuted,
  startDiscovery,
  submitDiscoveryDecision,
  unmatchUser,
};
