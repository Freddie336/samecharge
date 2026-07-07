import { CallableOptions } from "firebase-functions/v2/https";

export const secureClientCallableOptions: Readonly<CallableOptions<unknown>> = Object.freeze({
  enforceAppCheck: true,
  region: "europe-west1",
});

export function getSecureClientCallableOptions(): CallableOptions<unknown> {
  return { ...secureClientCallableOptions };
}
