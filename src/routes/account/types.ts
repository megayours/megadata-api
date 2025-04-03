import { t } from "elysia";

export const CreateAccountRequest = t.Object({
  id: t.String(),
  type: t.String(),
});

export const AccountResponse = t.Object({
  id: t.String(),
  type: t.String(),
  created_at: t.Date(),
  updated_at: t.Date(),
});
