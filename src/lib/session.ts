// Session tokens: a signed cookie, no server-side session store, no
// database lookup needed just to check "is someone logged in." Uses only
// Web Crypto (`crypto.subtle`), which is available both in the Node.js
// runtime and in Next.js's Edge middleware runtime — so this one file can
// be safely imported from both without pulling in node:sqlite (which
// middleware can't use).
export const SESSION_COOKIE_NAME = "spt_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. It's generated automatically the first time you run `npm run dev`, " +
        "`npm run build`, or `npm run start` — run one of those once, then try again."
    );
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array<ArrayBuffer> {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  const binary = atob(padded);
  // Allocate via a plain ArrayBuffer explicitly — newer TS DOM typings make
  // Uint8Array generic over ArrayBufferLike, and SubtleCrypto's BufferSource
  // param only accepts the ArrayBuffer-backed variant.
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(staffId: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${staffId}.${expires}`;
  const key = await getKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${toBase64Url(new TextEncoder().encode(payload))}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<{ staffId: string } | null> {
  if (!token) return null;
  const [payloadPart, sigPart] = token.split(".");
  if (!payloadPart || !sigPart) return null;

  try {
    const key = await getKey();
    const payloadBytes = fromBase64Url(payloadPart);
    const sigBytes = fromBase64Url(sigPart);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, payloadBytes);
    if (!valid) return null;

    const payload = new TextDecoder().decode(payloadBytes);
    const [staffId, expiresStr] = payload.split(".");
    const expires = Number(expiresStr);
    if (!staffId || !expires || Date.now() / 1000 > expires) return null;

    return { staffId };
  } catch {
    return null;
  }
}
