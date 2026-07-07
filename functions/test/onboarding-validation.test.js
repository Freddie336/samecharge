const assert = require("node:assert/strict");
const test = require("node:test");
const { AppError } = require("../lib/callable/app-error");
const { parseInput } = require("../lib/callable/input-validation");
const { validateAdultBirthDate } = require("../lib/features/onboarding/age-validation");
const { createConsentRecordId } = require("../lib/features/onboarding/consent-record-id");
const { completeOnboardingSchema } = require("../lib/features/onboarding/onboarding-schema");
const { validOnboardingInput } = require("./onboarding-test-helpers");

function parse(input) {
  return parseInput(completeOnboardingSchema, input);
}

function assertInputInvalid(input) {
  assert.throws(() => parse(input), (error) => {
    assert.equal(error instanceof AppError, true);
    assert.equal(error.appCode, "input_invalid");
    return true;
  });
}

test("onboarding schema normalizes displayName and bio according to the locked contract", () => {
  const decomposed = "C\u0327ag\u0306la";
  const parsed = parse(validOnboardingInput({
    displayName: `  ${decomposed}    Oz   `,
    bio: "  Merhaba\nDunya  ",
  }));

  assert.equal(parsed.displayName, "Çağla Oz");
  assert.equal(parsed.bio, "Merhaba\nDunya");
});

test("onboarding schema keeps Turkish and international display names without ASCII-only filtering", () => {
  const parsed = parse(validOnboardingInput({ displayName: "İpek Öz-Лena O'Neil." }));
  assert.equal(parsed.displayName, "İpek Öz-Лena O'Neil.");
});

test("onboarding schema counts Unicode code points for displayName boundaries", () => {
  assert.equal(parse(validOnboardingInput({ displayName: "A🙂" })).displayName, "A🙂");
  assert.equal(parse(validOnboardingInput({ displayName: "a".repeat(30) })).displayName.length, 30);
  assertInputInvalid(validOnboardingInput({ displayName: "a" }));
  assertInputInvalid(validOnboardingInput({ displayName: "a".repeat(31) }));
  assertInputInvalid(validOnboardingInput({ displayName: "  \t  " }));
});

test("onboarding schema rejects displayName and bio control or bidi control characters", () => {
  assertInputInvalid(validOnboardingInput({ displayName: "Ada\nLovelace" }));
  assertInputInvalid(validOnboardingInput({ displayName: "Ada\u202e" }));
  assertInputInvalid(validOnboardingInput({ bio: "Merhaba\u0001" }));
  assertInputInvalid(validOnboardingInput({ bio: "Merhaba\u2066" }));
  assert.equal(parse(validOnboardingInput({ bio: "Line 1\nLine 2" })).bio, "Line 1\nLine 2");
});

test("onboarding schema validates interest IDs without normalization or catalog membership", () => {
  const tenInterests = [
    "music",
    "coffee",
    "live_music",
    "outdoor_sports",
    "books",
    "movies",
    "travel",
    "coding",
    "tea",
    "art",
  ];

  assert.deepEqual(parse(validOnboardingInput({ interests: [] })).interests, []);
  assert.deepEqual(parse(validOnboardingInput({ interests: tenInterests })).interests, tenInterests);
  assert.equal(parse(validOnboardingInput({ interests: ["a".repeat(32)] })).interests[0].length, 32);
  assertInputInvalid(validOnboardingInput({ interests: [...tenInterests, "extra"] }));
  assertInputInvalid(validOnboardingInput({ interests: ["music", "music"] }));
  assertInputInvalid(validOnboardingInput({ interests: ["Live Music"] }));
  assertInputInvalid(validOnboardingInput({ interests: ["live music"] }));
  assertInputInvalid(validOnboardingInput({ interests: ["live-music"] }));
  assertInputInvalid(validOnboardingInput({ interests: ["live/music"] }));
  assertInputInvalid(validOnboardingInput({ interests: [""] }));
  assertInputInvalid(validOnboardingInput({ interests: ["a".repeat(33)] }));
});

test("onboarding schema enforces the closed beta city allowlist exactly", () => {
  assert.equal(parse(validOnboardingInput({ cityId: "istanbul" })).cityId, "istanbul");
  assertInputInvalid(validOnboardingInput({ cityId: "Istanbul" }));
  assertInputInvalid(validOnboardingInput({ cityId: "İstanbul" }));
  assertInputInvalid(validOnboardingInput({ cityId: "istanbul " }));
  assertInputInvalid(validOnboardingInput({ cityId: "ankara" }));
  assertInputInvalid(validOnboardingInput({ cityId: "istan/bul" }));
  assertInputInvalid(validOnboardingInput({ cityId: "is tanbul" }));
});

test("onboarding schema validates consent versions and type behavior", () => {
  for (const version of ["v1", "v1.0", "2026-07-06", "beta_terms_v1"]) {
    assert.equal(parse(validOnboardingInput({
      consentRecords: [
        { type: "terms", version, granted: true },
        { type: "privacy", version: "v1", granted: true },
        { type: "explicit_data", version: "v1", granted: true },
      ],
    })).consentRecords[0].version, version);
  }

  for (const version of ["/terms/v1", "../v1", "V1", "v1/", "", "v 1", "a".repeat(65)]) {
    assertInputInvalid(validOnboardingInput({
      consentRecords: [
        { type: "terms", version, granted: true },
        { type: "privacy", version: "v1", granted: true },
        { type: "explicit_data", version: "v1", granted: true },
      ],
    }));
  }

  assert.doesNotThrow(() => parse(validOnboardingInput({
    consentRecords: [
      { type: "terms", version: "v1", granted: true },
      { type: "privacy", version: "v1", granted: true },
      { type: "explicit_data", version: "v1", granted: true },
    ],
  })));
  assert.doesNotThrow(() => parse(validOnboardingInput({
    consentRecords: [
      { type: "terms", version: "v1", granted: true },
      { type: "privacy", version: "v1", granted: true },
      { type: "explicit_data", version: "v1", granted: true },
      { type: "analytics", version: "v1", granted: false },
      { type: "marketing", version: "v1", granted: false },
    ],
  })));

  assertInputInvalid(validOnboardingInput({
    consentRecords: [
      { type: "terms", version: "v1", granted: true },
      { type: "terms", version: "v2", granted: true },
      { type: "privacy", version: "v1", granted: true },
      { type: "explicit_data", version: "v1", granted: true },
    ],
  }));
  assertInputInvalid(validOnboardingInput({
    consentRecords: [
      { type: "terms", version: "v1", granted: true },
      { type: "privacy", version: "v1", granted: true },
    ],
  }));
  assertInputInvalid(validOnboardingInput({
    consentRecords: [
      { type: "terms", version: "v1", granted: false },
      { type: "privacy", version: "v1", granted: true },
      { type: "explicit_data", version: "v1", granted: true },
    ],
  }));
  assertInputInvalid(validOnboardingInput({
    consentRecords: [
      { type: "terms", version: "v1", granted: true, recordedAt: "client" },
      { type: "privacy", version: "v1", granted: true },
      { type: "explicit_data", version: "v1", granted: true },
    ],
  }));
  assertInputInvalid(validOnboardingInput({
    consentRecords: [
      { type: "terms", version: "v1", granted: true },
      { type: "privacy", version: "v1", granted: true },
      { type: "explicit_data", version: "v1", granted: "true" },
    ],
  }));
});

test("onboarding schema rejects unknown top-level and identity/status fields", () => {
  for (const forbiddenField of [
    "uid",
    "email",
    "createdAt",
    "accountStatus",
    "profileStatus",
    "riskScore",
    "completionScore",
    "photoIds",
    "discoveryEligible",
    "metadata",
  ]) {
    assertInputInvalid(validOnboardingInput({ [forbiddenField]: "attacker" }));
  }
});

test("onboarding schema validates closed enums and preference arrays", () => {
  assert.equal(parse(validOnboardingInput({ selfGender: undefined })).selfGender, "unspecified");
  assert.deepEqual(parse(validOnboardingInput({ shownGenderPreferences: [] })).shownGenderPreferences, []);
  assert.deepEqual(parse(validOnboardingInput({
    shownGenderPreferences: ["male", "female", "nonbinary", "unspecified"],
  })).shownGenderPreferences, ["male", "female", "nonbinary", "unspecified"]);
  assertInputInvalid(validOnboardingInput({ intent: "networking" }));
  assertInputInvalid(validOnboardingInput({ selfGender: "custom" }));
  assertInputInvalid(validOnboardingInput({ shownGenderPreferences: ["male", "male"] }));
  assertInputInvalid(validOnboardingInput({ shownGenderPreferences: ["custom"] }));
});

test("birth-date validation is calendar based and UTC deterministic", () => {
  const current = new Date("2026-03-01T00:00:00.000Z");
  assert.equal(validateAdultBirthDate("2008-03-01", current), "2008-03-01");
  assert.equal(validateAdultBirthDate("2008-02-29", current), "2008-02-29");
  assert.equal(validateAdultBirthDate("2008-02-28", current), "2008-02-28");
  assert.throws(() => validateAdultBirthDate("2008-03-02", current), /input_invalid/);
  assert.throws(() => validateAdultBirthDate("2030-01-01", current), /input_invalid/);
  assert.throws(() => validateAdultBirthDate("2008-02-30", current), /input_invalid/);
  assert.throws(() => validateAdultBirthDate("2008-2-29", current), /input_invalid/);
  assert.throws(() => validateAdultBirthDate("2008-13-01", current), /input_invalid/);
  assert.throws(() => validateAdultBirthDate("2008-00-01", current), /input_invalid/);
  assert.throws(() => validateAdultBirthDate("2008-02-29", new Date("2026-02-28T23:59:59.000Z")), /input_invalid/);
});

test("consent record IDs are deterministic and do not expose raw versions as paths", () => {
  const termsV1 = createConsentRecordId("terms", "v1");
  assert.equal(termsV1, createConsentRecordId("terms", "v1"));
  assert.notEqual(termsV1, createConsentRecordId("privacy", "v1"));
  assert.notEqual(termsV1, createConsentRecordId("terms", "v2"));
  assert.match(termsV1, /^[a-f0-9]{64}$/u);
  assert.equal(termsV1.includes("v1"), false);
});
