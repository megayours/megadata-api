const ERC721_TOKEN_TYPE = {
  name: "ERC721",
  type: "erc721",
}

export const tokenConfig: TokenConfig = {
  ethereum: {
    rpc: {
      urls: (process.env.ETHEREUM_RPC_URLS || '').split(',').filter(Boolean),
      timeout: Number(process.env.ETHEREUM_RPC_TIMEOUT) || 5000,
      retries: Number(process.env.ETHEREUM_RPC_RETRIES) || 3
    },
    token_types: [
      ERC721_TOKEN_TYPE,
    ]
  },
  bsc: {
    rpc: {
      urls: (process.env.BSC_RPC_URLS || '').split(',').filter(Boolean),
      timeout: Number(process.env.BSC_RPC_TIMEOUT) || 5000,
      retries: Number(process.env.BSC_RPC_RETRIES) || 3
    },
    token_types: [
      ERC721_TOKEN_TYPE,
    ]
  },
  polygon: {
    rpc: {
      urls: (process.env.POLYGON_RPC_URLS || '').split(',').filter(Boolean),
      timeout: Number(process.env.POLYGON_RPC_TIMEOUT) || 5000,
      retries: Number(process.env.POLYGON_RPC_RETRIES) || 3
    },
    token_types: [
      ERC721_TOKEN_TYPE,
    ]
  },
  base: {
    rpc: {
      urls: (process.env.BASE_RPC_URLS || '').split(',').filter(Boolean),
      timeout: Number(process.env.BASE_RPC_TIMEOUT) || 5000,
      retries: Number(process.env.BASE_RPC_RETRIES) || 3
    },
    token_types: [
      ERC721_TOKEN_TYPE,
    ]
  },
  arbitrum: {
    rpc: {
      urls: (process.env.ARBITRUM_RPC_URLS || '').split(',').filter(Boolean),
      timeout: Number(process.env.ARBITRUM_RPC_TIMEOUT) || 5000,
      retries: Number(process.env.ARBITRUM_RPC_RETRIES) || 3
    },
    token_types: [
      ERC721_TOKEN_TYPE,
    ]
  }
}

export type TokenConfig = {
  [key: string]: {
    rpc: RpcConfig;
    token_types: TokenTypeConfig[];
  };
}

export type RpcConfig = {
  urls: string[];
  timeout?: number;
  retries?: number;
}

export type TokenTypeConfig = {
  name: string;
  type: string;
}
