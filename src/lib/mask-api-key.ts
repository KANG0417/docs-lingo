export const maskApiKey = (apiKey: string): string => {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) return "";

  if (trimmedApiKey.length <= 4) {
    return "****";
  }

  return `****${trimmedApiKey.slice(-4)}`;
};
