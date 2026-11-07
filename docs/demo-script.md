# Secret Tinder — 120-second pitch and submission video

**Tagline:** Secret Tinder: common ground before photos.

This is an English script, not a recording. As of 7 November 2026, no complete timed rehearsal, submission video or five first-time-viewer observations are recorded. The 120-second booth pitch is separate from ETHGlobal's 2–4 minute video; the [EF CROPS prize](https://ethglobal.com/events/mumbai/prizes/ethereum-foundation) requires its video to be **at most three minutes**. Target a 2:40 video, then replace every planned duration below with measured footage. [ETHGlobal video guidance](https://ethglobal.com/events/mumbai/info/details) permits editing unnecessary waits but forbids speeding footage up; use a human voice and at least 720p.

## Claim labels to keep on screen

| Label | What can be shown | Boundary to say aloud |
| --- | --- | --- |
| **LIVE TESTNET** | [Public verifier](https://ethglobal-mumbai-2026.vercel.app/) reads Alice/Bob ENSv2 names on Sepolia, follows the current `app.credential` reference, and reads their issuer-signed Arkiv Rabdi entities. Previous clean-browser checks returned `Eligible`, version 1; [ENS](../specs/001-private-dating/evidence/ens.md) and [Arkiv](../specs/001-private-dating/evidence/arkiv.md) record the transactions and independent CLI. | Read the **current** block and result from the screen. A credential proves the configured issuer signed a participation record, not identity, character, compatibility or a completed match. |
| **LOCAL TECHNICAL TEST** | The Anon-RPC diagnostic read Sepolia block `12080644` through the official worker in a local browser. A separate synthetic Noir/BB fixture generated and verified matching proofs in the ZK worktree. | The public ENS/Arkiv verifier still uses direct RPC. The synthetic proof is not a two-device, live-profile private match. Check the final merged commit and rerun the local fixture before including either clip. |
| **NOT CONNECTED** | Optional AI Persona conversation exists in the teammate-owned AIBot app; funding and private settlement are separate work. | No parent-app AI handoff, production match, deposit or refund path is demonstrated here. Never stage a fictional match as live. |

## Booth pitch — planned 120 seconds

Before approaching the mentor, open the [live page](https://ethglobal-mumbai-2026.vercel.app/) in a clean browser profile, find the proof section, and verify both buttons and the network. The previous English-page check was at Sepolia block `12080445`; that is historical evidence, **not** the block to read during the pitch. If a live read fails, say it is unavailable and show the [transaction and CLI record](../README.md#verify-it-yourself) as previous evidence, without calling that a live success.

| Planned time | Screen and action | Spoken point |
| --- | --- | --- |
| 0:00–0:12 | Hero and “See the live credential demo.” | Hook: dating begins with too much personal data and snap judgments. |
| 0:12–0:28 | Three-step overview. | The intended flow is private preferences → mutual check → optional conversation. Matching is still being built. |
| 0:28–1:12 | Scroll to proof; click Alice, wait for the result, then Bob. Point to each current block and version. | This working layer checks public participation without trusting our Hono backend. |
| 1:12–1:36 | Point to ENS name, `app.credential`, Arkiv entity and issuer in the UI/README. | ENSv2 separates the issuer's reference authority from participant keys; Arkiv holds the publicly readable signed record. |
| 1:36–1:52 | Show the claim-label table, not a fabricated match screen. | A local Anon-RPC read and synthetic Noir proofs are technical tests; neither is the deployed private matching flow. |
| 1:52–2:00 | Return to the hero. | AI conversation and funds remain unconnected. Invite feedback on this verified participation layer and the privacy direction. |

### English words to speak

> Secret Tinder: common ground before photos. Dating often starts with a face and a large personal profile. We want people to choose private preferences, check for mutual interest, and only then decide whether to talk. That matching journey is still in development.
>
> Here is what works on testnet. Alice and Bob have ENSv2 names. The issuer controls the credential reference, while participants have separate limited keys. Each current ENS reference points to an issuer-signed public credential on Arkiv Rabdi. I'll check Alice, then Bob. This browser reads both networks directly, without our backend. The result on screen is a participation check, not a claim about character or compatibility.
>
> We have also tested an Anon-RPC read locally and verified synthetic Noir matching proofs. The live verifier still uses direct RPC, and those proofs are not a live match between two people. Our teammate's optional AI Persona app and the funds flow are not connected here. We would value feedback on the verified ENS and Arkiv layer and where private matching should go next.

This script is about 175 words. Its speaking time, two live network waits and total duration are **unmeasured**. Shorten the opening first if a human rehearsal exceeds 120 seconds; do not skip the “local” and “not connected” qualifiers.

## Submission video — planned 2:40, under three minutes

Use one clearly labeled recording sequence. Keep operation starts and their results from the same attempt visible. If editing removes an unnecessary wait, show the cut and record the uncut wait below. Do not use old successful output as if it came from a newly recorded click. The current site and source commit must be checked again immediately before filming.

| Planned time | Shot | Spoken claim and label | Actual clip / wait |
| --- | --- | --- | --- |
| 0:00–0:18 | Hero, tagline and one-sentence problem. | “Common ground before photos.” The matching flow is the goal. | ________ |
| 0:18–0:35 | Three steps and the single “See the live credential demo” action. | Mark private matching and optional AI as still in development. | ________ |
| 0:35–1:15 | On the public URL, click Alice and Bob separately; show `Eligible`, version and the **current** Sepolia block for each. | **LIVE TESTNET:** ENS current reference → Arkiv entity → issuer signature. If either read fails, keep the failure and describe it honestly. | Alice ________ / Bob ________ |
| 1:15–1:35 | README's issuer wallet, two Arkiv write transactions, indexed query and independent CLI. | **RECORDED TESTNET EVIDENCE:** indexed discovery and the browser's current-key read are distinct paths. | ________ |
| 1:35–1:55 | Local Anon-RPC diagnostic only if rerun on the final commit. | **LOCAL TECHNICAL TEST:** worker-backed Sepolia read. The public credential page still uses direct RPC, so do not claim Anon-RPC is the default app route. | ________ |
| 1:55–2:20 | Local synthetic Noir proof verification, with its command, beginning and result; include generation only if it fits at normal speed. | **LOCAL SYNTHETIC PROOF:** no live two-device matching, verified enrollment, lease or production privacy claim. | ________ |
| 2:20–2:40 | Status/next step card with source links. | ENS/Arkiv participation works on testnet. AI handoff and funding/settlement are not connected. | ________ |

The current live page is a public participation verifier. A synthetic Noir clip cannot satisfy EF-CROPS's requirement for the lead privacy property to work end to end. Do not say that any prize has been won or that a Hacker Dashboard application was accepted. Add EF-RPC or Arkiv + Swarm claims only after their separate end-to-end evidence exists.

### Fill this from the actual recording

| Operation in the final video | Start timestamp | Result timestamp | Uncut wait (s) | Same attempt and status shown? |
| --- | --- | --- | --- | --- |
| Alice ENS→Arkiv read | ________ | ________ | ________ | ________ |
| Bob ENS→Arkiv read | ________ | ________ | ________ | ________ |
| Local Anon-RPC worker ready → `eth_blockNumber` | ________ | ________ | ________ | ________ |
| Synthetic Noir prove, if shown | ________ | ________ | ________ | ________ |
| Synthetic Noir verify, if shown | ________ | ________ | ________ | ________ |

Recording URL: ________ · Actual length: ________ · Resolution: ________ · Date/time: ________ · Live URL: ________ · Repository and target commit: ________ · Browser: ________ · Presenter: ________.

Booth rehearsal duration: ________ · Presenter: ________ · Five first-time viewers tested: **no, pending** · What each understood about purpose, next action and data sent: [UX observation sheet](../specs/001-private-dating/evidence/ux.md) (blank until observed). Give the final clip timestamps and any failure or omitted shot to the [prize decision record](../specs/001-private-dating/evidence/prizes.md). Recording, rehearsal and those five observations have **not** happened yet.
