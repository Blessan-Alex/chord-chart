const TOKEN_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const TOKEN_LENGTH = 16;

export function generatePlaylistInviteToken(): string {
  const bytes = new Uint8Array(TOKEN_LENGTH);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < TOKEN_LENGTH; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i += 1) {
    token += TOKEN_ALPHABET[bytes[i]! % TOKEN_ALPHABET.length];
  }
  return token;
}

export function normalizeInviteToken(raw: string): string {
  return raw.trim();
}
