# Secret Tinder

> **Common ground before photos.**

**Secret Tinder is a private-matching prototype where only the overall match result is revealed.**
People choose preferences without publishing a detailed profile. ENSv2 and Arkiv make each
person's participation credential publicly verifiable, without exposing what they are looking for.

[![Concept replay: two private profiles exchange ciphertext through a relay; ENS gives pseudonyms and Arkiv holds public records. Two-party ZK and private settlement are unverified.](docs/assets/private-dating-overview.gif)](https://ethglobal-mumbai-2026.vercel.app/)

**[▶ Try the live verifier](https://ethglobal-mumbai-2026.vercel.app/)**
 · **[120-second pitch](docs/demo-script.md)**
 · **[日本語の概要](#日本語の概要)**

<sub>The animation is a concept replay. Two-party ZK matching, deposits and private settlement are
**not yet verified**. What runs today is the public ENSv2 + Arkiv participation credential and its
independent verifiers.</sub>

## Executive summary

**Dating apps ask you to publish yourself first.** Photos and detailed profiles are public before
anyone knows whether there is common ground. Secret Tinder reverses the order: match first,
reveal later — and let anyone check that the other person is a real participant.

| | In one sentence |
|---|---|
| **Customer** | People who want to meet someone without publishing their preferences, and client developers who want to verify participation without trusting our API. |
| **Problem** | Today, proving "this person is a real participant" usually means trusting one company's database, and matching means handing that company everything. |
| **Product** | Preferences stay on the device; only the overall match result is revealed; an AI Persona conversation is optional and needs separate consent. |
| **Technical edge** | ENSv2 separates the issuer's control of the credential reference from the participant's limited profile keys. Arkiv holds the issuer-signed credential, readable without our backend. |
| **Working proof** | Alice and Bob have issuer-signed credentials on **Arkiv Rabdi**, referenced from **`alice.secrettinder.eth` / `bob.secrettinder.eth`** on Ethereum Sepolia. A browser verifier and an independent CLI both return `eligible` at the same block. |
| **Not yet** | Private preference matching, deposits, suspension/recovery and the parent-app ↔ AIBot handoff are in development. |
| **License** | Parent repository: [MIT](LICENSE). |

### What makes the combination valuable

- **A credential that survives our backend.** The browser verifier and the CLI read ENSv2 and
  Arkiv directly. Stop the Hono server and verification still works.
- **The issuer and the participant hold different keys.** The issuer can update only the
  `app.credential` reference; the participant can update only scoped keys such as
  `app.endpoint` / `app.key`. That boundary is enforced by ENSv2 resolver roles, not by our code.
- **A credential is not a compatibility score.** It says "issued by this issuer, current, not
  expired" — nothing about trustworthiness or romance. We keep that distinction visible on screen.

<details>
<summary><strong>日本語の概要</strong></summary>

<a id="日本語の概要"></a>

**写真より先に、共通点から。**

Secret Tinderは、詳しいプロフィールを公開せずに条件を選び、全体として合うかどうかだけを知る
マッチングの試作です。参加資格はENSv2とArkivで公開検証でき、探している条件は公開しません。

- **顧客：** 条件を公開せずに出会いたい人と、発行者のAPIを信用せずに参加資格を確認したい別クライアントの開発者。
- **強み：** ENSv2で発行者の資格参照と本人の限定キーの権限を分離。Arkivに発行者署名つきの公開資格を置き、バックエンドなしで読める。
- **実証：** Alice/BobのArkiv公開資格とSepoliaのENS参照を書き込み、ブラウザーと独立CLIが同じブロックで`eligible`を返すことを確認。
- **未完了：** 秘密の条件照合、預託金、停止/回復、AIBotとの結合は開発中です。
- **AI会話：** 承認済みPersonaとのAI会話は任意で、別の同意が必要です。

</details>

## Check the proof

| What to inspect | Evidence | Scope |
|---|---|---|
| **Alice and Bob are verifiable participants** | [Live verifier](https://ethglobal-mumbai-2026.vercel.app/) · [browser vs CLI comparison](specs/001-private-dating/evidence/ens.md#ブラウザーとcliの比較) | Both returned `eligible`, credential version 1. Sepolia + Arkiv Rabdi testnets. |
| **ENSv2 names, resolvers and role separation** | [ENS transaction and permission evidence](specs/001-private-dating/evidence/ens.md) | Real Sepolia transactions signed by the issuer. |
| **Signed credentials live on Arkiv** | [Alice](specs/001-private-dating/evidence/arkiv-alice-publication.json) · [Bob](specs/001-private-dating/evidence/arkiv-bob-publication.json) · [read evidence](specs/001-private-dating/evidence/arkiv.md) | Written, read back and found by indexed query. |
| **ENS points to the Arkiv entity** | [Alice](specs/001-private-dating/evidence/ens-alice-reference.json) · [Bob](specs/001-private-dating/evidence/ens-bob-reference.json) | `app.credential` written and read back on Sepolia. |

**The issuer `0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E` is a trust assumption.** Its authority over
the parent name and Registry is not a decentralized guarantee.

<details>
<summary><strong>Explore the implementation, reproduction steps and limits</strong></summary>

## Built on, and with

| | What we used it for | Proof |
|---|---|---|
| ⛓️ **ENSv2** | One subname and a dedicated resolver per participant. The issuer writes only `app.credential`; the participant holds scoped keys | [evidence](specs/001-private-dating/evidence/ens.md) |
| 🗄️ **Arkiv** | Issuer-signed public credential as a read-only, wallet-owned entity with expiration; indexed by `issuance_id` | [schema](arkiv/schema.md) · [read evidence](specs/001-private-dating/evidence/arkiv.md) |
| 🛡️ **CROPS (Ethereum Foundation)** | Design boundaries for censorship resistance, open source, privacy and security. **End-to-end not yet verified** | [CROPS](#crops) |
| 🤖 **AI Persona** | Optional conversation with an approved Persona, in a teammate-owned [submodule](ethglobal-mumbai-2026-AIBot/). **Parent integration pending** | [inspection record](specs/001-private-dating/evidence/aibot-inspection.md) |

## What actually runs — with something to check

| | State | Check it yourself |
|---|---|---|
| **ENSv2 names and separate resolvers for Alice/Bob** | ✅ verified on Sepolia | [ENS evidence](specs/001-private-dating/evidence/ens.md) |
| **Issuer-signed public credentials** | ✅ written and read back on Arkiv Rabdi | [Alice](specs/001-private-dating/evidence/arkiv-alice-publication.json) · [Bob](specs/001-private-dating/evidence/arkiv-bob-publication.json) |
| **ENS `app.credential` → Arkiv entity** | ✅ written and read back on Sepolia | [Alice](specs/001-private-dating/evidence/ens-alice-reference.json) · [Bob](specs/001-private-dating/evidence/ens-bob-reference.json) |
| **Independent participation verification** | ✅ browser and CLI, without the Hono backend | [browser](apps/frontend/src/pages/Participation.tsx) · [CLI](scripts/verify-participation.ts) |
| **SIWE session and private-operation read API** | ⚠️ implemented and tested locally; not deployed or connected to the live frontend | [source](apps/backend/src/auth/session.ts) · [API contract](packages/api-specs/openapi.yaml) · [record](specs/001-private-dating/evidence/verification.md) |
| **In-person selective-disclosure preview** | ⚠️ synthetic local fixture only | [UI](apps/frontend/src/pages/InPerson.tsx) · [record](specs/001-private-dating/evidence/verification.md) |
| **Private preference matching** | 🚧 design and implementation in progress | [plan](specs/001-private-dating/plan.md) |
| **Optional AI Persona conversation** | 🚧 built in the submodule; parent integration pending | [inspection](specs/001-private-dating/evidence/aibot-inspection.md) |

## Verify it yourself

| Participant | ENS name | Arkiv entity key | ENS reference tx |
|---|---|---|---|
| Alice | `alice.secrettinder.eth` | `0x628a86b2b8d2ee96d9b91b92a9013f10ce67421e4792bf7911c46234d92ab5d6` | [Sepolia](https://sepolia.etherscan.io/tx/0xf95064e137e787ef2e8f16ee9d7a0b582be4e6f31afae1504e0b26a422df9b5a) |
| Bob | `bob.secrettinder.eth` | `0x4e253c8b29d21b401d99a970bfe8624d0d27bd835e49962006e8c1440d39c151` | [Sepolia](https://sepolia.etherscan.io/tx/0xc798656879bcb49a22eacae9bd3beb46e28911bf9e8ec6ea9e1c333b8f4e16a5) |

Arkiv write transactions: [Alice](https://explorer.rabdi.arkiv.network/tx/0x9f5788fd0e4c5dc326c838bf5d5dd19a80a21503c7f3e92bde1ea3578b206399) · [Bob](https://explorer.rabdi.arkiv.network/tx/0x331de4e344cd021bbdc3b6d6bae95a1ab6fc6b5c78afe0a67a95d4c0fb214cbd).

```sh
git submodule update --init --recursive
pnpm install --frozen-lockfile

# Independent read-only verifier: ENSv2 + Arkiv only, no backend code
pnpm exec node scripts/verify-participation.ts alice 12080090
pnpm exec node scripts/verify-participation.ts bob 12080090
```

**Both names returned `eligible` at Sepolia block `12080090` with credential version `1`** on
7 November 2026. The CLI checks registry and resolver provenance, scoped permissions, the Arkiv
entity and issuer signature, registration events, current owner and expiry. `ineligible` and
`unavailable` are reported separately. Arkiv reads use its current state, so a historical Sepolia
block is not an atomic cross-chain snapshot.

Find each credential by its public issuance ID (schema `secret_tinder_participation_v1`, indexed
`issuance_id`, creator scoped to the issuer, owner and read-only flag checked):

```sh
pnpm --filter backend exec node scripts/query-publications.ts 0x5d688d733b4a46be18d41c9fe5c35e9b60db847d4467bf1942723100cefecc2c
pnpm --filter backend exec node scripts/query-publications.ts 0x7bfef7a2d485ad0f25ed0b30cc94458aea0c23da3c846c013709035b53fc9247
```

Issuer-side evidence checks compare calldata and receipts with the pinned plans and refresh the
local evidence JSON. They do not submit transactions:

```sh
pnpm --filter backend exec node scripts/verify-publication.ts alice 0x9f5788fd0e4c5dc326c838bf5d5dd19a80a21503c7f3e92bde1ea3578b206399
pnpm --filter backend exec node scripts/verify-publication.ts bob 0x331de4e344cd021bbdc3b6d6bae95a1ab6fc6b5c78afe0a67a95d4c0fb214cbd
pnpm --filter backend exec node scripts/verify-reference.ts alice 0xf95064e137e787ef2e8f16ee9d7a0b582be4e6f31afae1504e0b26a422df9b5a
pnpm --filter backend exec node scripts/verify-reference.ts bob 0xc798656879bcb49a22eacae9bd3beb46e28911bf9e8ec6ea9e1c333b8f4e16a5
```

The public Arkiv endpoint worked on 7 November 2026 but is heavily rate limited. For repeated reads,
set `ARKIV_ACCESS_KEY` privately from your own [Arkiv Hub](https://hub.arkiv.network/access-keys)
account. Never commit it or paste it into an issue.

## Run locally

Requirements: Node 24 and pnpm 11.

```sh
git submodule update --init --recursive
pnpm install --frozen-lockfile
pnpm --filter frontend dev
```

The public verifier needs no wallet or secrets and works with the Hono backend stopped; it sends
the selected public ENS name to Sepolia and Arkiv RPCs. Participation issuance and issuer evidence
checks run as scripts. The AIBot submodule has its own setup instructions. Do not put wallet keys,
RPC access keys or private profile data in the repository.

## CROPS

The intended private matching system has these design boundaries. Its end-to-end implementation
is **not yet verified**.

| Property | Intended behavior and current limit |
|---|---|
| **Censorship resistance** | ENS and Arkiv records can be read independently, but the issuer, backend coordination and RPC availability remain dependencies. |
| **Open source** | Parent specification and code under [MIT](LICENSE). The teammate-owned AIBot submodule has separate authorship; its license has not been confirmed. |
| **Privacy** | Matching attributes and preferences are intended to stay on devices. Public credentials, wallet addresses, transaction times and an optional AI Persona are linkable or disclosed to their services. |
| **Security** | Issuer signatures bind the public credential and ENS key permissions separate roles. Private matching proofs, deposit safety and review recovery have not passed acceptance tests. |

**No trackers in the frontend source.** On 7 November 2026 the frontend source, HTML, Vite config
and public assets were searched for Google Analytics, Tag Manager, Segment, Mixpanel, PostHog,
Amplitude, Plausible, Clarity, Hotjar, Sentry and pixel references; none were found. This is a
static source check, not a network audit of the deployment or the AIBot.

## Prize targets and submission state

| Target | State |
|---|---|
| **ENS — Best Use of ENSv2** | Alice/Bob credentials and role separation demonstrated on Sepolia. Suspension/recovery unfinished. |
| **Arkiv — Build on Arkiv** | Alice/Bob credentials written on Rabdi; the live browser reads the current entities. Credential update/expiry demo unfinished. Notes: [schema](arkiv/schema.md) · [friction](arkiv/friction.md) · [reach](arkiv/reach.md) · [why Arkiv](arkiv/why-arkiv.md) · [how we use Arkiv](arkiv/how-you-use-arkiv.md) |
| **Ethereum Foundation — Best CROPS App** | Design boundaries documented; the private-matching flow and its video are **not done**. |
| Arkiv + Swarm bonus | Conditional; not demonstrated. |

The [official-condition mapping](specs/001-private-dating/prize-targets.md) lists each acceptance
gate. Third-party reproduction and the final submission decision remain open.

On 7 November 2026 the [production URL](https://ethglobal-mumbai-2026.vercel.app/) returned the
Secret Tinder page, and in a clean browser the Alice and Bob buttons returned `資格あり` (eligible),
credential version 1 at Sepolia block `12080239`. An older Chrome profile still showed the Vite
starter from a cached PWA service worker; **use a clean browser profile for the demo** until the
service-worker retirement in this branch is deployed and checked.

## What we will not claim

| We say | We do not say |
|---|---|
| "This ENS name references an issuer-signed credential on Arkiv, here are the transactions" | "This person is trustworthy or compatible" |
| "The browser and CLI verify without our backend" | "There is no trusted party" — the issuer is one |
| "ENSv2 roles separate what the issuer and the participant can change" | Anything about ENSv2 beyond that role boundary |
| "Private matching is designed to reveal only the overall result" | "Private matching works" — it has not passed acceptance tests |
| "An AI Persona conversation exists in the AIBot app" | "It is integrated with matching" — the handoff is pending |

## Structure and provenance

| Path | What it is |
|---|---|
| `apps/frontend` | React/Vite/Void landing page and the read-only participation verifier |
| `apps/backend` | Hono/Workers starter, SIWE session, participation issuance and evidence scripts |
| `packages/shared` | Credential schemas and EIP-712 signing format |
| `packages/api-specs` | OpenAPI HTTP contract; generated client pending |
| `apps/contract` | Hardhat starter; deposit contracts planned |
| `ethglobal-mumbai-2026-AIBot` | Teammate-owned, separately implemented AI Persona app |
| `specs/001-private-dating` | Specification, plan, tasks, fixtures and evidence |

This project builds on public starter templates and a teammate-owned AIBot submodule; the Git
history separates new hackathon work from the starter. AI tools, including Codex and Claude Code,
assisted with specification writing, integration planning, evidence scripts and the landing page.
Team members supplied the concept, sponsor feedback, wallet signatures and the AIBot
implementation. Scope and prompts for further work: [spec](specs/001-private-dating/spec.md) ·
[plan](specs/001-private-dating/plan.md) · [tasks](specs/001-private-dating/tasks.md) ·
[acceptance guide](specs/001-private-dating/quickstart.md).

</details>

---

**ETHGlobal Mumbai 2026** · MIT · built by [mashharuki](https://github.com/mashharuki) and
[Jun0908](https://github.com/Jun0908) · ENSv2 + Arkiv participation credentials verified on testnet
