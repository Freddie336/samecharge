const assert = require("node:assert/strict");
const test = require("node:test");
const {
  APP_ERROR_CODES,
} = require("../lib/callable/app-error-code");
const {
  AppError,
  FIREBASE_ERROR_CODE_BY_APP_CODE,
  assertAppErrorMappingsAreExhaustive,
  toHttpsError,
} = require("../lib/callable/app-error");

test("app-error exposes the exact stable SameCharge application code set", () => {
  assert.deepEqual(APP_ERROR_CODES, [
    "unauthenticated",
    "app_check_required",
    "rate_limited",
    "input_invalid",
    "profile_not_eligible",
    "candidate_token_invalid",
    "candidate_token_expired",
    "candidate_token_used",
    "candidate_token_revoked",
    "report_token_invalid",
    "report_token_expired",
    "report_token_used",
    "discovery_limit_reached",
    "match_not_active",
    "messaging_disabled",
    "content_rejected",
    "account_restricted",
    "not_found",
    "already_exists",
    "permission_denied",
    "reauthentication_required",
    "internal",
  ]);
  assert.equal(APP_ERROR_CODES.length, 22);
});

test("app-error maps every application code to an explicit Firebase callable code", () => {
  assert.equal(assertAppErrorMappingsAreExhaustive(), true);
  assert.equal(Object.keys(FIREBASE_ERROR_CODE_BY_APP_CODE).length, APP_ERROR_CODES.length);
  assert.equal(FIREBASE_ERROR_CODE_BY_APP_CODE.unauthenticated, "unauthenticated");
  assert.equal(FIREBASE_ERROR_CODE_BY_APP_CODE.permission_denied, "permission-denied");
  assert.equal(FIREBASE_ERROR_CODE_BY_APP_CODE.input_invalid, "invalid-argument");
  assert.equal(FIREBASE_ERROR_CODE_BY_APP_CODE.not_found, "not-found");
  assert.equal(FIREBASE_ERROR_CODE_BY_APP_CODE.already_exists, "already-exists");
  assert.equal(FIREBASE_ERROR_CODE_BY_APP_CODE.rate_limited, "resource-exhausted");
  assert.equal(FIREBASE_ERROR_CODE_BY_APP_CODE.discovery_limit_reached, "resource-exhausted");
  assert.equal(FIREBASE_ERROR_CODE_BY_APP_CODE.profile_not_eligible, "failed-precondition");
  assert.equal(FIREBASE_ERROR_CODE_BY_APP_CODE.report_token_invalid, "failed-precondition");
  assert.equal(FIREBASE_ERROR_CODE_BY_APP_CODE.reauthentication_required, "unauthenticated");
  assert.equal(FIREBASE_ERROR_CODE_BY_APP_CODE.internal, "internal");
});

test("app-error converts known and unknown failures to safe HttpsError output", () => {
  const known = toHttpsError(new AppError("content_rejected"), "req-known");
  assert.equal(known.code, "failed-precondition");
  assert.equal(known.message, "Request failed.");
  assert.deepEqual(known.details, {
    code: "content_rejected",
    requestId: "req-known",
  });

  const secretMessage = "SECRET_INTERNAL_MESSAGE";
  const secretStack = "SECRET_STACK_MARKER";
  const unknown = new Error(secretMessage);
  unknown.stack = secretStack;
  const converted = toHttpsError(unknown, "req-unknown");

  assert.equal(converted.code, "internal");
  assert.deepEqual(converted.details, {
    code: "internal",
    requestId: "req-unknown",
  });
  assert.equal(JSON.stringify(converted).includes(secretMessage), false);
  assert.equal(JSON.stringify(converted).includes(secretStack), false);
  assert.equal(converted.message.includes(secretMessage), false);
});
