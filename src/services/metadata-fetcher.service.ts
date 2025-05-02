import { ethers } from 'ethers';

import type { JsonRpcProvider } from 'ethers';

export class MetadataFetcherService {
  static async fetchMetadata(tokenUri: string): Promise<Record<string, unknown>> {
    // Handle base64-encoded data URI
    const base64Prefix = 'data:application/json;base64,';
    if (tokenUri.startsWith(base64Prefix)) {
      const base64Data = tokenUri.slice(base64Prefix.length);
      const jsonStr = Buffer.from(base64Data, 'base64').toString('utf-8');
      const metadata = JSON.parse(jsonStr) as Record<string, unknown>;
      return { ...metadata, uri: tokenUri };
    }

    const metadataUrl = `${process.env.NEXT_PUBLIC_MEGADATA_API_URI}/ext/${tokenUri}`;
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const metadata = (await response.json()) as Record<string, unknown>;
    return { ...metadata, uri: tokenUri };
  }
}

export type ContractCapabilities = {
  supportsERC721: boolean;
  supportsERC721Enumerable: boolean;
  supportsERC721Metadata: boolean;
  hasTokenURI: boolean;
  hasName: boolean;
  hasTotalSupply: boolean;
  hasTokenByIndex: boolean;
};

/**
 * Detects which ERC721/Enumerable/Metadata functions and interfaces a contract supports.
 * Uses ERC165 if available, otherwise falls back to try-call pattern.
 */
export async function detectContractCapabilities(
  provider: JsonRpcProvider,
  contractAddress: string
): Promise<ContractCapabilities> {
  const erc165Abi = [
    "function supportsInterface(bytes4 interfaceId) view returns (bool)"
  ];
  const contract = new ethers.Contract(contractAddress, erc165Abi, provider);

  let supportsERC721 = false;
  let supportsERC721Enumerable = false;
  let supportsERC721Metadata = false;

  // Try ERC165 detection, but only if supportsInterface exists
  if (typeof contract.supportsInterface === 'function') {
    try {
      supportsERC721 = await contract.supportsInterface("0x80ac58cd");
      supportsERC721Enumerable = await contract.supportsInterface("0x780e9d63");
      supportsERC721Metadata = await contract.supportsInterface("0x5b5e139f");
    } catch {
      // Not ERC165, fallback to try-call
    }
  }

  // Fallback: Try to call functions directly
  const testAbi = [
    "function tokenURI(uint256) view returns (string)",
    "function name() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function tokenByIndex(uint256) view returns (uint256)"
  ];
  const testContract = new ethers.Contract(contractAddress, testAbi, provider);

  // Use 'as any' to dynamically check for function existence and call callStatic
  async function hasFunction(fn: string, ...args: any[]): Promise<boolean> {
    const contractAny = testContract as any;
    if (!contractAny.callStatic || typeof contractAny.callStatic[fn] !== 'function') {
      return false;
    }
    try {
      await contractAny.callStatic[fn](...args);
      return true;
    } catch {
      return false;
    }
  }

  const hasTokenURI = await hasFunction("tokenURI", 0);
  const hasName = await hasFunction("name");
  const hasTotalSupply = await hasFunction("totalSupply");
  const hasTokenByIndex = await hasFunction("tokenByIndex", 0);

  return {
    supportsERC721,
    supportsERC721Enumerable,
    supportsERC721Metadata,
    hasTokenURI,
    hasName,
    hasTotalSupply,
    hasTokenByIndex
  };
}

export type ContractFetchers = {
  fetchName: (() => Promise<string>) | null;
  fetchTokenURI: ((tokenId: string | number) => Promise<string>) | null;
  fetchTotalSupply: (() => Promise<number>) | null;
  fetchTokenByIndex: ((index: number) => Promise<string>) | null;
};

export async function getContractFetchers(
  provider: JsonRpcProvider,
  contractAddress: string
): Promise<ContractFetchers> {
  const abi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function tokenURI(uint256) view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function tokenByIndex(uint256) view returns (uint256)",
    "function supportsInterface(bytes4 interfaceId) view returns (bool)",
  ];
  const contract = new ethers.Contract(contractAddress, abi, provider);

  // ERC165 interface detection
  let supportsMetadata = false;
  try {
    if (typeof contract.supportsInterface === "function") {
      supportsMetadata = await contract.supportsInterface("0x5b5e139f");
    }
  } catch {
    // Not ERC165 or call failed
  }

  // For name, symbol, totalSupply: try to call, return null if fails
  async function safeCall<T>(fnName: string, call: (...args: any[]) => Promise<T>): Promise<((...args: any[]) => Promise<T>) | null> {
    const fn = (contract as any)[fnName];
    if (typeof fn !== 'function') return null;
    try {
      await call();
      return call;
    } catch {
      return null;
    }
  }

  const fetchName = await safeCall<string>('name', () => (contract as any).name());
  const fetchTotalSupply = await safeCall<number>('totalSupply', () => (contract as any).totalSupply().then(Number));
  const fetchTokenByIndex = await safeCall<string>('tokenByIndex', (tokenId: string) => (contract as any).tokenByIndex(tokenId).then((id: any) => id.toString()));

  // For tokenURI and tokenByIndex, always return a lambda, but check typeof before calling
  const fetchTokenURI = (typeof (contract as any).tokenURI === 'function')
    ? async (tokenId?: string | number) => {
        if (fetchTokenByIndex) {
          try {
            const firstTokenId = await fetchTokenByIndex("0");
            return (contract as any).tokenURI(firstTokenId);
          } catch {
            // Fallback to tokenId 0 if fetchTokenByIndex fails
            return (contract as any).tokenURI(tokenId ?? 0);
          }
        }
        return (contract as any).tokenURI(tokenId ?? 0);
      }
    : null;

  return {
    fetchName,
    fetchTokenURI: supportsMetadata ? fetchTokenURI : null,
    fetchTotalSupply,
    fetchTokenByIndex,
  };
} 