import { ResultAsync } from 'neverthrow';
import { ValidationError } from './errors';

export function validateDataAgainstSchema(data: unknown, schema: unknown): ResultAsync<boolean, ValidationError> {
  return ResultAsync.fromPromise(
    Promise.resolve().then(() => {
      const errors: string[] = [];

      if (typeof schema !== 'object' || schema === null) {
        throw new ValidationError("Schema must be an object");
      }

      if (typeof data !== 'object' || data === null) {
        throw new ValidationError("Data must be an object");
      }

      // Basic type checking for required fields
      const schemaObj = schema as Record<string, any>;
      const dataObj = data as Record<string, any>;

      if (schemaObj.required) {
        for (const field of schemaObj.required) {
          if (!(field in dataObj)) {
            errors.push(`must have required property '${field}'`);
          }
        }
      }

      // Validate attributes if present
      if (dataObj.attributes && Array.isArray(dataObj.attributes)) {
        for (const attr of dataObj.attributes) {
          if (!attr.trait_type || !attr.value) {
            errors.push("Attribute must have trait_type and value");
          }

          if (attr.display_type === "boost_number" || attr.display_type === "boost_percentage") {
            if (typeof attr.value !== "number") {
              errors.push(`Attribute value for ${attr.trait_type} must be a number when using ${attr.display_type}`);
            }
          }
        }
      }

      if (errors.length > 0) {
        throw new ValidationError(errors.join(", "));
      }

      return true;
    }),
    (error) => new ValidationError(error instanceof Error ? error.message : "Failed to validate data against schema")
  );
} 