# Secret Tinder

**Common ground before photos.** A hackathon prototype exploring private matching, verifiable participation, and an optional AI Persona conversation.

**[Live demo](https://ethglobal-mumbai-2026.vercel.app/)** · [120-second pitch and recording plan](docs/demo-script.md)

> Current state (7 November 2026): Alice and Bob have issuer-signed participation credentials on Arkiv Rabdi, referenced by separate ENSv2 names on Ethereum Sepolia. A browser verifier and independent CLI read those public records. Private matching, deposits, and the parent-app/AIBot handoff remain in development. The [landing page](apps/frontend/src/App.tsx) explains the journey; it is not a completed matching flow.

## The idea in 30 seconds

1. Choose preferences without publishing a detailed profile.
2. Check mutual preferences and shared interests, revealing only the overall match result.
3. Decide whether to talk. An AI conversation with an approved Persona is optional and requires separate consent.

ENSv2 separates issuer control of the participation credential from participant control of limited profile keys. Arkiv holds the issuer-signed public credential. Neither a credential nor an AI conversation proves that a person is trustworthy or compatible.

## What works now

| Capability | Status | Evidence |
| --- | --- | --- |
| ENSv2 names and separate resolvers for Alice/Bob | Verified on Sepolia | [ENS transaction and permission evidence](specs/001-private-dating/evidence/ens.md) |
| Issuer-signed public participation credentials | Written and read back on Arkiv Rabdi | [Alice](specs/001-private-dating/evidence/arkiv-alice-publication.json) · [Bob](specs/001-private-dating/evidence/arkiv-bob-publication.json) |
| ENS `app.credential` references to Arkiv entities | Written and read back on Sepolia | [Alice](specs/001-private-dating/evidence/ens-alice-reference.json) · [Bob](specs/001-private-dating/evidence/ens-bob-reference.json) |
| Independent participation verification | Browser and CLI read ENSv2 and Arkiv without the Hono backend | [Browser source](apps/frontend/src/pages/Participation.tsx) · [CLI source](scripts/verify-participation.ts) · [comparison](specs/001-private-dating/evidence/ens.md#ブラウザーとcliの比較) |
| SIWE session and private-operation read API | Implemented and tested locally; not deployed or connected to the live frontend | [Backend source](apps/backend/src/auth/session.ts) · [API contract](packages/api-specs/openapi.yaml) · [integration record](specs/001-private-dating/evidence/verification.md) |
| In-person selective-disclosure preview | Synthetic local fixture only; not connected to a real registration or match | [UI source](apps/frontend/src/pages/InPerson.tsx) · [limit and tests](specs/001-private-dating/evidence/verification.md) |
| Private preference matching and candidate selection | Design and implementation in progress | [Implementation plan](specs/001-private-dating/plan.md) |
| Optional AI Persona conversation | Built in a teammate-owned [submodule](ethglobal-mumbai-2026-AIBot/); parent integration pending | [Inspection record](specs/001-private-dating/evidence/aibot-inspection.md) |

The participation issuer is `0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E`. Its authority over the parent name and Registry is a trust assumption, not a decentralized guarantee.

### Reproduce the public participation reads

| Participant | ENS name | Arkiv entity key | ENS reference transaction |
| --- | --- | --- | --- |
| Alice | `alice.secrettinder.eth` | `0x628a86b2b8d2ee96d9b91b92a9013f10ce67421e4792bf7911c46234d92ab5d6` | [Sepolia](https://sepolia.etherscan.io/tx/0xf95064e137e787ef2e8f16ee9d7a0b582be4e6f31afae1504e0b26a422df9b5a) |
| Bob | `bob.secrettinder.eth` | `0x4e253c8b29d21b401d99a970bfe8624d0d27bd835e49962006e8c1440d39c151` | [Sepolia](https://sepolia.etherscan.io/tx/0xc798656879bcb49a22eacae9bd3beb46e28911bf9e8ec6ea9e1c333b8f4e16a5) |

Arkiv write transactions: [Alice](https://explorer.rabdi.arkiv.network/tx/0x9f5788fd0e4c5dc326c838bf5d5dd19a80a21503c7f3e92bde1ea3578b206399) · [Bob](https://explorer.rabdi.arkiv.network/tx/0x331de4e344cd021bbdc3b6d6bae95a1ab6fc6b5c78afe0a67a95d4c0fb214cbd).

The Arkiv writer wallet is `0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E`. Reproducible, indexed queries for the public issuance IDs are below. The public endpoint worked for both names on 7 November 2026, but is heavily rate limited. For repeated reads, set `ARKIV_ACCESS_KEY` privately from your own [Arkiv Hub](https://hub.arkiv.network/access-keys) account; do not commit or paste it into an issue. These are CLI evidence tools, not a user-facing feature or a third-party environment test.

Arkiv submission notes: [schema](arkiv/schema.md), [friction](arkiv/friction.md), [reach](arkiv/reach.md), [why Arkiv](arkiv/why-arkiv.md), [how we use Arkiv](arkiv/how-you-use-arkiv.md). These describe observed behavior and remaining limits.

```sh
pnpm --filter backend exec node scripts/query-publications.ts 0x5d688d733b4a46be18d41c9fe5c35e9b60db847d4467bf1942723100cefecc2c
pnpm --filter backend exec node scripts/query-publications.ts 0x7bfef7a2d485ad0f25ed0b30cc94458aea0c23da3c846c013709035b53fc9247
```

It selects the `secret_tinder_participation_v1` schema, filters the indexed `issuance_id` by equality, scopes the original creator to the issuer, and checks the current owner and read-only flag. The live results returned the expected entity keys for Alice and Bob; see the [Arkiv read evidence](specs/001-private-dating/evidence/arkiv.md). The result is discovery data; the signed content and current ENS reference must still be verified before deciding eligibility.

The verification scripts compare transaction calldata and receipts with the pinned plans, read the public entity and ENS reference, and refresh the local evidence JSON files. They do not submit transactions:

```sh
pnpm --filter backend exec node scripts/verify-publication.ts alice 0x9f5788fd0e4c5dc326c838bf5d5dd19a80a21503c7f3e92bde1ea3578b206399
pnpm --filter backend exec node scripts/verify-publication.ts bob 0x331de4e344cd021bbdc3b6d6bae95a1ab6fc6b5c78afe0a67a95d4c0fb214cbd
pnpm --filter backend exec node scripts/verify-reference.ts alice 0xf95064e137e787ef2e8f16ee9d7a0b582be4e6f31afae1504e0b26a422df9b5a
pnpm --filter backend exec node scripts/verify-reference.ts bob 0xc798656879bcb49a22eacae9bd3beb46e28911bf9e8ec6ea9e1c333b8f4e16a5
```

These scripts are issuer-side evidence checks. A separate read-only CLI verifies eligibility from the public ENSv2 and Arkiv state without calling our backend or importing its verification code:

```sh
pnpm exec node scripts/verify-participation.ts alice 12080090
pnpm exec node scripts/verify-participation.ts bob 12080090
```

Both names returned `eligible` at Sepolia block `12080090` with credential version `1` on 7 November 2026. The CLI checks registry and resolver provenance, scoped permissions, the Arkiv entity and issuer signature, registration events, current owner and expiry. Its `ineligible` and `unavailable` results are separate. The browser verifier performs those reads independently of the Hono backend; [Alice/Bob browser results matched the CLI at the same Sepolia blocks](specs/001-private-dating/evidence/ens.md#ブラウザーとcliの比較). Arkiv reads use its current state, so a historical Sepolia block does not create an atomic cross-chain snapshot. The end-to-end matching flow remains unfinished. The public Arkiv endpoint may rate-limit requests; set `ARKIV_ACCESS_KEY` privately for repeated CLI reads.

## Run locally

Requirements: Node 24 and pnpm 11.

```sh
git submodule update --init --recursive
pnpm install --frozen-lockfile
pnpm --filter frontend dev
```

Open the URL printed by Vite. The public verifier needs no wallet or secrets and works with the Hono backend stopped; it sends the selected public ENS name to Sepolia and Arkiv RPCs. The Hono backend has local SIWE authentication and a private-operation read route, but these are not connected to the live Vercel frontend. Participation issuance and issuer evidence checks currently run as scripts. The AIBot is a teammate-owned submodule with separate setup instructions. Do not put wallet keys, RPC access keys, or private profile data in the repository.

## CROPS

The intended private matching system has these design boundaries. Its end-to-end implementation is **not yet verified**.

| Property | Intended behavior and current limit |
| --- | --- |
| Censorship resistance | ENS and Arkiv public records can be read independently, but the issuer, backend coordination, and RPC availability remain dependencies. |
| Open source | The parent repository's specification and code are under [MIT](LICENSE). The teammate-owned AIBot submodule has separate authorship; its license has not been confirmed. The landing page builds without it after initialization, while the optional AI demo requires its own setup. |
| Privacy | Matching attributes and preferences are intended to remain on devices. Public ENS/Arkiv credentials, wallet addresses, transaction times, and an optional AI Persona are linkable or disclosed to their respective services. |
| Security | Issuer signatures bind the public credential, and ENS key permissions separate roles. Private matching proofs, deposit safety, and review recovery have not passed the planned acceptance tests. |

The current frontend source, HTML, Vite configuration, and public assets were searched for Google Analytics, Tag Manager, Segment, Mixpanel, PostHog, Amplitude, Plausible, Clarity, Hotjar, Sentry, and pixel/tracker references on 7 November 2026; none were found. This is a static source check, not a network traffic audit of a deployed app or the separate AIBot.

## Prize targets and submission state

We are preparing for **Ethereum Foundation (Best CROPS App)**, **ENS (Best Use of ENSv2)**, and **Arkiv (Build on Arkiv)**. The Arkiv + Swarm bonus remains conditional and is not demonstrated. The [official-condition mapping](specs/001-private-dating/prize-targets.md) lists each acceptance gate. The browser and CLI public reads support a partial ENS/Arkiv demonstration; they do not establish submission readiness for any prize. Suspension and recovery, Arkiv update/expiry, the CROPS end-to-end demo, and final video still require verification.

On 7 November 2026, a fresh request to the [production URL](https://ethglobal-mumbai-2026.vercel.app/) returned HTTP 200 with the Secret Tinder page. In a clean browser, the live Alice and Bob buttons independently returned `資格あり` (eligible), credential version 1 at Sepolia block `12080239`. An existing Chrome profile still showed the earlier Vite starter, consistent with its old PWA service worker caching the page. The Vercel-only worker retirement in this branch is prepared for a later deployment and has **not** been verified live. Until then, use a clean browser profile for the demo. The [two-minute in-person script](docs/demo-script.md) is separate from the required 2–3 minute submission video; neither has a recorded human rehearsal yet.

## Structure and provenance

- `apps/frontend`: React/Vite/Void landing page and planned user flows.
- `apps/backend`: Hono/Workers starter and participation issuance/evidence code.
- `packages/shared`: credential schemas and EIP-712 signing format.
- `packages/api-specs`: OpenAPI HTTP contract; generated client is pending.
- `apps/contract`: Hardhat starter, with deposit contracts planned.
- `ethglobal-mumbai-2026-AIBot`: teammate-owned, separately implemented AI Persona app.
- `specs/001-private-dating`: Spec Kit specification, plan, tasks, fixtures, and evidence.

This project builds on public starter templates and a teammate-owned AIBot submodule. The Git history distinguishes new hackathon work from the starter; review it before selecting a submission track. AI tools, including Codex, assisted with specification writing, integration planning, evidence scripts, and the landing page. Team members supplied the concept, sponsor feedback, wallet signatures, and the AIBot implementation. See the submodule repository for its authorship and setup; its license has not been confirmed. The parent repository is licensed under [MIT](LICENSE). The current [specification](specs/001-private-dating/spec.md), [plan](specs/001-private-dating/plan.md), [tasks](specs/001-private-dating/tasks.md), and [acceptance guide](specs/001-private-dating/quickstart.md) record the implementation scope and prompts for further work.
