import { Lism, Stack } from "lism-css/react";
import { useState } from "react";

import { readSepoliaBlock } from "../wallet/connect.ts";

type DiagnosticState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "success"; blockNumber: bigint }
  | { kind: "failure"; reason: string };

function DiagnosticResult({ state }: { state: DiagnosticState }) {
  if (state.kind === "idle") return <p>Not run yet.</p>;
  if (state.kind === "running")
    return <p>Starting the official Nox worker and reading Sepolia...</p>;
  if (state.kind === "failure")
    return <p>Anonymous reading is unavailable: {state.reason}</p>;
  return (
    <p>Read Sepolia block {state.blockNumber.toString()} through the worker.</p>
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
        Anon-RPC Sepolia diagnostic (local development only)
      </Lism>
      <Lism as="p">
        The official Nox worker reads the Sepolia block. Looking up the worker
        identifier and delivering the worker still use direct requests. If the
        anonymous route fails, this page does not fall back to ordinary RPC.
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
        Check anonymous route
      </Lism>
      <Lism as="output" role="status" aria-live="polite">
        <DiagnosticResult state={state} />
      </Lism>
    </Stack>
  );
}
