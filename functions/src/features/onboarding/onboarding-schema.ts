import { z } from "zod/v3";
import {
  CONSENT_TYPE_VALUES,
  GENDER_VALUES,
  INTENT_VALUES,
  REQUIRED_CONSENT_TYPES,
} from "./onboarding-types";
import { normalizeBio, normalizeDisplayName } from "./text-normalization";

const INTEREST_ID_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CITY_ID_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/u;
const CONSENT_VERSION_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/u;

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

const interestIdSchema = z.string()
  .min(1)
  .max(32)
  .regex(INTEREST_ID_PATTERN);

const cityIdSchema = z.string()
  .min(2)
  .max(64)
  .regex(CITY_ID_PATTERN)
  .refine((value) => value === "istanbul");

const consentRecordSchema = z.object({
  type: z.enum(CONSENT_TYPE_VALUES),
  version: z.string()
    .min(1)
    .max(64)
    .regex(CONSENT_VERSION_PATTERN),
  granted: z.boolean(),
}).strict();

export const completeOnboardingSchema = z.object({
  displayName: z.string().transform((value, context) => normalizeDisplayName(value, context)),
  birthDate: z.string(),
  cityId: cityIdSchema,
  bio: z.string().transform((value, context) => normalizeBio(value, context)),
  interests: z.array(interestIdSchema)
    .max(10)
    .refine((values) => !hasDuplicates(values)),
  intent: z.enum(INTENT_VALUES),
  selfGender: z.enum(GENDER_VALUES).optional().default("unspecified"),
  shownGenderPreferences: z.array(z.enum(GENDER_VALUES))
    .refine((values) => !hasDuplicates(values)),
  consentRecords: z.array(consentRecordSchema).superRefine((records, context) => {
    const seen = new Set<string>();

    for (const record of records) {
      if (seen.has(record.type)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "duplicate_consent_type",
        });
        return;
      }

      seen.add(record.type);
    }

    for (const requiredType of REQUIRED_CONSENT_TYPES) {
      const record = records.find((candidate) => candidate.type === requiredType);

      if (!record || record.granted !== true) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "required_consent_missing",
        });
        return;
      }
    }
  }),
}).strict();
