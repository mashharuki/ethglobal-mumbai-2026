import { Cluster, Lism, Stack } from "lism-css/react";
import { useRef, useState } from "react";

import type {
  ParticipationHistoryResult,
  VerificationResult,
} from "./participation-verifier.ts";

type ParticipantLabel = "alice" | "bob";

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

function HistoryOutput({
  result,
}: {
  result: ParticipationHistoryResult | null;
}) {
  if (!result) return null;
  if (!result.ok) {
    return (
      <Lism as="p" role="alert" c="text-2" fz="s">
        {result.error === "HISTORY_UNAVAILABLE"
          ? "Public version history is temporarily unavailable."
          : "A public version failed credential verification."}{" "}
        The eligibility verdict above is unchanged.
      </Lism>
    );
  }
  return (
    <Stack as="section" aria-label="Public credential version history" g="10">
      <Lism as="h4" fz="l">
        Public version history
      </Lism>
      <Lism as="p" c="text-2" fz="s">
        Signed Arkiv publications at index block {result.data.arkivBlockNumber}.
        The current ENS reference determines which version applies now.
      </Lism>
      <Stack as="ol" g="5" pl="20">
        {result.data.versions.map((entry) => (
          <Lism as="li" key={entry.version}>
            Version {entry.version}: declared {entry.status}
            {entry.suspendedUntil
              ? ` until ${new Date(entry.suspendedUntil * 1000).toISOString()}`
              : ""}
            {entry.isCurrent ? " · Current ENS reference" : " · Historical"}
          </Lism>
        ))}
      </Stack>
      {result.data.isTruncated ? (
        <Lism as="p" c="text-2" fz="s">
          More publications exist than this view shows.
        </Lism>
      ) : null}
    </Stack>
  );
}

export default function Participation() {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [checkedLabel, setCheckedLabel] = useState<ParticipantLabel | null>(
    null,
  );
  const [history, setHistory] = useState<ParticipationHistoryResult | null>(
    null,
  );
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const latestRequest = useRef(0);

  async function checkParticipant(label: "alice" | "bob"): Promise<void> {
    const request = ++latestRequest.current;
    setIsChecking(true);
    setResult(null);
    setCheckedLabel(null);
    setHistory(null);
    setIsLoadingHistory(false);
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
      setCheckedLabel(label);
      setIsChecking(false);
    }
  }

  async function loadHistory(): Promise<void> {
    if (!checkedLabel || !result?.ensBlockNumber) return;
    const request = latestRequest.current;
    setIsLoadingHistory(true);
    setHistory(null);
    let next: ParticipationHistoryResult;
    try {
      const { readParticipationHistory } = await import(
        "./participation-verifier.ts"
      );
      next = await readParticipationHistory(checkedLabel);
    } catch {
      next = { ok: false, error: "HISTORY_UNAVAILABLE" };
    }
    if (request === latestRequest.current) {
      setHistory(next);
      setIsLoadingHistory(false);
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
      {result?.ensBlockNumber ? (
        <Stack g="10">
          <Lism
            as="button"
            type="button"
            set="plain"
            disabled={isLoadingHistory}
            onClick={() => void loadHistory()}
            p="10"
            bdrs="10"
          >
            {isLoadingHistory
              ? "Loading public versions…"
              : "View public version history"}
          </Lism>
          <HistoryOutput result={history} />
        </Stack>
      ) : null}
      <Lism as="p" c="text-2" fz="s">
        RPC providers can see the ENS name you check and the time of your
        request. We do not send hobbies or preferences. Network errors are shown
        separately from an ineligible credential.
      </Lism>
    </Stack>
  );
}
