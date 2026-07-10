import { z } from "zod/v3";

export const startDiscoverySchema = z.object({
  requestedRange: z.union([z.literal(0), z.literal(1), z.literal(3)]),
  pageSize: z.number().int().min(1).max(10),
}).strict();
