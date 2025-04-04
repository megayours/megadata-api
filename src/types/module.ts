export type ModuleAttributeType = 'string' | 'number' | 'boolean' | 'array';
export type ModuleAttributeDisplayType = 'string' | 'number' | 'boost_number' | 'boost_percentage' | 'date';

export interface ModuleAttributeSchema {
  trait_type: string;
  value_type: ModuleAttributeType;
  display_type?: ModuleAttributeDisplayType;
  required: boolean;
}

export interface ModuleSchema {
  name: string;
  description: string;
  version: string;
  attributes: ModuleAttributeSchema[];
}

export interface JSONSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, JSONSchemaProperty>;
  items?: JSONSchema;
  oneOf?: JSONSchema[];
  enum?: string[];
  description?: string;
}

export interface JSONSchemaProperty extends JSONSchema {
  type: string;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  schema: JSONSchema;
  created_at: Date;
  updated_at: Date;
} 