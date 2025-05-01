declare module 'hono' {
  interface ContextVariableMap {
    walletAddress: string;
    isInternalApiKey: boolean;
  }
} 