export type AccountType = "user" | "organization" | "system";

export interface Megadata {
  id: number;
  account_id: string;
  account_type: AccountType;
  data: Record<string, any>;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
