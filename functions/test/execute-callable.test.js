const assert = require("node:assert/strict");
const test = require("node:test");
const { AppError } = require("../lib/callable/app-error");
const { executeCallable } = require("../lib/callable/execute-callable");
const { MemorySafeLogger } = require("../lib/callable/safe-logger");
const { makeRequest, testSchema } = require("./helpers");

function deterministicDependencies(logger) {
  let now = 1000;
  return {
    createRequestId: () => "deterministic-request-id",
    nowMs: () => {
      const value = now;
      now += 25;
      return value;
    },
    logger,
  };
}

test("executeCallable returns handler output and logs start and success", async () => {
  const logger = new MemorySafeLogger();
  let handlerContext;
  const result = await executeCallable({
    functionName: "executeSuccess",
    inputSchema: testSchema,
    request: makeRequest({ name: "Alice", nested: { count: 7 } }),
    dependencies: deterministicDependencies(logger),
    handler: (context) => {
      handlerContext = context;
      return { ok: true, count: context.data.nested.count };
    },
  });

  assert.deepEqual(result, { ok: true, count: 7 });
  assert.equal(handlerContext.uid, "auth-alice");
  assert.equal(handlerContext.requestId, "deterministic-request-id");
  assert.deepEqual(handlerContext.data, { name: "Alice", nested: { count: 7 } });
  assert.equal("rawRequest" in handlerContext, false);
  assert.equal("auth" in handlerContext, false);
  assert.equal(logger.events.length, 2);
  assert.equal(logger.events[0].event, "callable_start");
  assert.equal(logger.events[1].event, "callable_success");
  assert.equal(logger.events[1].durationMs, 25);
});

test("executeCallable maps handler AppError safely and includes request ID", async () => {
  const logger = new MemorySafeLogger();

  await assert.rejects(
    () => executeCallable({
      functionName: "executeAppError",
      inputSchema: testSchema,
      request: makeRequest({ name: "Alice", nested: { count: 1 } }),
      dependencies: deterministicDependencies(logger),
      handler: () => {
        throw new AppError("rate_limited");
      },
    }),
    (error) => {
      assert.equal(error.code, "resource-exhausted");
      assert.deepEqual(error.details, {
        code: "rate_limited",
        requestId: "deterministic-request-id",
      });
      return true;
    }
  );

  assert.equal(logger.events[1].event, "callable_failure");
  assert.equal(logger.events[1].applicationErrorCode, "rate_limited");
  assert.equal(logger.events[1].durationMs, 25);
});

test("executeCallable maps generic handler Error to internal without raw message", async () => {
  const logger = new MemorySafeLogger();
  const secret = "GENERIC_HANDLER_SECRET";

  await assert.rejects(
    () => executeCallable({
      functionName: "executeGenericError",
      inputSchema: testSchema,
      request: makeRequest({ name: "Alice", nested: { count: 1 } }),
      dependencies: deterministicDependencies(logger),
      handler: () => {
        throw new Error(secret);
      },
    }),
    (error) => {
      assert.equal(error.code, "internal");
      assert.deepEqual(error.details, {
        code: "internal",
        requestId: "deterministic-request-id",
      });
      assert.equal(JSON.stringify(error).includes(secret), false);
      return true;
    }
  );

  assert.equal(logger.events[1].applicationErrorCode, "internal");
  assert.equal(JSON.stringify(logger.events).includes(secret), false);
});

test("executeCallable does not invoke handler when auth, App Check, or validation fails", async () => {
  const cases = [
    {
      request: makeRequest({ name: "Alice", nested: { count: 1 } }, { auth: undefined }),
      code: "unauthenticated",
    },
    {
      request: makeRequest({ name: "Alice", nested: { count: 1 } }, { app: undefined }),
      code: "app_check_required",
    },
    {
      request: makeRequest({ name: "Alice", nested: { count: "bad" } }),
      code: "input_invalid",
    },
  ];

  for (const failureCase of cases) {
    const logger = new MemorySafeLogger();
    let called = false;

    await assert.rejects(
      () => executeCallable({
        functionName: "executeRejected",
        inputSchema: testSchema,
        request: failureCase.request,
        dependencies: deterministicDependencies(logger),
        handler: () => {
          called = true;
          return {};
        },
      }),
      (error) => {
        assert.equal(error.details.code, failureCase.code);
        return true;
      }
    );

    assert.equal(called, false);
    assert.equal(logger.events[0].event, "callable_start");
    assert.equal(logger.events[1].event, "callable_failure");
  }
});
