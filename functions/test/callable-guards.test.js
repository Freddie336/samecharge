const assert = require("node:assert/strict");
const test = require("node:test");
const { z } = require("zod/v3");
const {
  requireAppCheck,
  requireAuthenticatedUid,
} = require("../lib/callable/callable-guards");
const { executeCallable } = require("../lib/callable/execute-callable");
const { MemorySafeLogger } = require("../lib/callable/safe-logger");
const { makeRequest } = require("./helpers");

test("auth guard rejects missing auth and returns only verified auth UID", () => {
  assert.throws(() => requireAuthenticatedUid({}), /unauthenticated/);
  assert.equal(requireAuthenticatedUid({ auth: { uid: "verified-uid" } }), "verified-uid");
});

test("app check guard rejects missing app context and accepts present app context", () => {
  assert.throws(() => requireAppCheck({}), /app_check_required/);
  assert.doesNotThrow(() => requireAppCheck({ app: { appId: "app-1", token: {} } }));
});

test("auth guard ignores client-submitted UID and handler does not receive token claims", async () => {
  const logger = new MemorySafeLogger();
  let handlerContext;
  const result = await executeCallable({
    functionName: "guardTest",
    inputSchema: z.object({ uid: z.string() }),
    request: makeRequest({ uid: "attacker-uid" }, {
      auth: {
        uid: "verified-uid",
        token: { email: "SECRET_EMAIL_MARKER" },
        rawToken: "SECRET_RAW_TOKEN_MARKER",
      },
    }),
    dependencies: {
      createRequestId: () => "guard-req",
      nowMs: () => 10,
      logger,
    },
    handler: (context) => {
      handlerContext = context;
      return { uid: context.uid };
    },
  });

  assert.deepEqual(result, { uid: "verified-uid" });
  assert.equal(handlerContext.data.uid, "attacker-uid");
  assert.equal(handlerContext.uid, "verified-uid");
  assert.equal("token" in handlerContext, false);
  assert.equal("rawRequest" in handlerContext, false);
  assert.equal(JSON.stringify(logger.events).includes("verified-uid"), false);
  assert.equal(JSON.stringify(logger.events).includes("SECRET_EMAIL_MARKER"), false);
});
