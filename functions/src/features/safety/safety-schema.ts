import { z } from "zod/v3";

const safeIdSchema = z.string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);
const matchIdSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const reportTokenSchema = z.string()
  .min(8)
  .max(260)
  .regex(/^[A-Za-z0-9:_-]+$/u);
const descriptionSchema = z.string().max(2_000).optional();

export const reportContentSchema = z.object({
  reportToken: reportTokenSchema,
  targetType: z.union([
    z.literal("user"),
    z.literal("match"),
    z.literal("message"),
  ]),
  targetId: safeIdSchema,
  matchId: matchIdSchema.optional(),
  category: z.union([
    z.literal("harassment"),
    z.literal("spam"),
    z.literal("threats"),
    z.literal("hate"),
    z.literal("sexual_content"),
    z.literal("other"),
  ]),
  description: descriptionSchema,
}).strict();

export const blockUserSchema = z.object({
  targetUserId: safeIdSchema,
  matchId: matchIdSchema.optional(),
  reason: z.union([
    z.literal("safety"),
    z.literal("harassment"),
    z.literal("spam"),
    z.literal("other"),
  ]).optional(),
}).strict();

export const unmatchUserSchema = z.object({
  matchId: matchIdSchema,
}).strict();

export const requestAccountDeletionSchema = z.object({
  reauthenticationToken: z.string().min(16).max(512).optional(),
  confirmation: z.literal("DELETE_MY_ACCOUNT"),
}).strict();
