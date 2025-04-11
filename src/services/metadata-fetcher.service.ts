import { ResultAsync } from 'neverthrow';
import { ethers } from 'ethers';
import { getRandomRpcUrl } from '../config/rpc';

export class MetadataFetcherService {
  static async fetchMetadata(blockchain: string, contract: string, tokenId: string): Promise<ResultAsync<Record<string, unknown>, Error>> {
    return ResultAsync.fromPromise(
      (async () => {
        // Get RPC URL for the source
        const rpcUrlResult = await getRandomRpcUrl(blockchain);
        if (rpcUrlResult.isErr()) {
          throw new Error(`Failed to get RPC URL: ${rpcUrlResult.error.message}`);
        }

        const provider = new ethers.JsonRpcProvider(rpcUrlResult.value);

        // Create contract instance with tokenURI function
        const contractInstance = new ethers.Contract(
          contract,
          ['function tokenURI(uint256 tokenId) view returns (string)'],
          provider
        );

        // Get tokenURI
        const tokenURIFunction = contractInstance.tokenURI;
        if (!tokenURIFunction) {
          throw new Error('Contract does not have tokenURI function');
        }

        const tokenURI = await tokenURIFunction(tokenId);
        if (!tokenURI) {
          throw new Error('Failed to get tokenURI');
        }

        // Handle IPFS URLs
        const metadataUrl = `${process.env.NEXT_PUBLIC_MEGADATA_API_URI}/ext/${tokenURI}`;

        // Fetch metadata from the URL
        const response = await fetch(metadataUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }

        const metadata = (await response.json()) as Record<string, unknown>;
        return { ...metadata, uri: tokenURI, source: blockchain, id: contract };
      })(),
      (error) => new Error(`Failed to fetch metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    );
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