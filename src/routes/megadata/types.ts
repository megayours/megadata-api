import { z } from 'zod';

export const CreateMegadataCollectionSchema = z.object({
  name: z.string(),
  account_id: z.string(),
  modules: z.array(z.string()),
});

export type CreateMegadataCollectionRequest = z.infer<typeof CreateMegadataCollectionSchema>;

export const UpdateMegadataCollectionSchema = z.object({
  name: z.string(),
});

export type UpdateMegadataCollectionRequest = z.infer<typeof UpdateMegadataCollectionSchema>;

export const MegadataCollectionResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  account_id: z.string(),
  is_published: z.boolean(),
  created_at: z.number(),
  updated_at: z.number(),
  type: z.string(),
  modules: z.array(z.string()),
});

export type MegadataCollectionResponse = z.infer<typeof MegadataCollectionResponseSchema>;

export const CreateMegadataTokenSchema = z.object({
  id: z.string(),
  modules: z.array(z.string()),
  data: z.record(z.any()),
});

export const CreateMegadataTokensSchema = z.array(CreateMegadataTokenSchema);

export type CreateMegadataTokenRequest = z.infer<typeof CreateMegadataTokenSchema>;
export type CreateMegadataTokensRequest = z.infer<typeof CreateMegadataTokensSchema>;

export const UpdateMegadataTokenSchema = z.object({
  data: z.record(z.any()),
  modules: z.array(z.string()),
});

export type UpdateMegadataTokenRequest = z.infer<typeof UpdateMegadataTokenSchema>;

export const MegadataTokenResponseSchema = z.object({
  id: z.string(),
  collection_id: z.number(),
  data: z.record(z.any()),
  is_published: z.boolean(),
  created_at: z.number(),
  updated_at: z.number(),
  modules: z.array(z.string()),
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

// **** External Collections ****

export const CreateExternalCollectionSchema = z.object({
  source: z.string(), // e.g., 'ethereum'
  id: z.string(), // e.g., contract address
  type: z.string(), // e.g., 'erc721'
});

export type CreateExternalCollectionRequest = z.infer<typeof CreateExternalCollectionSchema>;

export const ExternalCollectionDetailsSchema = z.object({
  source: z.string(),
  id: z.string(),
  type: z.string(),
  last_checked: z.number().nullable(), // Store as seconds timestamp, allow null
});

export const ExternalCollectionResponseSchema = MegadataCollectionResponseSchema.extend({
  type: z.string(),
  external_details: ExternalCollectionDetailsSchema,
});

export type ExternalCollectionResponse = z.infer<typeof ExternalCollectionResponseSchema>;
