export function businessTypeKey(type: string): string {
  const camel = type.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return `categories.${camel}`;
}
