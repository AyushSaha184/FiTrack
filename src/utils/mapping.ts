export function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function snakeToCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function toSnakeCaseKeys<T = any>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCaseKeys) as any;
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = camelToSnakeCase(key);
      acc[snakeKey] = toSnakeCaseKeys(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

export function toCamelCaseKeys<T = any>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCaseKeys) as any;
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = snakeToCamelCase(key);
      acc[camelKey] = toCamelCaseKeys(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}
