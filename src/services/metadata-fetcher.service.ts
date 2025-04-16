import { ethers } from 'ethers';
import { getRandomRpcUrl } from '../config/rpc';
import { ResultAsync } from 'neverthrow';

export class MetadataFetcherService {
  static fetchMetadata(
    blockchain: string,
    contract: string,
    tokenId: string
  ): ResultAsync<Record<string, unknown>, Error> {
    return ResultAsync.fromPromise(
      (async () => {
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
        console.log(`[MetadataFetcherService] Fetched tokenURI: ${tokenURI}`);
        if (!tokenURI) {
          throw new Error('Failed to get tokenURI');
        }

        // Handle base64-encoded data URI
        const base64Prefix = 'data:application/json;base64,';
        if (tokenURI.startsWith(base64Prefix)) {
          const base64Data = tokenURI.slice(base64Prefix.length);
          const jsonStr = Buffer.from(base64Data, 'base64').toString('utf-8');
          const metadata = JSON.parse(jsonStr) as Record<string, unknown>;
          return { ...metadata, uri: tokenURI, source: blockchain, id: contract };
        }

        const metadataUrl = `${process.env.NEXT_PUBLIC_MEGADATA_API_URI}/ext/${tokenURI}`;
        console.log(`[MetadataFetcherService] Fetching metadata from ${metadataUrl}`);
        const response = await fetch(metadataUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }

        const metadata = (await response.json()) as Record<string, unknown>;
        return { ...metadata, uri: tokenURI, source: blockchain, id: contract };
      })(),
      (error) => error instanceof Error ? error : new Error(String(error))
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