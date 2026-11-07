import { Lism, Stack } from "lism-css/react";
import { useState } from "react";

import { readSepoliaBlock } from "../wallet/connect.ts";

type DiagnosticState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "success"; blockNumber: bigint }
  | { kind: "failure"; reason: string };

function DiagnosticResult({ state }: { state: DiagnosticState }) {
  if (state.kind === "idle") return <p>未実行です。</p>;
  if (state.kind === "running")
    return <p>公式 Nox worker を起動し、Sepolia を読取中です…</p>;
  if (state.kind === "failure")
    return <p>匿名読取は利用できません: {state.reason}</p>;
  return (
    <p>
      匿名経路から Sepolia block {state.blockNumber.toString()} を取得しました。
    </p>
  );
}

export default function AnonRpcDiagnostics() {
  const [state, setState] = useState<DiagnosticState>({ kind: "idle" });

  async function runDiagnostic(): Promise<void> {
    setState({ kind: "running" });
    try {
      const { startSepoliaAnonRpc } = await import("../wallet/anon-rpc.ts");
      const session = await startSepoliaAnonRpc();
      if (!session.ok) {
        setState({ kind: "failure", reason: session.error });
        return;
      }
      try {
        const read = await readSepoliaBlock(session.data.worker);
        setState(
          read.ok
            ? { kind: "success", blockNumber: read.data.blockNumber }
            : { kind: "failure", reason: read.error },
        );
      } finally {
        session.data.close();
      }
    } catch {
      setState({ kind: "failure", reason: "CLIENT_UNAVAILABLE" });
    }
  }

  if (!import.meta.env.DEV) return null;

  return (
    <Stack as="section" p="30" g="20" bgc="base-2" bdrs="20">
      <Lism as="h2" fz="xl">
        Anon-RPC Sepolia 診断（開発環境のみ）
      </Lism>
      <Lism as="p">
        Nox の公式 worker を利用します。識別子取得と worker
        配布は直接通信し、Sepolia の block
        読取は匿名経路で行います。接続失敗時に通常 RPC へ迂回しません。
      </Lism>
      <Lism
        as="button"
        type="button"
        set="plain"
        disabled={state.kind === "running"}
        onClick={() => void runDiagnostic()}
        bgc="brand"
        c="base"
        p="15"
        bdrs="99"
        fw="bold"
      >
        匿名経路を確認
      </Lism>
      <Lism as="output" role="status" aria-live="polite">
        <DiagnosticResult state={state} />
      </Lism>
    </Stack>
  );
}
