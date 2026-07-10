import { z } from "zod/v3";

const matchIdSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const clientMessageIdSchema = z.string()
  .min(8)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/u);

export const sendMessageSchema = z.object({
  matchId: matchIdSchema,
  clientMessageId: clientMessageIdSchema,
  text: z.string().min(1).max(2_000),
}).strict();

export const markMatchReadSchema = z.object({
  matchId: matchIdSchema,
}).strict();

export const setMatchMutedSchema = z.object({
  matchId: matchIdSchema,
  muted: z.boolean(),
}).strict();
