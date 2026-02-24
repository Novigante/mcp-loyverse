const SECRET_KEYS = new Set(['loyverse_api_token']);

export function maskSecret(value: string): string {
  if (value.length <= 4) return '****';
  return value.slice(0, 4) + '****';
}

export function isSecret(key: string): boolean {
  return SECRET_KEYS.has(key.toLowerCase());
}

export function redactSecrets(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSecret(key) && typeof value === 'string') {
      result[key] = maskSecret(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
