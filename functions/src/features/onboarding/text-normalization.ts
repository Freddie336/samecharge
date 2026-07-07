import { z } from "zod/v3";

const BIDI_CONTROL_PATTERN = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;

export function countCodePoints(value: string): number {
  return [...value].length;
}

function hasC0OrC1Control(value: string, allowLineBreaks: boolean): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);

    if (codePoint === undefined) {
      continue;
    }

    if (allowLineBreaks && (codePoint === 10 || codePoint === 13)) {
      continue;
    }

    if ((codePoint >= 0 && codePoint <= 31) || (codePoint >= 127 && codePoint <= 159)) {
      return true;
    }
  }

  return false;
}

function addIssue(context: z.RefinementCtx, message: string): void {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    message,
  });
}

export function normalizeDisplayName(value: string, context: z.RefinementCtx): string {
  const normalized = value.normalize("NFKC").trim();

  if (hasC0OrC1Control(normalized, false)) {
    addIssue(context, "displayName_control_character");
    return z.NEVER;
  }

  if (BIDI_CONTROL_PATTERN.test(normalized)) {
    addIssue(context, "displayName_bidi_control");
    return z.NEVER;
  }

  const canonical = normalized.replace(/\s+/gu, " ");
  const length = countCodePoints(canonical);

  if (length < 2 || length > 30) {
    addIssue(context, "displayName_length");
    return z.NEVER;
  }

  return canonical;
}

export function normalizeBio(value: string, context: z.RefinementCtx): string {
  const canonical = value.normalize("NFKC").trim();

  if (hasC0OrC1Control(canonical, true)) {
    addIssue(context, "bio_control_character");
    return z.NEVER;
  }

  if (BIDI_CONTROL_PATTERN.test(canonical)) {
    addIssue(context, "bio_bidi_control");
    return z.NEVER;
  }

  if (countCodePoints(canonical) > 300) {
    addIssue(context, "bio_length");
    return z.NEVER;
  }

  return canonical;
}
