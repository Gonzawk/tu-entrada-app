function getRequiredUrl(
  value: string | undefined,
  variableName: string
): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(
      `Falta configurar la variable ${variableName}.`
    );
  }

  if (
    !normalized.startsWith("http://") &&
    !normalized.startsWith("https://")
  ) {
    throw new Error(
      `${variableName} debe comenzar con http:// o https://.`
    );
  }

  return normalized.replace(/\/+$/, "");
}

export const ENV = {
  API_URL: getRequiredUrl(
    process.env.EXPO_PUBLIC_API_URL,
    "EXPO_PUBLIC_API_URL"
  ),
} as const;