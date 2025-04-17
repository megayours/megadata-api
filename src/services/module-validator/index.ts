import type { Module, ValidationResult } from './types';
import { ExtendingCollectionValidator } from './extending-collection';
import { ExtendingMetadataValidator } from './extending-metadata';
import { ResultAsync } from 'neverthrow';
import { SPECIAL_MODULES } from '../../utils/constants';

export class ModuleValidatorService {
  private validators: Map<string, ExtendingCollectionValidator | ExtendingMetadataValidator>;

  constructor() {
    this.validators = new Map();
    this.validators.set(SPECIAL_MODULES.EXTENDING_COLLECTION, new ExtendingCollectionValidator());
    this.validators.set(SPECIAL_MODULES.EXTENDING_METADATA, new ExtendingMetadataValidator());
  }

  validate(
    modules: Module[],
    tokenId: string,
    metadata: Record<string, unknown>,
    accounts: string[]
  ): ResultAsync<ValidationResult, Error> {
    return ResultAsync.fromPromise(
      (async () => {
        for (const module of modules) {
          const validator = this.validators.get(module.type);
          if (!validator) {
            // Skip validation for unknown module types
            continue;
          }

          try {
            const result = await validator.validate(module, tokenId, metadata, accounts, modules);
            if (result.isErr()) {
              throw result.error;
            }

            if (!result.value.isValid) {
              return result.value;
            }
          } catch (error) {
            throw new Error(`Failed to validate module ${module.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        return { isValid: true };
      })(),
      (error) => error instanceof Error ? error : new Error('Unknown error')
    );
  }
} 