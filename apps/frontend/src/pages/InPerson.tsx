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
  MATCH_NOT_CONFIRMED: "成立済みの記録が確認できないため提示できません。",
  SUBJECT_MISMATCH: "本人と成立記録が一致しません。",
  VERSION_MISMATCH: "成立時と端末の登録版が異なります。",
  VALUE_MISMATCH: "登録時の値と一致しないため提示できません。",
  UNAVAILABLE: "端末上で確認できません。",
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
          {field === "job" ? "職業" : "年齢帯"}を提示
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
        {result.data.label}：{result.data.value}
      </Lism>
      <Lism as="span" c="text-2" fz="s">
        成立時の登録版 {result.data.registrationVersion}{" "}
        と一致（ローカルfixture）
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
          対面で見せる内容を選ぶ
        </Lism>
        <Lism as="p" c="text-2" fz="s">
          本人の端末で選んだ1項目だけを確認して提示します。
        </Lism>
      </Stack>
      <DisclosureButtons
        isChecking={isChecking}
        onSelect={(field) => void selectField(field)}
      />
      <Stack role="status" aria-live="polite" aria-atomic="true">
        {isChecking ? <Lism as="p">登録版を確認中…</Lism> : null}
        <DisclosureOutput result={result} />
      </Stack>
      <Lism as="p" c="text-2" fz="s">
        これは仮想の成立済みマッチを使うローカルfixtureです。現実の申告内容は証明せず、公開登録の証明・資金操作にも接続していません。
      </Lism>
    </Stack>
  );
}
