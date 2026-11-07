import {
  type PrivateBackupEnvelope,
  privateBackupEnvelopeSchema,
} from "../../../../packages/shared/src/profile/backup-schema.ts";

type Result<T, E extends string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export type PrivateMaterial = {
  profile: Uint8Array;
  secret: Uint8Array;
};

export type BackupResult = Result<
  string,
  "INVALID_INPUT" | "PASSPHRASE_TOO_SHORT" | "CRYPTO_UNAVAILABLE"
>;

export type RestoreResult = Result<
  PrivateMaterial,
  "INVALID_BACKUP" | "PASSPHRASE_TOO_SHORT" | "CRYPTO_UNAVAILABLE"
>;

const maxPartBytes = 65_536;
const headerBytes = 12;
const magic = [0x53, 0x54, 0x50, 0x31] as const;

function isValidMaterial(material: unknown): material is PrivateMaterial {
  if (!material || typeof material !== "object") return false;
  if (!("profile" in material) || !("secret" in material)) return false;
  return (
    material.profile instanceof Uint8Array &&
    material.secret instanceof Uint8Array &&
    material.profile.length > 0 &&
    material.secret.length > 0 &&
    material.profile.length <= maxPartBytes &&
    material.secret.length <= maxPartBytes
  );
}

function isValidPassphrase(passphrase: unknown): passphrase is string {
  return (
    typeof passphrase === "string" &&
    passphrase.length >= 16 &&
    passphrase.length <= 1024
  );
}

function encodeMaterial(material: PrivateMaterial): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(
    headerBytes + material.profile.length + material.secret.length,
  );
  bytes.set(magic);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, material.profile.length);
  view.setUint32(8, material.secret.length);
  bytes.set(material.profile, headerBytes);
  bytes.set(material.secret, headerBytes + material.profile.length);
  return bytes;
}

function decodeMaterial(bytes: Uint8Array): PrivateMaterial | null {
  if (bytes.length < headerBytes) return null;
  if (magic.some((byte, index) => bytes[index] !== byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const profileLength = view.getUint32(4);
  const secretLength = view.getUint32(8);
  if (!profileLength || !secretLength) return null;
  if (profileLength > maxPartBytes || secretLength > maxPartBytes) return null;
  if (bytes.length !== headerBytes + profileLength + secretLength) return null;
  return {
    profile: bytes.slice(headerBytes, headerBytes + profileLength),
    secret: bytes.slice(headerBytes + profileLength),
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 16_384) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16_384));
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (toBase64Url(bytes) !== value) throw new Error("Noncanonical base64url");
  return bytes;
}

async function deriveBackupKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  usage: KeyUsage,
): Promise<CryptoKey> {
  const passwordBytes = new TextEncoder().encode(passphrase);
  const keyBytes = new Uint8Array(passwordBytes);
  try {
    const baseKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 600_000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      [usage],
    );
  } finally {
    keyBytes.fill(0);
    passwordBytes.fill(0);
  }
}

export async function createEncryptedBackup(
  material: PrivateMaterial,
  passphrase: string,
): Promise<BackupResult> {
  if (!isValidMaterial(material)) return { ok: false, error: "INVALID_INPUT" };
  if (!isValidPassphrase(passphrase)) {
    return { ok: false, error: "PASSPHRASE_TOO_SHORT" };
  }
  if (!globalThis.crypto?.subtle) {
    return { ok: false, error: "CRYPTO_UNAVAILABLE" };
  }
  const plaintext = encodeMaterial(material);
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveBackupKey(passphrase, salt, "encrypt");
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      plaintext,
    );
    const envelope = {
      format: "secret-tinder-private-backup",
      version: 1,
      cipher: "AES-256-GCM",
      kdf: "PBKDF2-SHA-256",
      iterations: 600_000,
      salt: toBase64Url(salt),
      iv: toBase64Url(iv),
      ciphertext: toBase64Url(new Uint8Array(encrypted)),
    } satisfies PrivateBackupEnvelope;
    return { ok: true, data: JSON.stringify(envelope) };
  } catch {
    return { ok: false, error: "CRYPTO_UNAVAILABLE" };
  } finally {
    plaintext.fill(0);
  }
}

export async function restoreEncryptedBackup(
  backup: string,
  passphrase: string,
): Promise<RestoreResult> {
  if (!isValidPassphrase(passphrase)) {
    return { ok: false, error: "PASSPHRASE_TOO_SHORT" };
  }
  if (!globalThis.crypto?.subtle) {
    return { ok: false, error: "CRYPTO_UNAVAILABLE" };
  }
  if (typeof backup !== "string" || backup.length > 210_000) {
    return { ok: false, error: "INVALID_BACKUP" };
  }
  try {
    const parsed = privateBackupEnvelopeSchema.parse(JSON.parse(backup));
    const salt = fromBase64Url(parsed.salt);
    const iv = fromBase64Url(parsed.iv);
    if (salt.length !== 16 || iv.length !== 12) {
      return { ok: false, error: "INVALID_BACKUP" };
    }
    const key = await deriveBackupKey(passphrase, salt, "decrypt");
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      fromBase64Url(parsed.ciphertext),
    );
    const plaintext = new Uint8Array(decrypted);
    try {
      const material = decodeMaterial(plaintext);
      return material
        ? { ok: true, data: material }
        : { ok: false, error: "INVALID_BACKUP" };
    } finally {
      plaintext.fill(0);
    }
  } catch {
    return { ok: false, error: "INVALID_BACKUP" };
  }
}
