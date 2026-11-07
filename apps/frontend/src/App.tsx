import { Cluster, Columns, Lism, Stack, Wrapper } from "lism-css/react";
import { lazy, Suspense, useSyncExternalStore } from "react";
import Participation from "./pages/Participation.tsx";
import { LiveParticipationReview } from "./pages/ParticipationReview.tsx";
import "./App.css";

const AnonRpcDiagnostics = import.meta.env.DEV
  ? lazy(() => import("./pages/AnonRpcDiagnostics.tsx"))
  : null;
const Simulation = import.meta.env.DEV
  ? lazy(() => import("./pages/Simulation.tsx"))
  : null;
const Registration = lazy(() => import("./pages/Registration.tsx"));

const heroBackground =
  "radial-gradient(circle at 85% 20%, color-mix(in srgb, var(--brand) 18%, transparent), transparent 40%), radial-gradient(circle at 10% 85%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 45%)";

const steps = [
  {
    number: "01",
    title: "Set your preferences",
    detail:
      "Choose what matters on your own device. You would not need a public photo or detailed profile to begin.",
  },
  {
    number: "02",
    title: "Check for mutual fit",
    detail:
      "Private matching would compare both people's preferences and shared interests. Only an overall result would be revealed.",
  },
  {
    number: "03",
    title: "Choose whether to talk",
    detail:
      "An optional AI conversation uses an approved Persona. Sending information to AI requires separate consent.",
  },
] as const;

function SiteHeader() {
  return (
    <Lism as="header" p="20">
      <Wrapper contentSize="l">
        <Cluster jc="between" g="20">
          <Lism
            as="a"
            href="#top"
            className="c--wordmark"
            fw="bold"
            c="text"
            td="none"
          >
            secret
            <Lism as="span" c="brand">
              tinder
            </Lism>
          </Lism>
          <Cluster as="nav" aria-label="Page navigation" g="20">
            <a href="#journey">How it works</a>
            <a href="#proof">Live proof</a>
            <a href="#registration">ZK registration</a>
          </Cluster>
        </Cluster>
      </Wrapper>
    </Lism>
  );
}

function HeroMessage() {
  return (
    <Stack g="30">
      <Lism as="p" fz="s" fw="bold" c="brand">
        A NEW WAY TO MEET
      </Lism>
      <Lism as="h1" fz={["3xl", null, "5xl"]} lh="s">
        Before photos,
        <br />
        <Lism as="span" c="brand">
          common ground
        </Lism>
        {" comes first."}
      </Lism>
      <Lism as="p" fz={["l", null, "xl"]} c="text-2" max-sz="m">
        Secret Tinder is a dating concept that privately compares preferences
        and lets people choose whether to start a conversation.
      </Lism>
    </Stack>
  );
}

function HeroActions() {
  return (
    <Cluster g="15">
      <Lism
        as="a"
        className="c--primaryLink"
        href="#proof"
        d="inline-flex"
        ai="center"
        g="10"
        td="none"
        fw="bold"
        c="base"
        bgc="brand"
        py="15"
        px="30"
        bdrs="99"
      >
        See the live credential demo <span aria-hidden="true">↗</span>
      </Lism>
    </Cluster>
  );
}

function Hero() {
  return (
    <Stack
      as="section"
      className="c--hero"
      id="top"
      p={["30", null, "50"]}
      g="30"
      bgi={heroBackground}
    >
      <Wrapper contentSize="l">
        <Stack g="30">
          <HeroMessage />
          <HeroActions />
          <Lism as="p" fz="s" c="text-2">
            Today, live network verification of participation credentials works.
            Private matching and product integration are still in development.
          </Lism>
        </Stack>
      </Wrapper>
    </Stack>
  );
}

function JourneyCard({ step }: { step: (typeof steps)[number] }) {
  return (
    <Stack
      as="article"
      className="c--journeyCard"
      p="30"
      g="20"
      bgc="base"
      bd
      bdrs="20"
    >
      <Lism as="span" fz="s" fw="bold" c="brand">
        {step.number}
      </Lism>
      <Lism as="h3" fz="xl">
        {step.title}
      </Lism>
      <Lism as="p" c="text-2">
        {step.detail}
      </Lism>
    </Stack>
  );
}

function Journey() {
  return (
    <Stack as="section" id="journey" p={["30", null, "50"]} g="30" bgc="base-2">
      <Wrapper contentSize="l">
        <Stack g="30">
          <Stack g="10">
            <Lism as="p" fz="s" fw="bold" c="brand">
              THE JOURNEY
            </Lism>
            <Lism as="h2" fz={["2xl", null, "3xl"]}>
              Three choices on the way to a conversation.
            </Lism>
          </Stack>
          <Columns cols={[1, null, 3]} g="20">
            {steps.map((step) => (
              <JourneyCard key={step.number} step={step} />
            ))}
          </Columns>
          <Lism as="p" c="text-2" fz="s">
            Private matching is still being built. AI conversations work in a
            separate teammate app, but the two apps are not connected yet.
          </Lism>
        </Stack>
      </Wrapper>
    </Stack>
  );
}

const proofParticipants = [
  {
    name: "alice.secrettinder.eth",
    ensTx: "0xf95064e137e787ef2e8f16ee9d7a0b582be4e6f31afae1504e0b26a422df9b5a",
    arkivTx:
      "0x9f5788fd0e4c5dc326c838bf5d5dd19a80a21503c7f3e92bde1ea3578b206399",
  },
  {
    name: "bob.secrettinder.eth",
    ensTx: "0xc798656879bcb49a22eacae9bd3beb46e28911bf9e8ec6ea9e1c333b8f4e16a5",
    arkivTx:
      "0x331de4e344cd021bbdc3b6d6bae95a1ab6fc6b5c78afe0a67a95d4c0fb214cbd",
  },
] as const;

function ProofCard({
  participant,
}: {
  participant: (typeof proofParticipants)[number];
}) {
  return (
    <Stack as="article" p="30" g="15" bgc="base-2" bdrs="20">
      <Lism as="p" fw="bold">
        {participant.name}
      </Lism>
      <Lism as="p" c="text-2" fz="s">
        ENS → Arkiv credential readback verified
      </Lism>
      <Cluster g="20">
        <a
          href={`https://sepolia.etherscan.io/tx/${participant.ensTx}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          ENS transaction ↗
        </a>
        <a
          href={`https://explorer.rabdi.arkiv.network/tx/${participant.arkivTx}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Arkiv transaction ↗
        </a>
      </Cluster>
    </Stack>
  );
}

function Proof() {
  return (
    <Stack as="section" id="proof" p={["30", null, "50"]} g="30">
      <Wrapper contentSize="l">
        <Stack g="30">
          <Stack g="10">
            <Lism as="p" fz="s" fw="bold" c="brand">
              LIVE PROOF
            </Lism>
            <Lism as="h2" fz={["2xl", null, "3xl"]}>
              Verify participation on public networks.
            </Lism>
            <Lism as="p" c="text-2" max-sz="l">
              Alice and Bob each have an issuer-signed participation credential
              on Arkiv Rabdi. Their ENS names point to the current records.
            </Lism>
          </Stack>
          <Columns cols={[1, null, 2]} g="20">
            {proofParticipants.map((participant) => (
              <ProofCard key={participant.name} participant={participant} />
            ))}
          </Columns>
          <Participation />
          <Lism as="p" c="text-2" fz="s">
            This demo proves credential issuance and public lookup. It does not
            prove compatibility, anyone&apos;s intentions, or the safety of
            funds.
          </Lism>
        </Stack>
      </Wrapper>
    </Stack>
  );
}

function subscribeToPath(): () => void {
  return () => {};
}

function getCurrentPath(): string {
  return window.location.pathname;
}

function getServerPath(): string {
  return "/";
}

export default function App() {
  const currentPath = useSyncExternalStore(
    subscribeToPath,
    getCurrentPath,
    getServerPath,
  );
  if (import.meta.env.DEV && currentPath === "/review") {
    return <LiveParticipationReview />;
  }
  if (
    import.meta.env.DEV &&
    currentPath === "/anon-rpc" &&
    AnonRpcDiagnostics
  ) {
    return (
      <Suspense fallback={<p>Loading diagnostics...</p>}>
        <AnonRpcDiagnostics />
      </Suspense>
    );
  }
  if (import.meta.env.DEV && currentPath === "/simulation" && Simulation) {
    return (
      <Suspense fallback={<p>Loading simulation preview...</p>}>
        <Simulation />
      </Suspense>
    );
  }
  return (
    <Lism isContainer className="c--landing" c="text" bgc="base">
      <SiteHeader />
      <main>
        <Hero />
        <Journey />
        <Proof />
        <Suspense fallback={<p>Loading registration...</p>}>
          <Registration />
        </Suspense>
      </main>
    </Lism>
  );
}
