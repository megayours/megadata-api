import { randomUUID } from "crypto";

export const generateRandomAccount = () => ({
  id: `test_account_${randomUUID().slice(0, 8)}`,
  type: `test_type_${randomUUID().slice(0, 8)}`,
});

export const isErrorResponse = (data: any): data is { error: string } => {
  return data && 'error' in data;
};
