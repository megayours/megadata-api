import type { Context } from "hono";

export const getWalletAddress = (c: Context) => {
  return c.get('walletAddress');
};
