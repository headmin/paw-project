/**
 * Generates a secure random token for API authentication
 * @returns A secure random token string
 */
export function generateSecureToken(): string {
  // Generate a random array of bytes
  const randomBytes = new Uint8Array(32); // 256 bits of randomness
  crypto.getRandomValues(randomBytes);

  // Convert to a base64 string and remove non-alphanumeric characters
  const base64 = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '');

  // Add a prefix to make it recognizable as a service token
  return `sk_${base64}`;
}

/**
 * Validates if a token is expired
 * @param expiresAt Unix timestamp when the token expires
 * @returns Boolean indicating if the token is expired
 */
export function isTokenExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return false;
  const now = Math.floor(Date.now() / 1000);
  return now > expiresAt;
}

/**
 * Calculate expiration timestamp based on duration
 * @param duration Duration string: '1d', '7d', '30d', '90d', '365d', 'never'
 * @returns Unix timestamp or null for no expiration
 */
export function calculateExpiration(duration: string | null): number | null {
  if (!duration || duration === 'never') return null;

  const now = Math.floor(Date.now() / 1000);

  switch (duration) {
    case '1d':
      return now + (24 * 60 * 60); // 1 day in seconds
    case '7d':
      return now + (7 * 24 * 60 * 60); // 7 days in seconds
    case '30d':
      return now + (30 * 24 * 60 * 60); // 30 days in seconds
    case '90d':
      return now + (90 * 24 * 60 * 60); // 90 days in seconds
    case '365d':
      return now + (365 * 24 * 60 * 60); // 365 days in seconds
    default:
      // If a custom timestamp is provided, return it
      const customTimestamp = parseInt(duration);
      if (!isNaN(customTimestamp)) {
        return customTimestamp;
      }
      return null;
  }
}
