import { err, ResultAsync } from 'neverthrow';
import { ethers } from 'ethers';
import { getRandomRpcUrl } from '../config/rpc';

export class MetadataFetcherService {
  static async fetchMetadata(blockchain: string, contract: string, tokenId: string): Promise<Record<string, unknown>> {
    const rpcUrl = getRandomRpcUrl(blockchain);
    if (!rpcUrl) {
      throw new Error(`Failed to get RPC URL: ${rpcUrl}`);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contractInstance = new ethers.Contract(
      contract,
      ['function tokenURI(uint256 tokenId) view returns (string)'],
      provider
    );

    const tokenURIFunction = contractInstance.tokenURI;
    if (!tokenURIFunction) {
      throw new Error('Contract does not have tokenURI function');
    }

    const tokenURI = await tokenURIFunction(tokenId);
    if (!tokenURI) {
          throw new Error('Failed to get tokenURI');
        }

        const metadataUrl = `${process.env.NEXT_PUBLIC_MEGADATA_API_URI}/ext/${tokenURI}`;
        console.log(`Fetching metadata from ${metadataUrl}`);
        const response = await fetch(metadataUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }

        const metadata = (await response.json()) as Record<string, unknown>;
        return { ...metadata, uri: tokenURI, source: blockchain, id: contract };
  }

  static mergeMetadata(
    originalMetadata: Record<string, unknown>,
    fetchedMetadata: Record<string, unknown>
  ): Record<string, unknown> {
    // Create a deep copy of the original metadata
    const merged = JSON.parse(JSON.stringify(originalMetadata));

    // Merge the fetched metadata, overriding any existing fields
    for (const [key, value] of Object.entries(fetchedMetadata)) {
      merged[key] = value;
    }

    return merged;
  }
} 