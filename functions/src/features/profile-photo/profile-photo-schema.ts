import { z } from "zod/v3";

export const finalizeProfilePhotoSchema = z.object({
  tempFilePath: z.string()
    .min(1)
    .max(160),
}).strict();
