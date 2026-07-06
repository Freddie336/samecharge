import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options, including default region to europe-west1
setGlobalOptions({
  region: "europe-west1",
});

// No functions exported yet per specifications
export { };
