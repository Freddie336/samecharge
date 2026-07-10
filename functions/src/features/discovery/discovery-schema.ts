import { z } from "zod/v3";

export const startDiscoverySchema = z.object({
  requestedRange: z.union([z.literal(0), z.literal(1), z.literal(3)]),
  pageSize: z.number().int().min(1).max(10),
}).strict();

export const submitDiscoveryDecisionSchema = z.object({
  candidateToken: z.string().min(32).max(256),
  decision: z.union([z.literal("like"), z.literal("pass")]),
}).strict();
