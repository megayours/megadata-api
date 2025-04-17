import { ethers } from "ethers";
import { getRandomRpcUrl } from "../config/rpc";
import { ApiError } from "@/utils/errors";

// ABI for ERC721/Enumerable functions we need
const erc721EnumerableAbi = [
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
];

// Placeholder service for interacting with external RPCs
export class RpcService {
  private static providers: Record<string, ethers.JsonRpcProvider> = {};

  public static getProvider(source: string): ethers.JsonRpcProvider {
    if (!this.providers[source]) {
      const rpcUrl = getRandomRpcUrl(source);
      console.log(`[RpcService] Creating new provider for ${source} at ${JSON.stringify(rpcUrl)}`);
      this.providers[source] = new ethers.JsonRpcProvider(rpcUrl);
    }
    return this.providers[source];
  }

  /**
   * Gets the name using ERC721 ABI.
   */
  static async getContractName(
    _source: string,
    _type: string,
    contractId: string
  ): Promise<string> {
    const source = _source.toLowerCase();
    const type = _type.toLowerCase();
    console.log(`[RpcService] Getting contract name for ${source} ${type} at ${contractId}`);

    if (type === 'erc721') {
      try {
        const provider = this.getProvider(source);
        const contract = new ethers.Contract(contractId, erc721EnumerableAbi, provider);

        if (typeof contract.name !== 'function') {
          throw new ApiError(`Contract ${contractId} does not appear to have a name function (ERC721).`, 400);
        }
        const name = await contract.name();
        console.log(`[RpcService] Fetched contract name: ${name}`);
        return name as string;
      } catch (e: any) {
        console.error(`[RpcService] Error fetching contract name for ${contractId}:`, e);
        throw new ApiError(`RPC Error: ${e.message ?? 'Unknown error'}`, 500);
      }
    }
    console.warn(`[RpcService] Unsupported source/type for getContractName: ${source}/${type}.`);
    throw new ApiError("Cannot fetch name for unsupported source/type", 400);
  }

  /**
   * Gets the total supply using ERC721 or ERC721Enumerable ABI.
   */
  static async getTotalSupply(
    _source: string,
    _type: string,
    contractId: string
  ): Promise<number> {
    const source = _source.toLowerCase();
    const type = _type.toLowerCase();
    console.log(`[RpcService] Getting total supply for ${source} ${type} at ${contractId}`);

    if (type === 'erc721') {
      try {
        const provider = this.getProvider(source);
        const contract = new ethers.Contract(contractId, erc721EnumerableAbi, provider);

        if (typeof contract.totalSupply !== 'function') {
          throw new ApiError(`Contract ${contractId} does not appear to have a totalSupply function (ERC721/Enumerable).`, 400);
        }

        const supply = await contract.totalSupply();
        const supplyNumber = Number(supply);
        console.log(`[RpcService] Fetched total supply: ${supplyNumber}`);
        return supplyNumber;
      } catch (e: any) {
        console.error(`[RpcService] Error fetching total supply for ${contractId}:`, e);
        throw new ApiError(`RPC Error: ${e.message ?? 'Unknown error'}`, 500);
      }
    }

    // Fallback
    console.warn(`[RpcService] Unsupported source/type for getTotalSupply: ${source}/${type}. Using placeholder.`);
    throw new ApiError("Unsupported source/type", 400);
  }

  /**
   * Gets a batch of token IDs for an external collection using ERC721Enumerable.
   * @param _source Blockchain source (e.g., 'ethereum')
   * @param _type Token type (must be 'erc721')
   * @param contractId Contract address
   * @param startIndex Index to start fetching from (inclusive)
   * @param batchSize Number of token IDs to fetch
   * @returns Promise<string[]>
   */
  static async getTokenIdsBatch(
    _source: string,
    _type: string,
    contractId: string,
    startIndex: number,
    batchSize: number
  ): Promise<string[]> {
    const source = _source.toLowerCase();
    const type = _type.toLowerCase();
    console.log(`[RpcService] Getting token IDs batch via ERC721Enumerable for ${contractId} (start: ${startIndex}, size: ${batchSize})`);

    if (type !== 'erc721') {
      throw new ApiError("getTokenIdsBatch only supports erc721", 400);
    }

    let totalSupply: number = 0;

    try {
      const provider = this.getProvider(source);
      const contract = new ethers.Contract(contractId, erc721EnumerableAbi, provider);

      // Check required functions exist
      if (typeof contract.totalSupply !== 'function' || typeof contract.tokenByIndex !== 'function') {
        throw new ApiError(`Contract ${contractId} does not support ERC721Enumerable (missing totalSupply or tokenByIndex).`, 400);
      }

      const supply = await contract.totalSupply();
      totalSupply = Number(supply);
      console.log(`[RpcService] Total supply for enumeration: ${totalSupply}`);

      const tokenIds: string[] = [];
      for (let i = startIndex; i < Math.min(startIndex + batchSize, totalSupply); i++) {
        console.log(`[RpcService] Fetching token ID ${i} of ${totalSupply}`);
        const tokenId = await contract.tokenByIndex(i);
        console.log(`[RpcService] Fetched token ID: ${tokenId}`);
        tokenIds.push(tokenId.toString());
      }

      console.log(`[RpcService] Fetched ${tokenIds.length} token IDs in batch via enumeration.`);
      return tokenIds;

    } catch (e: any) {
      if (totalSupply === 0) {
        throw new ApiError(`RPC Error during batch enumeration: ${e.message ?? 'Unknown error'}`, 500);
      }

      // Return a list of indexes that failed
      console.warn(`[RpcService] Fallbacking to index enumeration for ${contractId}:`, e);
      const failedIndexes: string[] = [];
      for (let i = startIndex; i < startIndex + batchSize; i++) {
        failedIndexes.push(i.toString());
      }

      return failedIndexes;
    }
  }
} 