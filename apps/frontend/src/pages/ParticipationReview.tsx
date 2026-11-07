import { Lism, Stack } from "lism-css/react";

import {
  type OwnedReviewPreview,
  type ReviewPreviewFixture,
  selectOwnedReviewPreview,
} from "./participation-review-preview.ts";

const caseStateText = {
  received: "受付済み",
  reviewing: "審査中",
  decided: "判断済み",
  appealed: "異議審査中",
  closed: "終了",
} as const;

function Deadline({ label, value }: { label: string; value: string }) {
  return (
    <Lism as="p">
      {label}：
      <time dateTime={value}>
        {new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Kolkata" })}{" "}
        IST
      </time>
    </Lism>
  );
}

function ParticipationState({ view }: { view: OwnedReviewPreview }) {
  const { participation } = view;
  return (
    <Stack as="article" p="20" g="10" bgc="base" bdrs="10">
      <Lism as="h4" fz="l">
        公開資格の状態（合成）
      </Lism>
      <Lism as="p">
        {participation.status === "suspended" ? "停止中" : "資格あり"} · 利用枠
        {participation.accessTier === "new" ? "新規" : "通常"} · 規則版
        {participation.policyVersion}
      </Lism>
      {participation.suspendedUntil ? (
        <Deadline label="停止期限" value={participation.suspendedUntil} />
      ) : null}
      <Lism as="p" c="text-2" fz="s">
        利用枠は信用点数ではありません。異議中でも停止を自動解除しません。
      </Lism>
    </Stack>
  );
}

function PrivateNotice({ view }: { view: OwnedReviewPreview }) {
  const { notice } = view;
  return (
    <Stack as="article" p="20" g="10" bgc="base" bdrs="10">
      <Lism as="h4" fz="l">
        本人だけの審査通知（合成）
      </Lism>
      <Lism as="p">
        状態：{caseStateText[notice.state]} · 規則：{notice.rule}
      </Lism>
      <Lism as="p">理由：{notice.reasonSummary}</Lism>
      <Lism as="p">根拠の要約：{notice.evidenceSummary}</Lism>
      <Deadline label="反証の期限" value={notice.responseDeadline} />
      <Deadline label="異議の期限" value={notice.appealDeadline} />
      <Lism as="p">
        反証：{notice.responseState === "submitted" ? "提出済み" : "未提出"} ·
        異議：{notice.appealState === "submitted" ? "提出済み" : "未提出"}
      </Lism>
      <Lism as="p" c="text-2" fz="s">
        本人認証付きAPIの接続前のため、ここから送信はできません。無回答を同意と扱いません。
      </Lism>
    </Stack>
  );
}

function RemedyBoundary({ view }: { view: OwnedReviewPreview }) {
  return (
    <Stack as="article" p="20" g="10" bgc="base" bdrs="10">
      <Lism as="h4" fz="l">
        本人ブロックと救済
      </Lism>
      <Lism as="p">
        相手との連絡：
        {view.contactBlock.isActive ? "ブロック中" : "ブロックなし"}
      </Lism>
      <Lism as="p" c="text-2" fz="s">
        本人ブロックは新規の連絡・招待に限り、他人の資格や既存の返却権を変えません。
      </Lism>
      <Lism as="p" c="text-2" fz="s">
        停止・異議中も本人の根拠確認、反証・異議、既存資金の復元・返却へ進める設計です。このプレビューは資金操作に接続していません。
      </Lism>
    </Stack>
  );
}

export default function ParticipationReview({
  fixture,
}: {
  fixture: ReviewPreviewFixture;
}) {
  const view = selectOwnedReviewPreview(fixture);
  if (!view) {
    return <Lism as="section">この本人向けの審査情報は表示できません。</Lism>;
  }
  return (
    <Stack as="section" p="30" g="20" bgc="base-2" bdrs="20">
      <Stack g="10">
        <Lism as="h3" fz="xl">
          参加状態と救済
        </Lism>
        <Lism as="p" c="text-2" fz="s">
          合成fixtureの独立プレビューです。本人認証・私的API・新版資格の実ネットワーク確認には未接続です。
        </Lism>
      </Stack>
      <ParticipationState view={view} />
      <PrivateNotice view={view} />
      <RemedyBoundary view={view} />
    </Stack>
  );
}
