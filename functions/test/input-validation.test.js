const assert = require("node:assert/strict");
const test = require("node:test");
const { executeCallable } = require("../lib/callable/execute-callable");
const { parseInput } = require("../lib/callable/input-validation");
const { MemorySafeLogger } = require("../lib/callable/safe-logger");
const { makeRequest, testSchema } = require("./helpers");

test("input validation returns schema-parsed values for valid input", () => {
  const parsed = parseInput(testSchema, {
    name: "Alice",
    nested: { count: 1 },
  });

  assert.deepEqual(parsed, {
    name: "Alice",
    nested: { count: 1 },
  });
});

test("input validation rejects invalid type, missing field, and malformed nested input", () => {
  assert.throws(() => parseInput(testSchema, { name: 123, nested: { count: 1 } }), /input_invalid/);
  assert.throws(() => parseInput(testSchema, { nested: { count: 1 } }), /input_invalid/);
  assert.throws(() => parseInput(testSchema, { name: "Alice", nested: { count: "x" } }), /input_invalid/);
});

test("input validation prevents handler execution and hides invalid raw values", async () => {
  const logger = new MemorySafeLogger();
  let called = false;
  const invalidMarker = "INVALID_RAW_VALUE_MARKER";

  await assert.rejects(
    () => executeCallable({
      functionName: "validationTest",
      inputSchema: testSchema,
      request: makeRequest({ name: invalidMarker, nested: { count: "not-number" } }),
      dependencies: {
        createRequestId: () => "validation-req",
        nowMs: () => 100,
        logger,
      },
      handler: () => {
        called = true;
        return {};
      },
    }),
    (error) => {
      assert.equal(error.code, "invalid-argument");
      assert.deepEqual(error.details, {
        code: "input_invalid",
        requestId: "validation-req",
      });
      assert.equal(JSON.stringify(error).includes(invalidMarker), false);
      return true;
    }
  );

  assert.equal(called, false);
  assert.equal(JSON.stringify(logger.events).includes(invalidMarker), false);
});
