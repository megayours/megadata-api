import { z } from "zod";

export const ErrorResponseSchema = z.object({
  error: z.string()
});

export const SuccessResponseSchema = z.object({
  success: z.boolean()
}); 