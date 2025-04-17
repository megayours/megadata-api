import { ResultAsync } from 'neverthrow';
import type { Module, ModuleValidator, ValidationResult } from './types';

export abstract class BaseValidator implements ModuleValidator {
  abstract validate(
    module: Module,
    tokenId: string,
    metadata: Record<string, unknown>,
    accounts: string[]
  ): ResultAsync<ValidationResult, Error>;

  protected createSuccessResult(): ValidationResult {
    return { isValid: true };
  }

  protected createErrorResult(error: string): ValidationResult {
    return { isValid: false, error };
  }
} 