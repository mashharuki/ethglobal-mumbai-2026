import {
  type RegistrationPrivateMaterial,
  restoreRegistrationPrivateMaterial,
} from "../proofs/register.ts";
import {
  type BackupResult,
  createEncryptedBackup,
  restoreEncryptedBackup,
} from "./private-store.ts";

type RegistrationRestoreResult =
  | { ok: true; data: RegistrationPrivateMaterial }
  | {
      ok: false;
      error: "INVALID_BACKUP" | "PASSPHRASE_TOO_SHORT" | "CRYPTO_UNAVAILABLE";
    };

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export async function createRegistrationBackup(
  material: RegistrationPrivateMaterial,
  passphrase: string,
): Promise<BackupResult> {
  try {
    await restoreRegistrationPrivateMaterial(material);
    const { profile, ...secret } = material;
    return createEncryptedBackup(
      {
        profile: encoder.encode(JSON.stringify(profile)),
        secret: encoder.encode(JSON.stringify(secret)),
      },
      passphrase,
    );
  } catch {
    return { ok: false, error: "INVALID_INPUT" };
  }
}

export async function restoreRegistrationBackup(
  backup: string,
  passphrase: string,
): Promise<RegistrationRestoreResult> {
  const restored = await restoreEncryptedBackup(backup, passphrase);
  if (!restored.ok) return restored;
  try {
    const profile: unknown = JSON.parse(decoder.decode(restored.data.profile));
    const secret: unknown = JSON.parse(decoder.decode(restored.data.secret));
    if (!secret || typeof secret !== "object" || Array.isArray(secret)) {
      return { ok: false, error: "INVALID_BACKUP" };
    }
    const material = await restoreRegistrationPrivateMaterial({
      ...secret,
      profile,
    });
    return { ok: true, data: material };
  } catch {
    return { ok: false, error: "INVALID_BACKUP" };
  } finally {
    restored.data.profile.fill(0);
    restored.data.secret.fill(0);
  }
}
