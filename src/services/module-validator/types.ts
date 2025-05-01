import { ResultAsync } from 'neverthrow';
import { SPECIAL_MODULES } from '../../utils/constants';

export type ModuleType = typeof SPECIAL_MODULES[keyof typeof SPECIAL_MODULES];

export interface Module {
  type: ModuleType;
  config: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ModuleValidator {
  validate(
    module: Module,
    tokenId: string,
    metadata: Record<string, unknown>,
    accounts: string[],
    modules: Module[],
    isInternalApiKey: boolean
  ): ResultAsync<ValidationResult, Error>;
}
