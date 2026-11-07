import { Cluster, Lism, Stack } from "lism-css/react";
import { useRef, useState } from "react";

import {
  type DisclosureField,
  type DisclosureResult,
  type MatchedRegistration,
  type PrivateRegistration,
  verifyInPersonDisclosure,
} from "./in-person-disclosure.ts";

const errorText: Record<
  Extract<DisclosureResult, { ok: false }>["error"],
  string
> = {
  MATCH_NOT_CONFIRMED: "No confirmed match record is available for disclosure.",
  SUBJECT_MISMATCH: "The account does not match the confirmed record.",
  VERSION_MISMATCH:
    "Your local registration version differs from the matched version.",
  VALUE_MISMATCH: "The value differs from the one in your registration.",
  UNAVAILABLE: "This cannot be checked on your device right now.",
};

function DisclosureButtons({
  isChecking,
  onSelect,
}: {
  isChecking: boolean;
  onSelect: (field: DisclosureField) => void;
}) {
  return (
    <Cluster g="15">
      {(["job", "ageBand"] as const).map((field) => (
        <Lism
          as="button"
          key={field}
          type="button"
          set="plain"
          disabled={isChecking}
          onClick={() => onSelect(field)}
          bgc="brand"
          c="base"
          p="15"
          bdrs="99"
          fw="bold"
        >
          Show {field === "job" ? "occupation" : "age range"}
        </Lism>
      ))}
    </Cluster>
  );
}

function DisclosureOutput({ result }: { result: DisclosureResult | null }) {
  if (!result) return null;
  if (!result.ok) return <Lism as="p">{errorText[result.error]}</Lism>;
  return (
    <Stack as="output" p="20" g="10" bgc="base" bdrs="10">
      <Lism as="strong" fz="l">
        {result.data.label}: {result.data.value}
      </Lism>
      <Lism as="span" c="text-2" fz="s">
        Matches registration version {result.data.registrationVersion} at the
        time of the match (local fixture)
      </Lism>
    </Stack>
  );
}

export default function InPerson({
  registration,
  match,
}: {
  registration: PrivateRegistration;
  match: MatchedRegistration;
}) {
  const [result, setResult] = useState<DisclosureResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const latestRequest = useRef(0);

  async function selectField(field: DisclosureField): Promise<void> {
    const request = ++latestRequest.current;
    setIsChecking(true);
    setResult(null);
    const next = await verifyInPersonDisclosure(registration, match, field);
    if (request !== latestRequest.current) return;
    setResult(next);
    setIsChecking(false);
  }

  return (
    <Stack as="section" p="30" g="20" bgc="base-2" bdrs="20">
      <Stack g="10">
        <Lism as="h3" fz="xl">
          Choose what to show in person
        </Lism>
        <Lism as="p" c="text-2" fz="s">
          Check and reveal only the one field you choose on your device.
        </Lism>
      </Stack>
      <DisclosureButtons
        isChecking={isChecking}
        onSelect={(field) => void selectField(field)}
      />
      <Stack role="status" aria-live="polite" aria-atomic="true">
        {isChecking ? <Lism as="p">Checking registration version…</Lism> : null}
        <DisclosureOutput result={result} />
      </Stack>
      <Lism as="p" c="text-2" fz="s">
        This local fixture uses a fictional confirmed match. It does not prove
        real-world claims or connect to public registration proofs or funds.
      </Lism>
    </Stack>
  );
}
