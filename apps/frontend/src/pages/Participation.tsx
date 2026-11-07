import { Cluster, Lism, Stack } from "lism-css/react";
import { useRef, useState } from "react";

import type { VerificationResult } from "./participation-verifier.ts";

const verdictText = {
  eligible: "Eligible",
  ineligible: "Ineligible",
  unavailable: "Unable to verify right now",
} as const;

function VerificationOutput({ result }: { result: VerificationResult | null }) {
  if (!result) return null;
  return (
    <Stack as="output" p="20" g="10" bgc="base" bdrs="10">
      <Lism as="strong" fz="l">
        {result.dnsName}: {verdictText[result.verdict]}
      </Lism>
      <Lism as="span" c="text-2" fz="s">
        {result.ensBlockNumber
          ? `Sepolia block ${result.ensBlockNumber} · Credential version ${result.credentialVersion}`
          : `Reason: ${result.reason ?? "Unknown"}`}
      </Lism>
      {result.ensBlockNumber && result.reason ? (
        <Lism as="span" c="text-2" fz="s">
          Reason: {result.reason}
        </Lism>
      ) : null}
    </Stack>
  );
}

function VerificationButtons({
  isChecking,
  onCheck,
}: {
  isChecking: boolean;
  onCheck: (label: "alice" | "bob") => void;
}) {
  return (
    <Cluster g="15">
      {(["alice", "bob"] as const).map((label) => (
        <Lism
          as="button"
          key={label}
          type="button"
          set="plain"
          disabled={isChecking}
          onClick={() => onCheck(label)}
          bgc="brand"
          c="base"
          p="15"
          bdrs="99"
          fw="bold"
        >
          Verify {label === "alice" ? "Alice" : "Bob"}
        </Lism>
      ))}
    </Cluster>
  );
}

function VerificationStatus({
  isChecking,
  result,
}: {
  isChecking: boolean;
  result: VerificationResult | null;
}) {
  return (
    <Stack role="status" aria-live="polite" aria-atomic="true">
      {isChecking ? <Lism as="p">Checking public networks…</Lism> : null}
      <VerificationOutput result={result} />
    </Stack>
  );
}

export default function Participation() {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const latestRequest = useRef(0);

  async function checkParticipant(label: "alice" | "bob"): Promise<void> {
    const request = ++latestRequest.current;
    setIsChecking(true);
    setResult(null);
    let next: VerificationResult;
    try {
      const { verifyParticipation } = await import(
        "./participation-verifier.ts"
      );
      next = await verifyParticipation(label);
    } catch {
      next = {
        verdict: "unavailable",
        reason: "CLIENT_UNAVAILABLE",
        dnsName: `${label}.secrettinder.eth`,
      };
    }
    if (request === latestRequest.current) {
      setResult(next);
      setIsChecking(false);
    }
  }

  return (
    <Stack as="section" p="30" g="20" bgc="base-2" bdrs="20">
      <Stack g="10">
        <Lism as="h3" fz="xl">
          Check the credentials yourself
        </Lism>
        <Lism as="p" c="text-2" fz="s">
          Your browser reads the current ENS and Arkiv records directly. No
          wallet connection or signature is needed.
        </Lism>
      </Stack>
      <VerificationButtons
        isChecking={isChecking}
        onCheck={(label) => void checkParticipant(label)}
      />
      <VerificationStatus isChecking={isChecking} result={result} />
      <Lism as="p" c="text-2" fz="s">
        RPC providers can see the ENS name you check and the time of your
        request. We do not send hobbies or preferences. Network errors are shown
        separately from an ineligible credential.
      </Lism>
    </Stack>
  );
}
