import { ResultAsync } from 'neverthrow';
import { ValidationError } from './errors';

export function validateDataAgainstSchema(data: unknown, schemas: unknown[]): ResultAsync<Record<string, any>, ValidationError> {
  return ResultAsync.fromPromise(
    Promise.resolve().then(() => {
      // Validate that all schemas are objects
      for (const schema of schemas) {
        if (typeof schema !== 'object' || schema === null) {
          throw new ValidationError("All schemas must be objects");
        }
      }

      if (typeof data !== 'object' || data === null) {
        return {};
      }

      const dataObj = data as Record<string, any>;
      const filteredData: Record<string, any> = {};
      const validFields = new Set<string>();

      // Collect all valid fields from all schemas
      for (const schema of schemas) {
        const schemaObj = schema as Record<string, any>;
        
        // Add required fields to valid fields
        if (schemaObj.required) {
          for (const field of schemaObj.required) {
            validFields.add(field);
          }
        }
      }

      // Copy over fields that are valid in any schema
      for (const field of validFields) {
        if (field in dataObj) {
          filteredData[field] = dataObj[field];
        }
      }

      // Handle attributes if present
      if (dataObj.attributes && Array.isArray(dataObj.attributes)) {
        const validAttributes = dataObj.attributes.filter(attr => {
          if (!attr.trait_type || !attr.value) {
            return false;
          }

          // Validate display_type and value type
          if (attr.display_type) {
            switch (attr.display_type) {
              case "boost_number":
              case "boost_percentage":
                return typeof attr.value === "number";
              case "number":
                return typeof attr.value === "number";
              case "string":
                return typeof attr.value === "string";
              case "date":
                return typeof attr.value === "string" && !isNaN(Date.parse(attr.value));
              default:
                return false;
            }
          }

          // If no display_type, value can be string, number, or boolean
          return typeof attr.value === "string" || 
                 typeof attr.value === "number" || 
                 typeof attr.value === "boolean";
        });

        if (validAttributes.length > 0) {
          filteredData.attributes = validAttributes;
        }
      }

      return filteredData;
    }),
    (error) => new ValidationError(error instanceof Error ? error.message : "Failed to validate data against schemas")
  );
} 