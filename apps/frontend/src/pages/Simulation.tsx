import { Lism, Stack } from "lism-css/react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { simulationConsentSchema } from "../../../../packages/shared/src/simulation/contract.ts";
import {
  getSimulationGate,
  getStandaloneDemoHref,
  type SimulationActions,
  type SimulationConsent,
  type SimulationEntry,
} from "./simulation-entry.ts";

type AuthorizedEntry = Extract<SimulationEntry, { kind: "authorized" }>;
type SimulationProps = {
  entry?: SimulationEntry;
  actions?: SimulationActions;
};

const unavailableEntry: SimulationEntry = { kind: "unavailable" };

function subscribeToClock(onTick: () => void): () => void {
  const timer = window.setInterval(onTick, 1000);
  return () => window.clearInterval(timer);
}

function getCurrentSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function getServerSeconds(): null {
  return null;
}

function PrivacyBoundary() {
  return (
    <Stack as="section" p="20" g="10" bgc="base" bdrs="20">
      <Lism as="h2" fz="l">
        What AI receives
      </Lism>
      <Lism as="p">
        If you choose to continue, AIBot and its AI provider may process your
        interview answers, approved Persona, messages, and conversation memory.
      </Lism>
      <Lism as="p" c="text-2" fz="s">
        Your private matching preferences, shared interests, wallet secrets, and
        deposit details are not transferred. An AI reply is not your match’s
        real opinion or proof of compatibility.
      </Lism>
    </Stack>
  );
}

function UnavailableSimulation() {
  return (
    <Stack as="section" p="20" g="10" bgc="base" bdrs="20">
      <Lism as="h2" fz="l">
        Conversation is not connected yet
      </Lism>
      <Lism as="p">
        This page has no authorized match or AIBot handoff. The standalone AIBot
        can demonstrate a fictional Persona, but this page cannot start a real
        matched conversation.
      </Lism>
      <Lism as="p" c="text-2" fz="s">
        Match: not verified · Secret Tinder AI mode: not connected
      </Lism>
      <StandaloneDemo />
    </Stack>
  );
}

function useStandaloneDemoConsent() {
  const [hasSeparateAiConsent, setHasSeparateAiConsent] = useState(false);
  useEffect(() => {
    const revokeWhenVisible = () => {
      if (document.visibilityState === "visible") {
        setHasSeparateAiConsent(false);
      }
    };
    document.addEventListener("visibilitychange", revokeWhenVisible);
    return () =>
      document.removeEventListener("visibilitychange", revokeWhenVisible);
  }, []);
  return { hasSeparateAiConsent, setHasSeparateAiConsent };
}

function StandaloneDemo() {
  const { hasSeparateAiConsent, setHasSeparateAiConsent } =
    useStandaloneDemoConsent();
  const demoHref = getStandaloneDemoHref(hasSeparateAiConsent);
  return (
    <Stack as="section" aria-label="Fictional AIBot demo" g="10">
      <Lism as="h3" fz="l">
        Try the separate fictional demo
      </Lism>
      <Lism as="p">
        Asha and Mira are fictional adults in the teammate’s AIBot app. This
        demo is not a Secret Tinder match or a date request to a real person.
      </Lism>
      <label>
        <input
          type="checkbox"
          checked={hasSeparateAiConsent}
          onChange={(event) =>
            setHasSeparateAiConsent(event.currentTarget.checked)
          }
        />{" "}
        I choose to open the separate AIBot demo. Interview answers, Persona
        settings, messages, and conversation memory I enter there may be
        processed by AIBot and OpenAI. No matching secrets are sent
        automatically from this page.
      </label>
      {demoHref ? (
        <Lism
          as="a"
          href={demoHref}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          c="brand"
          fw="bold"
        >
          Open fictional AIBot demo ↗
        </Lism>
      ) : (
        <Lism as="p" c="text-2" fz="s">
          Choose the option above to enable the external demo link.
        </Lism>
      )}
      <Lism as="p" c="text-2" fz="s">
        Uncheck to withdraw this link permission. Returning to this tab also
        clears it. This cannot undo information already sent to AIBot.
      </Lism>
    </Stack>
  );
}

function SessionFacts({ entry }: { entry: AuthorizedEntry }) {
  const isSynthetic = entry.matchKind === "synthetic";
  const isScripted = entry.modelKind === "scripted";
  const expiryDate = new Date(entry.expiresAt * 1000);
  const expiresAt = Number.isNaN(expiryDate.getTime())
    ? null
    : expiryDate.toISOString();
  return (
    <Stack as="section" p="20" g="10" bgc="base" bdrs="20">
      <Lism as="h2" fz="l">
        Before you talk
      </Lism>
      <Lism as="p">
        Match: {isSynthetic ? "fictional demo" : "verified match"} · AI mode:{" "}
        {isScripted ? "scripted demo" : "live AI"}
      </Lism>
      <Lism as="p" c="text-2" fz="s">
        Available until{" "}
        {expiresAt ? (
          <time dateTime={expiresAt}>
            {expiryDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}{" "}
            IST
          </time>
        ) : (
          "an invalid deadline"
        )}
        . Your match and Persona permission are checked again when AIBot starts.
      </Lism>
    </Stack>
  );
}

function ConsentChoices({
  draft,
  disabled,
  onChange,
}: {
  draft: Pick<SimulationConsent, "participate" | "allowPersonaUse">;
  disabled: boolean;
  onChange: (key: "participate" | "allowPersonaUse", checked: boolean) => void;
}) {
  return (
    <Stack
      as="section"
      p="20"
      g="15"
      bgc="base"
      bdrs="20"
      aria-label="Separate AI permissions"
    >
      <Lism as="h2" fz="l">
        Choose your AI permissions separately
      </Lism>
      <label>
        <input
          type="checkbox"
          checked={draft.participate}
          disabled={disabled}
          onChange={(event) =>
            onChange("participate", event.currentTarget.checked)
          }
        />{" "}
        I choose to send my own interview and conversation to AIBot and its AI
        provider.
      </label>
      <label>
        <input
          type="checkbox"
          checked={draft.allowPersonaUse}
          disabled={disabled}
          onChange={(event) =>
            onChange("allowPersonaUse", event.currentTarget.checked)
          }
        />{" "}
        I allow my approved Persona to be used by this match in AIBot.
      </label>
      <Lism as="p" c="text-2" fz="s">
        Saving these permissions does not open AIBot. You can withdraw either
        permission independently; a withdrawal stops new AI activity, but cannot
        undo an already sent inference.
      </Lism>
    </Stack>
  );
}

function SessionActions({
  isBusy,
  isExpired,
  canSave,
  canOpen,
  canRestart,
  onSave,
  onOpen,
  onRestart,
}: {
  isBusy: boolean;
  isExpired: boolean;
  canSave: boolean;
  canOpen: boolean;
  canRestart: boolean;
  onSave: () => void;
  onOpen: () => void;
  onRestart: () => void;
}) {
  return (
    <Stack g="10">
      <Lism
        as="button"
        type="button"
        set="plain"
        p="15"
        bdrs="99"
        bgc="brand"
        c="base"
        fw="bold"
        disabled={!canSave || isBusy}
        onClick={onSave}
      >
        Save AI permissions
      </Lism>
      <Lism
        as="button"
        type="button"
        set="plain"
        p="15"
        bdrs="99"
        bgc="brand"
        c="base"
        fw="bold"
        disabled={!canOpen || isBusy}
        onClick={onOpen}
      >
        Open AIBot conversation
      </Lism>
      {isExpired ? (
        <Lism
          as="button"
          type="button"
          set="plain"
          p="15"
          bdrs="99"
          bgc="base"
          c="text"
          bd
          disabled={!canRestart || isBusy}
          onClick={onRestart}
        >
          Start again with fresh authorization
        </Lism>
      ) : null}
    </Stack>
  );
}

function AuthorizedSimulation({
  entry,
  actions,
}: {
  entry: AuthorizedEntry;
  actions?: SimulationActions;
}) {
  const nowSeconds = useSyncExternalStore<number | null>(
    subscribeToClock,
    getCurrentSeconds,
    getServerSeconds,
  );
  const [saved, setSaved] = useState(entry.consent);
  const [draft, setDraft] = useState({
    participate: entry.consent.participate,
    allowPersonaUse: entry.consent.allowPersonaUse,
  });
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const gate = getSimulationGate(entry, saved, nowSeconds);
  const hasChanges =
    draft.participate !== saved.participate ||
    draft.allowPersonaUse !== saved.allowPersonaUse;
  const canAct =
    Boolean(actions) &&
    gate !== "expired" &&
    gate !== "checking" &&
    gate !== "unavailable";

  async function saveConsent(): Promise<void> {
    if (
      !actions ||
      !canAct ||
      !hasChanges ||
      entry.expiresAt <= Math.floor(Date.now() / 1000)
    )
      return;
    setIsBusy(true);
    setNotice("");
    try {
      const response = await actions.saveConsent(entry.matchId, {
        expectedVersion: saved.version,
        ...draft,
      });
      const updated = simulationConsentSchema.parse(response);
      setSaved(updated);
      setDraft({
        participate: updated.participate,
        allowPersonaUse: updated.allowPersonaUse,
      });
      setNotice(
        "AI permissions saved. Starting the conversation is a separate choice.",
      );
    } catch {
      setNotice(
        "Permissions could not be saved. Reload the current match before trying again.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function openAIBot(): Promise<void> {
    if (
      !actions ||
      gate !== "ready" ||
      hasChanges ||
      entry.expiresAt <= Math.floor(Date.now() / 1000)
    )
      return;
    setIsBusy(true);
    setNotice("");
    try {
      await actions.openAIBot();
      setNotice(
        "AIBot handoff requested. Return here if the conversation ends.",
      );
    } catch {
      setNotice(
        "AIBot could not be opened. Refresh authorization before trying again.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function restart(): Promise<void> {
    if (!actions || gate !== "expired") return;
    setIsBusy(true);
    try {
      await actions.restart();
      setNotice(
        "Fresh authorization requested. Wait for the current match to reload.",
      );
    } catch {
      setNotice(
        "A new session is unavailable. Return to Secret Tinder and try again later.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Stack g="20">
      <SessionFacts entry={entry} />
      <ConsentChoices
        draft={draft}
        disabled={!canAct || isBusy}
        onChange={(key, checked) => {
          setDraft((current) => ({ ...current, [key]: checked }));
          setNotice("");
        }}
      />
      {gate === "expired" ? (
        <Lism as="p" role="status">
          This authorization has expired. No further AI request will be sent.
          Start again with a fresh match check.
        </Lism>
      ) : null}
      {gate === "checking" ? (
        <Lism as="p" role="status">
          Checking the session deadline…
        </Lism>
      ) : null}
      {gate === "unavailable" ? (
        <Lism as="p" role="status">
          The session deadline is invalid. Return to the app.
        </Lism>
      ) : null}
      {!actions ? (
        <Lism as="p" role="status">
          Parent authentication and AIBot handoff are not connected on this
          page. Controls are disabled.
        </Lism>
      ) : null}
      <SessionActions
        isBusy={isBusy}
        isExpired={gate === "expired"}
        canSave={canAct && hasChanges}
        canOpen={canAct && gate === "ready" && !hasChanges}
        canRestart={Boolean(actions)}
        onSave={() => void saveConsent()}
        onOpen={() => void openAIBot()}
        onRestart={() => void restart()}
      />
      <Lism as="p" aria-live="polite">
        {notice}
      </Lism>
    </Stack>
  );
}

export default function Simulation({
  entry = unavailableEntry,
  actions,
}: SimulationProps) {
  return (
    <Stack as="main" p="30" g="20" bgc="base-2">
      <Stack g="10">
        <Lism as="p" fz="s" fw="bold" c="brand">
          OPTIONAL CONVERSATION
        </Lism>
        <Lism as="h1" fz="2xl">
          Talk to an approved Persona, only if you choose to.
        </Lism>
        <Lism as="p" c="text-2">
          AI conversation is separate from private matching and from any date
          request. Sending a request never means the other person accepted it.
        </Lism>
      </Stack>
      <PrivacyBoundary />
      {entry.kind === "authorized" ? (
        <AuthorizedSimulation
          key={`${entry.matchId}:${entry.consent.version}`}
          entry={entry}
          actions={actions}
        />
      ) : (
        <UnavailableSimulation />
      )}
      <Lism as="a" href="/" c="brand">
        Return to Secret Tinder
      </Lism>
    </Stack>
  );
}
