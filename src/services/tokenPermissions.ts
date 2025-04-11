import { ethers } from 'ethers';
import { getRandomRpcUrl, type RpcSource } from '../config/rpc';

export async function validateTokenPermissions(walletAddress: string, source: string, tokenId: string, contractAddress: string): Promise<boolean> {
  // Get RPC URL for Ethereum
  const rpcUrlResult = getRandomRpcUrl(source.toLowerCase() as RpcSource);
  if (rpcUrlResult.isErr()) {
    throw new Error(`Failed to get RPC URL: ${rpcUrlResult.error.message}`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrlResult.value);

  // Check token ownership
  const contract = new ethers.Contract(
    contractAddress,
    [
      'function ownerOf(uint256 tokenId) view returns (address)',
      'function isApprovedForAll(address owner, address operator) view returns (bool)'
    ],
    provider
  );

  const ownerOfFunction = contract.ownerOf;
  const isApprovedForAllFunction = contract.isApprovedForAll;

  if (!ownerOfFunction || !isApprovedForAllFunction) {
    throw new Error('Contract does not have required functions');
  }

  try {
    const owner = await ownerOfFunction(tokenId);
    if (owner.toLowerCase() === walletAddress.toLowerCase()) {
      return true;
    }

    // Check if the wallet is an approved operator
    const isApproved = await isApprovedForAllFunction(owner, walletAddress);
    return isApproved;
  } catch (error) {
    throw new Error('Token does not exist or is not owned by anyone');
  }
} 