const assert = require("node:assert/strict");
const test = require("node:test");
const { AppError } = require("../lib/callable/app-error");
const { executeCallable } = require("../lib/callable/execute-callable");
const { MemorySafeLogger } = require("../lib/callable/safe-logger");
const { makeRequest, testSchema } = require("./helpers");

test("safe logger stores only closed allowlisted fields", () => {
  const logger = new MemorySafeLogger();
  logger.write({
    event: "callable_failure",
    functionName: "loggerTest",
    requestId: "logger-req",
    outcome: "failure",
    applicationErrorCode: "internal",
    durationMs: 5,
    authPresent: true,
    appCheckPresent: true,
  });

  assert.deepEqual(Object.keys(logger.events[0]).sort(), [
    "appCheckPresent",
    "applicationErrorCode",
    "authPresent",
    "durationMs",
    "event",
    "functionName",
    "outcome",
    "requestId",
  ].sort());
});

test("safe logging and HttpsError output omit sensitive marker values", async () => {
  const logger = new MemorySafeLogger();
  const markers = [
    "person@example.invalid",
    "2000-01-02",
    "PRIVATE_MESSAGE_TEXT",
    "https://example.invalid/photo.jpg",
    "CANDIDATE_TOKEN_SECRET",
    "REPORTER_NOTE_SECRET",
    "GENERIC_SECRET_MARKER",
    "UNKNOWN_EXCEPTION_MESSAGE",
    "UNKNOWN_EXCEPTION_STACK",
  ];
  const unknown = new Error(markers[7]);
  unknown.stack = markers[8];

  await assert.rejects(
    () => executeCallable({
      functionName: "redactionTest",
      inputSchema: testSchema,
      request: makeRequest({
        name: "Alice",
        nested: { count: 1 },
        marker: markers[0],
      }),
      dependencies: {
        createRequestId: () => "redaction-req",
        nowMs: () => 200,
        logger,
      },
      handler: () => {
        throw unknown;
      },
    }),
    (error) => {
      const serializedError = JSON.stringify(error);
      for (const marker of markers) {
        assert.equal(serializedError.includes(marker), false);
        assert.equal(error.message.includes(marker), false);
      }
      assert.deepEqual(error.details, {
        code: "internal",
        requestId: "redaction-req",
      });
      return true;
    }
  );

  const serializedLogs = JSON.stringify(logger.events);
  for (const marker of markers) {
    assert.equal(serializedLogs.includes(marker), false);
  }
});

test("known AppError logging records only the stable application code", async () => {
  const logger = new MemorySafeLogger();

  await assert.rejects(() => executeCallable({
    functionName: "knownFailureTest",
    inputSchema: testSchema,
    request: makeRequest({ name: "Alice", nested: { count: 1 } }),
    dependencies: {
      createRequestId: () => "known-req",
      nowMs: () => 300,
      logger,
    },
    handler: () => {
      throw new AppError("permission_denied", { cause: new Error("SECRET_CAUSE_MARKER") });
    },
  }));

  assert.equal(logger.events[1].applicationErrorCode, "permission_denied");
  assert.equal(JSON.stringify(logger.events).includes("SECRET_CAUSE_MARKER"), false);
});
