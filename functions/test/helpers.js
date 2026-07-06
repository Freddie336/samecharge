const { z } = require("zod/v3");

const testSchema = z.object({
  name: z.string().min(1),
  nested: z.object({
    count: z.number().int(),
  }),
});

function makeRequest(data, overrides = {}) {
  const hasAuthOverride = Object.prototype.hasOwnProperty.call(overrides, "auth");
  const hasAppOverride = Object.prototype.hasOwnProperty.call(overrides, "app");

  return {
    data,
    auth: hasAuthOverride ? overrides.auth : {
      uid: "auth-alice",
      token: { email: "alice@example.invalid", secretClaim: "RAW_TOKEN_MARKER" },
      rawToken: "RAW_ID_TOKEN_MARKER",
    },
    app: hasAppOverride ? overrides.app : {
      appId: "app-123",
      token: { sub: "RAW_APP_CHECK_TOKEN_MARKER" },
    },
    rawRequest: { headers: { authorization: "SECRET_HEADER_MARKER" } },
    acceptsStreaming: false,
  };
}

module.exports = {
  makeRequest,
  testSchema,
};
