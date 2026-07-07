import { createHash } from "node:crypto";
import { ConsentType } from "./onboarding-types";

export function createConsentRecordId(consentType: ConsentType, version: string): string {
  return createHash("sha256")
    .update(`${consentType}\0${version}`, "utf8")
    .digest("hex");
}
