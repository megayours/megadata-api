import { z } from 'zod';

export const CreateAccountSchema = z.object({
  id: z.string(),
  type: z.string(),
});

export type CreateAccountRequest = z.infer<typeof CreateAccountSchema>;

export const AccountResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});

export type AccountResponse = z.infer<typeof AccountResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.string()
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const SuccessResponseSchema = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
