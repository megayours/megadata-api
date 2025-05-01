import { ResultAsync } from 'neverthrow';
import { ethers } from 'ethers';
import type { Module, ValidationResult } from './types';
import { BaseValidator } from './base-validator';
import { ADMIN_LIST } from '../../config/admin';
import erc721Abi from '../../utils/abi/erc721.json';
import { SPECIAL_MODULES } from '../../utils/constants';
import { RpcService } from '../rpc.service';

export class ExtendingCollectionValidator extends BaseValidator {
  validate(
    module: Module,
    tokenId: string,
    metadata: Record<string, unknown>,
    accounts: string[],
    modules: Module[],
    isInternalApiKey: boolean
  ): ResultAsync<ValidationResult, Error> {
    return ResultAsync.fromPromise(
      (async () => {
        if (module.type !== SPECIAL_MODULES.EXTENDING_COLLECTION) {
          return this.createErrorResult('Invalid module type');
        }

        // Check if wallet is in admin list
        if (accounts.some(account => ADMIN_LIST.includes(account))) {
          console.log(`Wallet ${accounts} is in admin list`);
          return this.createSuccessResult();
        }

        if (isInternalApiKey) {
          console.log(`Internal API key is used, skipping contract ownership check`);
          return this.createSuccessResult();
        }

        const source = (metadata.source as string).toLowerCase() as string;
        if (!source) {
          console.log(`Source is not provided`);
          return this.createErrorResult('Source is not provided');
        }

        // Get RPC URL for the source
        const provider = RpcService.getProvider(source);

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
        if (accounts.some(account => owner.toLowerCase() === account.toLowerCase())) {
          console.log(`Wallet ${accounts} is the owner of the contract`);
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
            if (accounts.some(account => tokenOwner.toLowerCase() === account.toLowerCase())) {
              console.log(`Wallet ${accounts} is the owner of the token`);
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