import type { Context } from 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    walletAddress: string;
  }
} 