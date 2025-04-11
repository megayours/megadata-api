import { randomUUID } from "crypto";
import { TEST_BYPASS_AUTH_HEADER } from "../middleware/auth";

export const generateRandomAccount = () => ({
  id: `test_account_${randomUUID().slice(0, 8)}`,
  type: `test_type_${randomUUID().slice(0, 8)}`,
});

export const isErrorResponse = (data: any): data is { error: string } => {
  return data && 'error' in data;
};

export const makeTestRequest = (app: any, path: string, options: RequestInit = {}) => {
  const account = generateRandomAccount();
  return app.request(path, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      [TEST_BYPASS_AUTH_HEADER]: account.id
    }
  });
};
