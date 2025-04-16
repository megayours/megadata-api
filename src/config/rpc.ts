import { tokenConfig, type RpcConfig } from './token-config';


export function getRpcConfig(source: string): RpcConfig {
    const config = tokenConfig[source.toLowerCase()];

  if (!config) {
    throw new Error(`No config found for source: ${source}`);
  }

  if (!config.rpc.urls.length) {
    throw new Error(`No RPC URLs configured for source: ${source}`);
  }

  return config.rpc;
}

export function getRandomRpcUrl(source: string): string {
  const config = getRpcConfig(source);
  const urls = config.urls;
  if (!urls.length) {
    throw new Error(`No RPC URLs available for source: ${source}`);
  }
  return urls[Math.floor(Math.random() * urls.length)] as string;
}