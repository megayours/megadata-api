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
      if (Object.prototype.hasOwnProperty.call(data, key) && moduleProperties.has(key)) {
        filteredDataForModule[key] = data[key];
      }
    }

    if (Object.keys(filteredDataForModule).length > 0) {
      formattedData[module.id] = filteredDataForModule;
    }
  }

  return formattedData;
}