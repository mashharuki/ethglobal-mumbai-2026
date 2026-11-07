import { Cluster, Lism, Stack } from "lism-css/react";
import { useRef, useState } from "react";

import type { VerificationResult } from "./participation-verifier.ts";

const verdictText = {
  eligible: "資格あり",
  ineligible: "資格なし",
  unavailable: "現在確認できません",
} as const;

function VerificationOutput({ result }: { result: VerificationResult | null }) {
  if (!result) return null;
  return (
    <Stack as="output" p="20" g="10" bgc="base" bdrs="10">
      <Lism as="strong" fz="l">
        {result.dnsName}：{verdictText[result.verdict]}
      </Lism>
      <Lism as="span" c="text-2" fz="s">
        {result.ensBlockNumber
          ? `Sepolia block ${result.ensBlockNumber} · 資格版 ${result.credentialVersion}`
          : `理由: ${result.reason ?? "不明"}`}
      </Lism>
      {result.ensBlockNumber && result.reason ? (
        <Lism as="span" c="text-2" fz="s">
          理由: {result.reason}
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
          {label === "alice" ? "Alice" : "Bob"}を検証
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
      {isChecking ? <Lism as="p">公開ネットワークを確認中…</Lism> : null}
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
          公開資格を自分で確認
        </Lism>
        <Lism as="p" c="text-2" fz="s">
          ENSとArkivの現行データをブラウザーから直接読みます。ウォレット接続や署名は不要です。
        </Lism>
      </Stack>
      <VerificationButtons
        isChecking={isChecking}
        onCheck={(label) => void checkParticipant(label)}
      />
      <VerificationStatus isChecking={isChecking} result={result} />
      <Lism as="p" c="text-2" fz="s">
        読取先のRPCにはENS名と問い合わせ時刻が見えます。趣味や希望条件は送信しません。通信障害は資格なしと区別して表示します。
      </Lism>
    </Stack>
  );
}
