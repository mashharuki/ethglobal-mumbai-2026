# AIBotとの接続契約（採用・親側未実装）

2026-11-06。本人が確認・承認したPersonaとの自由会話を任意のP2機能として採用する。従来の二人同時参加・双方の回答待ち・2〜4択の共同World Modelは後続へ移す。親仕様のUS3、FR-006/007、SC-003とT025〜T029はこの契約を参照する。

## 実装の所在と確認範囲

`ethglobal-mumbai-2026-AIBot/` は別チームメンバーが管理するNext.js / React / TypeScriptアプリ。親のpnpm workspace・Workersへのコピーは行わず、単一Nodeプロセスと永続ディスクを持つ別サービスとして接続する。親は認可とマッチ、AIBotはインタビュー・Persona・会話画面とゲーム状態を担当する。

確認したコードは`4efa4249cce0fc3d268c7f7af1ea96deef66be3d`。作者の単体・ビルド・実API検証の報告と、今回の読み取り確認、親との結合試験を区別する。[確認記録](../evidence/aibot-inspection.md)。親コミット`a35535d`でも同じgitlinkが記録された。今後も作業ディレクトリと親gitlinkを照合し、新規クローンで再現を検証する。

## 所有する処理

| 親アプリ | AIBot | 結合時に検証すること |
| --- | --- | --- |
| 本人認証、参加資格、成立したマッチ、ブロック、相手Personaとの対応、利用への同意 | 署名付き本人引継ぎの検証、HttpOnly Cookie、所有者確認 | ブラウザーが任意のsubject / Persona / matchを選んで認可できない |
| 認可された相手とのマッチ照会 | インタビュー送信前確認、Persona抽出・修正・校正・承認、暗号化保存・撤回 | マッチング用の秘密入力を自動転送しない。Persona所有者と利用相手の同意を確認 |
| デート申請の冪等保存、相手の独立した意思確認 | 3シーン・各3ターンの自由会話、Retry、日英表示、デート申請の送信 | AIの返答・申請送信だけで相手の承諾や連絡先公開を成立させない |

## 親側が提供するAPI

正本は実装時に`packages/api-specs/openapi.yaml`へ定義する。下記のマッチ照会と申請はAIBotの[既存Adapter](../../../ethglobal-mumbai-2026-AIBot/docs/MATCHING_ADAPTER.md)に合わせる。`MATCHING_API_URL`に`/v1`までを含め、AIBotは後続のパスを連結する。

| 操作 | 入出力と認可 |
| --- | --- |
| POST /v1/simulation/identity | 親の本人セッション・Originを検証し、サーバーが選んだsubjectについて`{sub, aud: "love-match-masala", exp}`をHMAC-SHA256で署名したassertionを返す。期限は発行から15分以内。署名共有鍵はサーバー専用。URL・公開ログ・Arkivへ載せない |
| GET /v1/matches/{matchId} | AIBotのサービスBearer認証と`X-Player-Subject`を検証。`{matchId, agentPersonaId, playerSubject, simulationConsent: true, expiresAt}`を返す。主体のマッチ参加、拘束成立、ブロック、両者の現行同意、Persona対応をサーバーで確認。未認可は404、同意/期限失効は利用不可 |
| POST /v1/date-requests | 同じサービス認証と主体確認。`Idempotency-Key: gameSessionId`、body `{matchId, gameSessionId}`。同じ内容の再送は同じ`requestId`。別内容は409。原則pendingとし、acceptedは相手の独立した承諾記録がある場合のみ。連絡先の解放は別操作 |
| PUT /v1/matches/{matchId}/simulation-consents/me（新設） | 本人セッション・Origin・マッチ参加を確認し、本人のAI参加意思と、自分のPersonaをその相手に使わせる許可を別々に設定/撤回する。expectedVersionを検証し、対象主体は認証から決める。ブラウザーが他人の同意を更新できない |

**Persona所有者の引継ぎは追加実装が必要**。現在のAIBot承認APIがブラウザーへ返すpersonaIdだけでは所有者・承認状態を証明できない。T026でAIBot担当と、サービス認証付きの最小メタデータ照会（owner subject、personaId、現行承認/撤回状態と版）を定義する。AIBotのサーバーが保存する所有者を根拠に親へ結び付け、Persona本文は返さない。T025/T028で利用許可時とマッチ照会時に現行状態を確認し、取得不能ならAI利用を許可しない。これは既存Adapterだけでは満たさない未実装の接続部分であり、AIBot側の変更は担当者との承認後に行う。

ブラウザーはassertionをAIBotの`POST /api/session`へ`adultConfirmed: true`とともに送る。異なるオリジンのCookieを共有できるとは仮定しない。安全な引継ぎページまたは同一オリジンproxyのどちらかをT028で確定し、Origin・Cookie・再送・なりすましを試す。現行assertionにはnonceがないため、短期限だけを単回利用の保証と説明しない。単回引継ぎを追加する場合は両担当の変更として扱う。

AIBotは開始・発話・Retry・申請の各時点で親のマッチを再照会する。親は同意撤回・ブロック後の新規推論を拒否する。既に送信済みの外部推論を取り消せるとは約束せず、遅い返答を表示しないことも結合試験で確認する。取消・資金返却・停止理由への本人アクセスとは別の認可にする。

## データとプライバシー

- 非公開照合の趣味・希望mask・登録秘密・資金noteは本人端末に保持し、AIBotへ自動転送しない。
- AI用の入力は別の入力・同意。本人が送信を承認したインタビュー、承認済みPersona、自由会話・会話メモリーをAIBotと推論提供者が処理する。保存時暗号化は推論先からの秘匿やE2EEを意味しない。
- Persona、会話、相手との対応、assertion、鍵はArkiv / Swarmの公開領域へ保存しない。AIの返答を本人の実際の意思、性格の真実、相性の証明にしない。MVPは架空の成人Personaを使う。
- 現行はPersonaの暗号化ファイルと、プロセスメモリのidentity 8h / draft 1h / game 2h。再起動・別Node・Cookie消失後の復元を保証しない。将来の共有永続状態・本番認証・削除方針は別作業。秘密を親のDOへ二重保存しない。
- `LLM_MODE`と`DEMO_MODE`を別表示する。実OpenAI＋架空マッチは可能であり、実マッチ統合済みとは呼ばない。障害時に黙って定型応答へ置き換えない。

## 結合の合格条件

T029は架空の成人データで、認証引継ぎ→正しいマッチ/Persona→個別送信同意→3シーン9ターン→pending申請を再現する。別主体・別Persona・期限切れ・同意撤回・ブロック・相手の未承諾・再送・モデル停止・プロセス再起動を含める。失効後の新規推論と無権限閲覧を拒否し、会話中断でも資金返却は妨げない。

会話送信の冪等性は現行AIBotにない。`game/message`の結果が不明な場合、同じ発話を自動再送せず、確認不能としてそのゲームを終了し再開始を案内する方針をT027/T028で結合する。ゲーム内Retry（会話をやり直す操作）をHTTP再送の代わりに使わない。この制約で過去会話を保持した回復を保証しない。将来、operationId/revisionによる会話の冪等化を追加する場合はAIBot担当の別変更とする。申請APIの冪等性とは分けて検証する。

T025〜T029は親側の結合が未完了のため未チェックを維持する。AIBot単体を独立デモとして見せる場合は「架空マッチ／親未接続」を明示し、US1やSC-003の製品結合合格と数えない。
