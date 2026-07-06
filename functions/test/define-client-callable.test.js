const assert = require("node:assert/strict");
const test = require("node:test");
const { defineClientCallable } = require("../lib/callable/define-client-callable");
const {
  getSecureClientCallableOptions,
} = require("../lib/callable/callable-options");
const { MemorySafeLogger } = require("../lib/callable/safe-logger");
const { makeRequest, testSchema } = require("./helpers");

test("secure callable options enforce App Check and do not consume replay tokens", () => {
  const options = getSecureClientCallableOptions();
  assert.equal(options.enforceAppCheck, true);
  assert.equal(options.consumeAppCheckToken, undefined);
});

test("defineClientCallable wraps onCall and runs the secure execution pipeline", async () => {
  const logger = new MemorySafeLogger();
  const callable = defineClientCallable({
    name: "testCallable",
    inputSchema: testSchema,
    dependencies: {
      createRequestId: () => "factory-req",
      nowMs: () => 50,
      logger,
    },
    handler: (context) => ({
      requestId: context.requestId,
      uid: context.uid,
      name: context.data.name,
    }),
  });

  assert.equal(typeof callable.run, "function");

  const result = await callable.run(makeRequest({
    name: "Factory",
    nested: { count: 3 },
  }));

  assert.deepEqual(result, {
    requestId: "factory-req",
    uid: "auth-alice",
    name: "Factory",
  });
  assert.equal(logger.events[0].event, "callable_start");
  assert.equal(logger.events[1].event, "callable_success");
});
