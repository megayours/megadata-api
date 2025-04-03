import { t } from "elysia";

export const MegadataTokenRequest = t.Object({
  data: t.Record(t.String(), t.Any()),
});

export const MegadataCollectionResponse = t.Object({
  id: t.Number(),
  name: t.String(),
  account_id: t.String(),
  is_published: t.Boolean(),
  created_at: t.Date(),
  updated_at: t.Date(),
});

export const CreateMegadataCollectionRequest = t.Object({
  name: t.String(),
  account_id: t.String(),
});

export const UpdateMegadataCollectionRequest = t.Object({
  name: t.Optional(t.String()),
});

export const MegadataTokenResponse = t.Object({
  id: t.Number(),
  collection_id: t.Number(),
  data: t.Record(t.String(), t.Any()),
  is_published: t.Boolean(),
  created_at: t.Date(),
  updated_at: t.Date(),
});
