import { z } from "zod/v3";
import { AppError } from "./app-error";

export function parseInput<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  data: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new AppError("input_invalid", { cause: result.error });
  }

  return result.data;
}
