import type {
  VerifyWebhookSignatureOptions,
  WebhookRawBody,
} from "./types";

const publicKeyCache = new Map<string, Promise<CryptoKey>>();

function decodeHex(
  value: string,
  expectedByteLength: number,
): Uint8Array<ArrayBuffer> | null {
  if (value.length !== expectedByteLength * 2 || !/^[\da-f]+$/i.test(value)) {
    return null;
  }

  const bytes = new Uint8Array(new ArrayBuffer(expectedByteLength));
  for (let index = 0; index < expectedByteLength; index++) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function rawBodyToBytes(body: WebhookRawBody): Uint8Array<ArrayBuffer> {
  if (typeof body === "string") {
    return new TextEncoder().encode(body);
  }
  if (body instanceof Uint8Array) {
    const bytes = new Uint8Array(new ArrayBuffer(body.byteLength));
    bytes.set(body);
    return bytes;
  }
  return new Uint8Array(body.slice(0));
}

function createSignedMessage(
  timestamp: string,
  body: WebhookRawBody,
): Uint8Array<ArrayBuffer> {
  const timestampBytes = new TextEncoder().encode(timestamp);
  const bodyBytes = rawBodyToBytes(body);
  const message = new Uint8Array(new ArrayBuffer(
    timestampBytes.length + bodyBytes.length,
  ));
  message.set(timestampBytes);
  message.set(bodyBytes, timestampBytes.length);
  return message;
}

function getPublicKey(publicKey: string): Promise<CryptoKey> {
  const normalizedPublicKey = publicKey.toLowerCase();
  const bytes = decodeHex(normalizedPublicKey, 32);
  if (!bytes) {
    throw new TypeError("Discord application public key must be 64 hexadecimal characters");
  }

  let importedKey = publicKeyCache.get(normalizedPublicKey);
  if (!importedKey) {
    importedKey = globalThis.crypto.subtle.importKey(
      "raw",
      bytes,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    publicKeyCache.set(normalizedPublicKey, importedKey);
  }
  return importedKey;
}

/** Validates the configured Discord application public key without importing it. */
export function assertWebhookPublicKey(publicKey: string): void {
  if (!decodeHex(publicKey, 32)) {
    throw new TypeError("Discord application public key must be 64 hexadecimal characters");
  }
}

/**
 * Verifies Discord's Ed25519 signature over `timestamp + rawBody`.
 *
 * A malformed request signature resolves to `false`. A malformed configured
 * public key throws a `TypeError`.
 */
export async function verifyWebhookSignature(
  options: VerifyWebhookSignatureOptions,
): Promise<boolean> {
  assertWebhookPublicKey(options.publicKey);

  const signature = decodeHex(options.signature, 64);
  if (!signature) {
    return false;
  }

  try {
    const key = await getPublicKey(options.publicKey);
    return await globalThis.crypto.subtle.verify(
      "Ed25519",
      key,
      signature,
      createSignedMessage(options.timestamp, options.body),
    );
  }
  catch {
    return false;
  }
}
