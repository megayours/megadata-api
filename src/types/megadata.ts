export type AccountType = "user" | "organization" | "system";

export interface MegadataCollection {
  id: number;
  name: string;
  account_id: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMegadataCollectionRequest {
  name: string;
  account_id: string;
}

export interface MegadataToken {
  collection_id: number;
  token_id: string;
  data: Record<string, any>;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface MegadataTokenRequest {
  token_id: string;
  data: Record<string, any>;
}

export interface ErrorResponse {
  error: string;
}
