import { ResultAsync } from 'neverthrow';
import { ethers } from 'ethers';
import type { Module, ValidationResult } from './types';
import { BaseValidator } from './base-validator';
import { getRandomRpcUrl } from '../../config/rpc';
import { ADMIN_LIST } from '../../config/admin';
import erc721Abi from '../../utils/abi/erc721.json';
import { SPECIAL_MODULES } from '../../utils/constants';

export class ExtendingMetadataValidator extends BaseValidator {
  validate(
    module: Module,
    tokenId: string,
    metadata: Record<string, unknown>,
    walletAddress: string,
    modules: Module[] = []
  ): ResultAsync<ValidationResult, Error> {
    return ResultAsync.fromPromise(
      (async () => {
        if (module.type !== SPECIAL_MODULES.EXTENDING_METADATA) {
          return this.createErrorResult('Invalid module type');
        }

        // Check if extending_collection module is present
        const hasExtendingCollection = modules.some(m => m.type === SPECIAL_MODULES.EXTENDING_COLLECTION);
        if (!hasExtendingCollection) {
          return this.createErrorResult(`${SPECIAL_MODULES.EXTENDING_METADATA} module requires ${SPECIAL_MODULES.EXTENDING_COLLECTION} module to be present`);
        }
        
        // Check if wallet is in admin list
        if (ADMIN_LIST.includes(walletAddress)) {
          return this.createSuccessResult();
        }

        const source = metadata.source as string;
        if (!source) {
          return this.createErrorResult('source is required');
        }

        const contract = metadata.id as string;
        if (!contract) {
          return this.createErrorResult('id is required');
        }

        // Get RPC URL for the source
        const rpcUrlResult = getRandomRpcUrl(source);

        const provider = new ethers.JsonRpcProvider(rpcUrlResult);

        console.log(provider);

        // Check token ownership
        const contractInstance = new ethers.Contract(
          contract,
          erc721Abi,
          provider
        ) as ethers.Contract & { 
          ownerOf: (tokenId: string) => Promise<string>;
          isApprovedForAll: (owner: string, operator: string) => Promise<boolean>;
        };

        try {
          const owner = await contractInstance.ownerOf(tokenId);
          console.log(`Owner: `, owner);
          if (owner.toLowerCase() === walletAddress.toLowerCase()) {
            console.log(`Returning success`)
            return this.createSuccessResult();
          }

          // Check if the wallet is an approved operator
          const isApproved = await contractInstance.isApprovedForAll(owner, walletAddress);
          if (isApproved) {
            return this.createSuccessResult();
          }

          return this.createErrorResult('Wallet address is not authorized to modify this token');
        } catch (error) {
          return this.createErrorResult('Token does not exist or is not owned by anyone');
        }
      })(),
      (error) => new Error(`Failed to validate extending metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    );
  }
} 