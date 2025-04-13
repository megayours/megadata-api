import { z } from "@hono/zod-openapi";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "path";

const envFile = () => {
  if (process.env.NODE_ENV === "test") {
    return ".env.test";
  } else if (process.env.NODE_ENV === "development") {
    return ".env.local";
  }

  return ".env";
};

expand(config({
  path: path.resolve(
    process.cwd(),
    envFile(),
  ),
}));

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  JWT_SECRET: z.string(),
  ETHEREUM_RPC_URLS: z.string().refine(
    (val) => {
      const list = val.split(",");
      return list.every((item) => item.trim() !== "");
    },
    { message: "ETHEREUM_RPC_URLS must be a comma-separated list of URLs" }
  ),
  ABSTRACTION_CHAIN_URL: z.string().refine(
    (val) => {
      const list = val.split(",");
      return list.every((item) => item.trim() !== "");
    },
    { message: "ABSTRACTION_CHAIN_URL must be a comma-separated list of URLs" }
  ),
  ABSTRACTION_CHAIN_RID: z.string(),
  ABSTRACTION_CHAIN_PRIVATE_KEY: z.string(),
  NEXT_PUBLIC_MEGADATA_API_URI: z.string().url(),
  DATABASE_URL: z.string().url(),
  ADMIN_LIST: z.string().refine(
    (val) => {
      const list = val.split(",");
      return list.every((item) => item.trim() !== "");
    },
    { message: "ADMIN_LIST must be a comma-separated list of addresses" }
  ),
});

export type env = z.infer<typeof EnvSchema>;

// eslint-disable-next-line ts/no-redeclare
const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
  console.error("❌ Invalid env:");
  console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export default env!;