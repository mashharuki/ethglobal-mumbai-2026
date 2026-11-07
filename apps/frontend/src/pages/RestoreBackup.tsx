import { Lism, Stack } from "lism-css/react";
import { useRef, useState } from "react";

import type { RegistrationPrivateMaterial } from "../proofs/register.ts";
import {
  type DisclosureField,
  disclosureFields,
  getSelectedSyntheticValue,
} from "./restore-backup-view.ts";

function Disclosure({
  selectedValue,
  field,
  onChoose,
}: {
  selectedValue: string | null;
  field: DisclosureField | "none";
  onChoose: (field: DisclosureField | "none") => void;
}) {
  return (
    <Stack as="section" g="10" aria-label="Selective local disclosure">
      <label htmlFor="restore-field">
        Show one synthetic field on this device
      </label>
      <select
        id="restore-field"
        value={field}
        onChange={(event) =>
          onChoose(event.currentTarget.value as DisclosureField | "none")
        }
      >
        <option value="none">Show nothing</option>
        {disclosureFields.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      {field !== "none" ? (
        <Lism as="output" aria-live="polite">
          {selectedValue}
        </Lism>
      ) : null}
    </Stack>
  );
}

export default function RestoreBackup() {
  const fileInput = useRef<HTMLInputElement>(null);
  const material = useRef<RegistrationPrivateMaterial | null>(null);
  const requestId = useRef(0);
  const [passphrase, setPassphrase] = useState("");
  const [root, setRoot] = useState<string | null>(null);
  const [field, setField] = useState<DisclosureField | "none">("none");
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  function clearRestored(): void {
    requestId.current += 1;
    material.current = null;
    setRoot(null);
    setField("none");
    setSelectedValue(null);
    setPassphrase("");
    setStatus("");
    setIsBusy(false);
  }

  async function restore(): Promise<void> {
    const file = fileInput.current?.files?.[0];
    if (!file || file.size > 210_000) {
      setStatus("Choose a backup JSON file smaller than 210 kB.");
      return;
    }
    const current = ++requestId.current;
    material.current = null;
    setRoot(null);
    setField("none");
    setSelectedValue(null);
    setIsBusy(true);
    try {
      const backup = await file.text();
      const { restoreRegistrationBackup } = await import(
        "../profile/registration-backup.ts"
      );
      const result = await restoreRegistrationBackup(backup, passphrase);
      if (current !== requestId.current) return;
      if (!result.ok) {
        setStatus(
          result.error === "PASSPHRASE_TOO_SHORT"
            ? "The backup passphrase must contain at least 16 characters."
            : "Backup could not be verified. Check the file and passphrase.",
        );
        return;
      }
      material.current = result.data;
      setRoot(result.data.root);
      setStatus(
        "Backup decrypted and registration commitment verified locally.",
      );
    } catch {
      if (current === requestId.current) {
        setStatus("Backup could not be read or verified on this device.");
      }
    } finally {
      if (current === requestId.current) {
        setPassphrase("");
        setIsBusy(false);
      }
    }
  }

  function chooseField(next: DisclosureField | "none"): void {
    setField(next);
    setSelectedValue(getSelectedSyntheticValue(material.current, next));
  }

  return (
    <Stack as="main" p="30" g="20" bgc="base-2">
      <Lism as="h1" fz="2xl">
        Restore an encrypted registration backup
      </Lism>
      <Lism as="p">
        Choose your JSON backup and passphrase. Decryption and commitment
        verification happen only on this device; the file and passphrase are not
        sent to a server.
      </Lism>
      <label htmlFor="restore-file">Encrypted backup JSON</label>
      <input
        id="restore-file"
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        disabled={isBusy}
        onChange={clearRestored}
      />
      <label htmlFor="restore-passphrase">Backup passphrase</label>
      <input
        id="restore-passphrase"
        type="password"
        autoComplete="off"
        value={passphrase}
        disabled={isBusy}
        onChange={(event) => setPassphrase(event.currentTarget.value)}
      />
      <Lism
        as="button"
        type="button"
        set="plain"
        disabled={isBusy}
        onClick={() => void restore()}
      >
        {isBusy ? "Verifying locally…" : "Restore backup"}
      </Lism>
      <Lism
        as="button"
        type="button"
        set="plain"
        onClick={() => {
          clearRestored();
          if (fileInput.current) fileInput.current.value = "";
        }}
      >
        Clear restored data
      </Lism>
      <Lism as="p" role="status" aria-live="polite">
        {status}
      </Lism>
      {root ? (
        <Stack as="section" g="10">
          <Lism as="h2" fz="l">
            Verified public commitment
          </Lism>
          <Lism as="output">{root}</Lism>
          <Disclosure
            selectedValue={selectedValue}
            field={field}
            onChoose={chooseField}
          />
        </Stack>
      ) : null}
      <Lism as="a" href="/" c="brand">
        Return to Secret Tinder
      </Lism>
    </Stack>
  );
}
