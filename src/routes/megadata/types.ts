import { z } from 'zod';

export const CreateMegadataCollectionSchema = z.object({
  name: z.string(),
  account_id: z.string(),
  modules: z.array(z.string()),
});

export type CreateMegadataCollectionRequest = z.infer<typeof CreateMegadataCollectionSchema>;

export const UpdateMegadataCollectionSchema = z.object({
  name: z.string(),
  modules: z.array(z.string()),
});

export type UpdateMegadataCollectionRequest = z.infer<typeof UpdateMegadataCollectionSchema>;

export const MegadataCollectionResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  account_id: z.string(),
  is_published: z.boolean(),
  created_at: z.number(),
  updated_at: z.number(),
  modules: z.array(z.string()),
});

export type MegadataCollectionResponse = z.infer<typeof MegadataCollectionResponseSchema>;

export const CreateMegadataTokenSchema = z.object({
  id: z.string(),
  data: z.record(z.any()),
});

export type CreateMegadataTokenRequest = z.infer<typeof CreateMegadataTokenSchema>;

export const UpdateMegadataTokenSchema = z.object({
  data: z.record(z.any()),
});

export type UpdateMegadataTokenRequest = z.infer<typeof UpdateMegadataTokenSchema>;

export const MegadataTokenResponseSchema = z.object({
  id: z.string(),
  collection_id: z.number(),
  data: z.record(z.any()),
  is_published: z.boolean(),
  created_at: z.number(),
  updated_at: z.number(),
});

export type MegadataTokenResponse = z.infer<typeof MegadataTokenResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.string()
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const SuccessResponseSchema = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
