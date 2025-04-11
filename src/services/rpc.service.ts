import { ok, err, ResultAsync } from "neverthrow";
import type { Error } from "../types/error";
import { ethers } from "ethers";
import { getRandomRpcUrl } from "../config/rpc";

// ABI for ERC721/Enumerable functions we need
const erc721EnumerableAbi = [
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
];

// Placeholder service for interacting with external RPCs
export class RpcService {
  private static provider: ethers.JsonRpcProvider | null = null;

  private static getProvider(source: string): ethers.JsonRpcProvider {
    if (!this.provider) {
      const rpcUrl = getRandomRpcUrl(source);
      if (rpcUrl.isErr()) {
        throw new Error("ETH_RPC_URL environment variable is not set");
      }
      this.provider = new ethers.JsonRpcProvider(rpcUrl.value);
    }
    return this.provider;
  }

  /**
   * Gets the name using ERC721 ABI.
   */
  static async getContractName(
    _source: string,
    _type: string,
    contractId: string
  ): Promise<ResultAsync<string, Error>> {
    const source = _source.toLowerCase();
    const type = _type.toLowerCase();
    console.log(`[RpcService] Getting contract name for ${source} ${type} at ${contractId}`);

    if (source === 'ethereum' && type === 'erc721') {
      try {
        const provider = this.getProvider(source);
        const contract = new ethers.Contract(contractId, erc721EnumerableAbi, provider);

        if (typeof contract.name !== 'function') {
          return err({
            context: `Contract ${contractId} does not appear to have a name function (ERC721).`,
            status: 400
          });
        }
        const name = await contract.name();
        console.log(`[RpcService] Fetched contract name: ${name}`);
        return ok(name as string);
      } catch (e: any) {
        console.error(`[RpcService] Error fetching contract name for ${contractId}:`, e);
        return err({ context: `RPC Error: ${e.message ?? 'Unknown error'}`, status: 500 });
      }
    }
    console.warn(`[RpcService] Unsupported source/type for getContractName: ${source}/${type}.`);
    return err({ context: "Cannot fetch name for unsupported source/type", status: 400 });
  }

  /**
   * Gets the total supply using ERC721 or ERC721Enumerable ABI.
   */
  static async getTotalSupply(
    _source: string,
    _type: string,
    contractId: string
  ): Promise<ResultAsync<number, Error>> {
    const source = _source.toLowerCase();
    const type = _type.toLowerCase();
    console.log(`[RpcService] Getting total supply for ${source} ${type} at ${contractId}`);

    if (source === 'ethereum' && type === 'erc721') {
      try {
        const provider = this.getProvider(source);
        const contract = new ethers.Contract(contractId, erc721EnumerableAbi, provider);

        if (typeof contract.totalSupply !== 'function') {
          return err({
            context: `Contract ${contractId} does not appear to have a totalSupply function (ERC721/Enumerable).`,
            status: 400
          });
        }

        const supply = await contract.totalSupply();
        const supplyNumber = Number(supply);
        console.log(`[RpcService] Fetched total supply: ${supplyNumber}`);
        return ok(supplyNumber);
      } catch (e: any) {
        console.error(`[RpcService] Error fetching total supply for ${contractId}:`, e);
        return err({ context: `RPC Error: ${e.message ?? 'Unknown error'}`, status: 500 });
      }
    }

    // Fallback
    console.warn(`[RpcService] Unsupported source/type for getTotalSupply: ${source}/${type}. Using placeholder.`);
    return err({ context: "Unsupported source/type", status: 400 });
  }

  /**
   * Gets all token IDs for an external collection.
   * Assumes source=ethereum, type=erc721, and contract implements ERC721Enumerable.
   */
  static async getTokenIds(
    _source: string,
    _type: string,
    contractId: string
  ): Promise<ResultAsync<string[], Error>> {
    const source = _source.toLowerCase();
    const type = _type.toLowerCase();
    console.log(`[RpcService] Getting all token IDs via ERC721Enumerable for ${contractId}`);

    if (source !== 'ethereum' || type !== 'erc721') {
      console.warn(`[RpcService] getTokenIds currently only supports ethereum/erc721. Source/Type: ${source}/${type}`);
      return err({ context: "getTokenIds only supports ethereum/erc721", status: 400 });
    }

    try {
      const provider = this.getProvider(source);
      const contract = new ethers.Contract(contractId, erc721EnumerableAbi, provider);

      // Check required functions exist
      if (typeof contract.totalSupply !== 'function' || typeof contract.tokenByIndex !== 'function') {
        return err({
          context: `Contract ${contractId} does not support ERC721Enumerable (missing totalSupply or tokenByIndex).`,
          status: 400
        });
      }

      const supply = await contract.totalSupply();
      const totalSupply = Number(supply);
      console.log(`[RpcService] Total supply for enumeration: ${totalSupply}`);

      const tokenIds: string[] = [];
      const promises: Promise<ethers.BigNumberish>[] = [];
      for (let i = 0; i < totalSupply; i++) {
        promises.push(contract.tokenByIndex(i));
      }

      // Resolve all promises
      const results = await Promise.all(promises);
      results.forEach(tokenIdBigInt => {
        tokenIds.push(tokenIdBigInt.toString());
      });

      console.log(`[RpcService] Fetched ${tokenIds.length} token IDs via enumeration.`);
      return ok(tokenIds);

    } catch (e: any) {
      console.error(`[RpcService] Error fetching token IDs via enumeration for ${contractId}:`, e);
      return err({ context: `RPC Error during enumeration: ${e.message ?? 'Unknown error'}`, status: 500 });
    }
  }
} 