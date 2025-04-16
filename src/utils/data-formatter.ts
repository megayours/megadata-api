export const formatData = (data: Record<string, any>, modules: { id: string, schema: any }[]): Record<string, any> => {
  const formattedData: Record<string, any> = {};

  for (const module of modules) {
    const schema = module.schema as any;
    const moduleProperties = new Set<string>();

    if (schema && typeof schema === 'object' && schema.properties && typeof schema.properties === 'object') {
      Object.keys(schema.properties).forEach(prop => moduleProperties.add(prop));
    }

    const filteredDataForModule: Record<string, any> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) && moduleProperties.has(key) && data[key]) {
        // If the property is an array (like 'attributes'), process its items
        if (Array.isArray(data[key])) {
          filteredDataForModule[key] = data[key].map((item: any) => {
            if (item && typeof item === 'object' && 'value' in item) {
              const value = item.value;
              if (typeof value === 'bigint') {
                return { ...item, value: value.toString() };
              }
              if (typeof value === 'number' && !Number.isInteger(value)) {
                return { ...item, value: value.toString() };
              }
            }
            return item;
          });
        } else {
          filteredDataForModule[key] = data[key];
        }
      }
    }

    if (Object.keys(filteredDataForModule).length > 0) {
      formattedData[module.id] = filteredDataForModule;
    }
  }

  return formattedData;
}
