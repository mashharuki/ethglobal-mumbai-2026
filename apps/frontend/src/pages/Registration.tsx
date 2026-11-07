import { Cluster, Lism, Stack, Wrapper } from "lism-css/react";
import { useState } from "react";
import type { SyntheticProfile } from "../proofs/register.ts";

const defaultProfile: SyntheticProfile = {
  hobbies: ["h1"],
  gender: "g1",
  intent: "i1",
  acceptsGenders: ["*"],
  acceptsIntents: ["*"],
  job: 201,
  ageBand: 301,
};

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const id = `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  bytes.fill(0);
  return id;
}

function downloadBackup(backup: string): void {
  const url = URL.createObjectURL(
    new Blob([backup], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "secret-tinder-private-backup.json";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}{" "}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "*" ? "Any" : option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Registration() {
  const [profile, setProfile] = useState<SyntheticProfile>(defaultProfile);
  const [isBusy, setIsBusy] = useState(false);
  const [result, setResult] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [backup, setBackup] = useState<string | null>(null);

  async function generateProof(): Promise<void> {
    if (passphrase.length > 0 && passphrase.length < 16) {
      setResult(
        "Use at least 16 characters for an encrypted backup, or leave the passphrase empty.",
      );
      return;
    }
    setIsBusy(true);
    setBackup(null);
    setResult(
      "Generating a real Noir proof on this device. This may take a minute...",
    );
    try {
      const { createRegistrationProof, verifyRegistrationProof } = await import(
        "../proofs/register.ts"
      );
      const request = {
        subjectId: randomId(),
        issuanceId: randomId(),
        profileVersion: 1,
        profile,
      };
      const registration = await createRegistrationProof(request);
      const claim = { ...request, root: registration.publicProof.root };
      const isVerified = await verifyRegistrationProof(
        registration.publicProof,
        claim,
      );
      let backupNotice = "";
      if (isVerified && passphrase.length >= 16) {
        const { createRegistrationBackup } = await import(
          "../profile/registration-backup.ts"
        );
        const encrypted = await createRegistrationBackup(
          registration.privateMaterial,
          passphrase,
        );
        if (encrypted.ok) {
          setBackup(encrypted.data);
          backupNotice = " Encrypted backup ready to download.";
        } else {
          backupNotice =
            " Encrypted backup failed; private material was not saved.";
        }
      }
      setResult(
        isVerified
          ? `Proof verified locally. Public commitment: ${claim.root}.${backupNotice}`
          : "Proof verification failed. No registration was created.",
      );
    } catch (error) {
      setResult(
        `Proof generation failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    } finally {
      setPassphrase("");
      setIsBusy(false);
    }
  }

  return (
    <Stack
      as="section"
      id="registration"
      p={["30", null, "50"]}
      g="30"
      bgc="base-2"
    >
      <Wrapper contentSize="l">
        <Stack g="20">
          <Lism as="p" fz="s" fw="bold" c="brand">
            LOCAL ZERO KNOWLEDGE PROOF
          </Lism>
          <Lism as="h2" fz={["2xl", null, "3xl"]}>
            Try private profile registration
          </Lism>
          <Lism as="p" c="text-2" max-sz="l">
            Choose synthetic values and generate a real Noir proof in this
            browser. Your selections and random salts stay on this device. This
            experiment does not create an ENS name, submit a profile, or start
            matching.
          </Lism>
          <Cluster g="20">
            <Choice
              label="Hobby"
              value={profile.hobbies[0]}
              options={["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8"]}
              onChange={(value) => setProfile({ ...profile, hobbies: [value] })}
            />
            <Choice
              label="Gender"
              value={profile.gender}
              options={["g1", "g2", "g3"]}
              onChange={(value) => setProfile({ ...profile, gender: value })}
            />
            <Choice
              label="Goal"
              value={profile.intent}
              options={["i1", "i2"]}
              onChange={(value) => setProfile({ ...profile, intent: value })}
            />
            <Choice
              label="Accepts gender"
              value={profile.acceptsGenders[0]}
              options={["*", "g1", "g2", "g3"]}
              onChange={(value) =>
                setProfile({ ...profile, acceptsGenders: [value] })
              }
            />
          </Cluster>
          <label>
            Optional backup passphrase (16 characters or more){" "}
            <input
              type="password"
              autoComplete="new-password"
              value={passphrase}
              maxLength={1024}
              onChange={(event) => setPassphrase(event.target.value)}
            />
          </label>
          <Lism as="p" c="text-2" fz="s">
            With a passphrase, an encrypted private backup is prepared locally
            after verification. Without it, the private witness is discarded. A
            lost passphrase cannot be recovered.
          </Lism>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void generateProof()}
          >
            {isBusy ? "Generating proof..." : "Generate and verify proof"}
          </button>
          {result && (
            <Lism
              as="p"
              role="status"
              aria-live="polite"
              style={{ overflowWrap: "anywhere" }}
            >
              {result}
            </Lism>
          )}
          {backup && (
            <button type="button" onClick={() => downloadBackup(backup)}>
              Download encrypted private backup
            </button>
          )}
          <a href="#restore">Restore a private backup on this device</a>
        </Stack>
      </Wrapper>
    </Stack>
  );
}
