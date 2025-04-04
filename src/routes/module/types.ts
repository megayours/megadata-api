import { z } from "zod";
import type { Module } from "../../types/module";

export const ErrorResponseSchema = z.object({
  error: z.string()
});

export const ModuleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  schema: z.record(z.any()),
  created_at: z.number(),
  updated_at: z.number()
});

export const ValidationResponseSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()).optional()
});

export const ValidateRequestSchema = z.record(z.any()); 