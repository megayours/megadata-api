import { z } from 'zod';
import { getCollectionTokens, getToken, createToken, updateToken, deleteToken, validateTokenPermissions } from './megadata.routes';
import type { SuccessResponseSchema } from '@/lib/schemas';

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



export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

// **** External Collections ****

export const CreateExternalCollectionSchema = z.object({
  source: z.string(), // e.g., 'ethereum'
  id: z.string(), // e.g., contract address
  type: z.string(), // e.g., 'erc721'
});

export type CreateExternalCollectionRequest = z.infer<typeof CreateExternalCollectionSchema>;
export type GetCollectionTokens = typeof getCollectionTokens;
export type GetToken = typeof getToken;
export type CreateToken = typeof createToken;
export type UpdateToken = typeof updateToken;
export type DeleteToken = typeof deleteToken;
export type ValidateTokenPermissions = typeof validateTokenPermissions;
