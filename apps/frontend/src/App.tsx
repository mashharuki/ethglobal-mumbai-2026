import { Cluster, Columns, Lism, Stack, Wrapper } from "lism-css/react";
import Participation from "./pages/Participation.tsx";
import "./App.css";

const heroBackground =
  "radial-gradient(circle at 85% 20%, color-mix(in srgb, var(--brand) 18%, transparent), transparent 40%), radial-gradient(circle at 10% 85%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 45%)";

const steps = [
  {
    number: "01",
    title: "自分の条件を決める",
    detail:
      "何を重視するかは、まず自分の端末で選ぶ。写真や詳細なプロフィールの公開から始めない。",
  },
  {
    number: "02",
    title: "共通点を確かめる",
    detail:
      "互いの希望と共通の趣味を照合し、相手に伝えるのは全体の結果だけ。条件別の答えは見せない。",
  },
  {
    number: "03",
    title: "話すかどうか選ぶ",
    detail:
      "希望すれば、承認したPersonaとのAI会話を試せる。AIへ送る情報には別の同意が必要。",
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
          <Cluster as="nav" aria-label="ページ内ナビゲーション" g="20">
            <a href="#journey">体験の流れ</a>
            <a href="#proof">公開検証</a>
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
        写真より先に、
        <br />
        <Lism as="span" c="brand">
          共通点
        </Lism>
        から。
      </Lism>
      <Lism as="p" fz={["l", null, "xl"]} c="text-2" max-sz="m">
        Secret
        Tinderは、条件を非公開で照合し、話すかどうかを自分で選ぶ出会いのアイディアです。
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
        公開資格の実演を見る <span aria-hidden="true">↗</span>
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
            現在は参加資格の実ネットワーク検証まで実装。非公開照合と製品連携は開発中です。
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
              出会うまでの、3つの選択。
            </Lism>
          </Stack>
          <Columns cols={[1, null, 3]} g="20">
            {steps.map((step) => (
              <JourneyCard key={step.number} step={step} />
            ))}
          </Columns>
          <Lism as="p" c="text-2" fz="s">
            条件照合は設計・実装中です。AI会話は別チームの単体アプリで実演できますが、マッチングアプリとの接続は未完了です。
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
        ENS → Arkiv資格を読戻し確認済み
      </Lism>
      <Cluster g="20">
        <a
          href={`https://sepolia.etherscan.io/tx/${participant.ensTx}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          ENS取引 ↗
        </a>
        <a
          href={`https://explorer.rabdi.arkiv.network/tx/${participant.arkivTx}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Arkiv取引 ↗
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
              参加資格を、公開ネットワークで確認する。
            </Lism>
            <Lism as="p" c="text-2" max-sz="l">
              AliceとBobの参加資格をArkiv
              Rabdiへ公開し、それぞれのENS名から現行の資格を参照できるようにしました。
            </Lism>
          </Stack>
          <Columns cols={[1, null, 2]} g="20">
            {proofParticipants.map((participant) => (
              <ProofCard key={participant.name} participant={participant} />
            ))}
          </Columns>
          <Participation />
          <Lism as="p" c="text-2" fz="s">
            実証したのは資格発行と公開参照です。恋愛相性、本人の誠実さ、資金の安全性をこの資格だけで保証するものではありません。
          </Lism>
        </Stack>
      </Wrapper>
    </Stack>
  );
}

export default function App() {
  return (
    <Lism isContainer className="c--landing" c="text" bgc="base">
      <SiteHeader />
      <main>
        <Hero />
        <Journey />
        <Proof />
      </main>
    </Lism>
  );
}
