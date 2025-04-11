import { ResultAsync } from 'neverthrow';
import { ethers } from 'ethers';
import type { Module, ValidationResult } from './types';
import { BaseValidator } from './base-validator';
import { getRandomRpcUrl } from '../../config/rpc';
import { ADMIN_LIST } from '../../config/admin';
import erc721Abi from '../../utils/abi/erc721.json';
import { SPECIAL_MODULES } from '../../utils/constants';

export class ExtendingCollectionValidator extends BaseValidator {
  validate(
    module: Module,
    tokenId: string,
    metadata: Record<string, unknown>,
    walletAddress: string
  ): ResultAsync<ValidationResult, Error> {
    return ResultAsync.fromPromise(
      (async () => {
        if (module.type !== SPECIAL_MODULES.EXTENDING_COLLECTION) {
          return this.createErrorResult('Invalid module type');
        }

        // Check if wallet is in admin list
        if (ADMIN_LIST.includes(walletAddress)) {
          console.log(`Wallet ${walletAddress} is in admin list`);
          return this.createSuccessResult();
        }

        const source = (metadata.source as string).toLowerCase() as string;
        if (!source) {
          console.log(`Source is not provided`);
          return this.createErrorResult('Source is not provided');
        }

        // Get RPC URL for the source
        const rpcUrlResult = getRandomRpcUrl(source);
        if (rpcUrlResult.isErr()) {
          console.log(`Failed to get RPC URL: ${rpcUrlResult.error.message}`);
          return this.createErrorResult(`Failed to get RPC URL: ${rpcUrlResult.error.message}`);
        }

        const provider = new ethers.JsonRpcProvider(rpcUrlResult.value);

        const contractAddress = metadata.id as string;
        
        // Try parse tokenId to number, if it's not a number, return error
        const tokenIdNumber = Number(tokenId);
        if (isNaN(tokenIdNumber)) {
          console.log(`Token ID is not a number`);
          return this.createErrorResult('Token ID is not a number');
        }

        // Check contract ownership
        const contract = new ethers.Contract(
          contractAddress,
          erc721Abi,
          provider
        );

        // First check contract ownership
        const ownerFunction = contract.owner;
        if (!ownerFunction) {
          console.log(`Contract does not have an owner function`);
          return this.createErrorResult('Contract does not have an owner function');
        }

        const owner = await ownerFunction();
        if (owner.toLowerCase() === walletAddress.toLowerCase()) {
          console.log(`Wallet ${walletAddress} is the owner of the contract`);
          return this.createSuccessResult();
        }

        // If not contract owner, check token ownership
        if (tokenId) {
          const ownerOfFunction = contract.ownerOf;
          if (!ownerOfFunction) {
            console.log(`Contract does not have an ownerOf function`);
            return this.createErrorResult('Contract does not have an ownerOf function');
          }

          try {
            const tokenOwner = await ownerOfFunction(tokenId);
            if (tokenOwner.toLowerCase() === walletAddress.toLowerCase()) {
              console.log(`Wallet ${walletAddress} is the owner of the token`);
              return this.createSuccessResult();
            }
          } catch (error) {
            console.log(`Token does not exist or is not owned by anyone`);
            return this.createErrorResult('Token does not exist or is not owned by anyone');
          }
        }

        console.log(`Wallet address is not authorized to modify this collection`);
        return this.createErrorResult('Wallet address is not authorized to modify this collection');
      })(),
      (error) => new Error(`Failed to validate extending collection: ${error instanceof Error ? error.message : 'Unknown error'}`)
    );
  }
} 