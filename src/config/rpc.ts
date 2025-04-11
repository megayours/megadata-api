import { Result, err, ok } from 'neverthrow';

export interface RpcConfig {
  urls: string[];
  timeout?: number;
  retries?: number;
}

export interface RpcConfigMap {
  [key: string]: RpcConfig;
}

const defaultRpcConfig: RpcConfig = {
  urls: [],
  timeout: 5000,
  retries: 3
};

// Default configuration that can be overridden by environment variables
export const rpcConfig: RpcConfigMap = {
  ethereum: {
    urls: (process.env.ETHEREUM_RPC_URLS || '').split(',').filter(Boolean),
    timeout: Number(process.env.ETHEREUM_RPC_TIMEOUT) || 5000,
    retries: Number(process.env.ETHEREUM_RPC_RETRIES) || 3
  }
};

export function getRpcConfig(source: string): Result<RpcConfig, Error> {
    const config = rpcConfig[source.toLowerCase()] || defaultRpcConfig;
  
  if (!config.urls.length) {
    return err(new Error(`No RPC URLs configured for source: ${source}`));
  }

  return ok(config);
}

export function getRandomRpcUrl(source: string): Result<string, Error> {
  return getRpcConfig(source).andThen((config) => {
    const urls = config.urls;
    if (!urls.length) {
      return err(new Error(`No RPC URLs available for source: ${source}`));
    }
    return ok(urls[Math.floor(Math.random() * urls.length)] as string);
  });
} 