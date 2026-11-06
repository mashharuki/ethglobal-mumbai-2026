# 実装タスク：プロフィールを公開せずに相手と出会う

[確定仕様](spec.md)・[実装計画](plan.md)・[データモデル](data-model.md)・[設計判断](research.md)を入力とする。パスはリポジトリルート基準で、新規ファイルの予定位置も含む。チェックは受入条件を満たした時に付ける。担当は役割で表す。[P] は同じ段階の別担当が、先行条件を満たしてから異なるファイルで並行できる作業。

## 仕様とタスクの主担当

共同作業の完了判定を下表の担当が引き受ける。各タスクのチェック欄・依存順は後続のフェーズで一元管理する。

| 主担当 | タスクID | 結合先 |
| --- | --- | --- |
| [フロントエンド仕様](frontend.md) | T004、T007、T008、T011、T012、T015、T016、T017、T020、T023、T027、T029 | T014の登録参照、T013の拘束確定、T022の精算結果、T028の部屋操作を結合する。 |
| [バックエンド仕様](backend.md) | T003、T006、T009、T014、T025、T026、T028、T032 | T007の登録証明とT010の入金を検証し、T013の拘束確定後に限り部屋を認可する。T023の預託照会を担当する。 |
| [スマートコントラクト仕様](smart-contract.md) | T005、T010、T013、T018、T019、T021、T022、T024 | T015・T016・T023へ入金、拘束、精算と受領の確定結果を渡す。 |
| チーム共通 | T001、T002、T030、T031、T033 | 環境、共通fixture、統合試験、提出資料は3領域で共有する。 |

## Phase 1 — セットアップ

- [ ] T001 [P] 開発担当：Node・pnpm・Hardhat・Noirのローカル版と利用可能な端末を照合し、必要な追加依存・選ぶ理由・代案・既存CIの失敗を `specs/001-private-dating/quickstart.md` に記録する。依存追加の承認後、対象package.jsonと `pnpm-lock.yaml` を同期する。
- [ ] T002 [P] デモ担当：`specs/001-private-dating/fixtures/scenarios.json` に架空のA/B/C、8項目の趣味辞書、職業・年齢帯、USDCとEURCの原単位、7日の期限境界と期待結果を定義する。実名・本物の鍵を含めない。

## Phase 2 — 担当間で先に固定する契約

- [ ] T003 [P] API担当：[サービス契約](contracts/service.md)の全HTTP操作を `packages/api-specs/openapi.yaml` に定義する。認証、公開／本人専用の投影、202後の照会、冪等キー、409・422・429・503を含め、OpenAPI Generatorで `packages/shared/src/generated/client.ts` を再生成できるようにする。
- [ ] T004 [P] ZK担当：`circuits/Nargo.toml` と `circuits/protocol.md` に辞書版、ルートの算出、乱数・鍵・公開入力の順、セッション文脈、検証鍵の識別方法を固定する。固定fixtureでブラウザーとNoirが同じ入力を作れることを確認する。
- [ ] T005 [P] 資金担当：[精算契約](contracts/settlement.md)に沿って `apps/contract/test/fixtures/note-vectors.ts` に二者の署名対象、消費印、期限、受取先、各操作の公開値と期待配分を用意する。公開列にペアや申告項目の識別子を含めない。
- [ ] T006 API担当：T003後、`apps/backend/src/auth/session.ts` と `apps/backend/src/index.ts` に単回署名チャレンジ、期限・Originの確認、共通エラー、本文を残さないログ、操作IDの照会を接続する。別人の非公開操作は取得不可にする。

**着手条件**：先行実証は T001・T002 → T004 → T007 → T011 → T012 で進める。T003・T005・T006は並行し、実ウォレットと本番中継はT016で結合する。他の製品経路は共通契約の確定後に開始する。UI・回路・資金の担当は共有fixtureで個別に試せる。実際の預託拘束を伴う結合はT013を待つ。

## Phase 3 — US1：匿名登録と相性確認（P1）

**独立試験**：A/B/Cで架空登録。検索中のA/Bのみ一致し、Cには各仮名の登録だけ見える。候補の表示と双方承諾後の成立を別々に検証する（FR-001〜005、SC-001/002）。

- [ ] T007 [P] [US1] ZK担当：`circuits/register/src/main.nr` に項目別乱数で登録版を固定する証明を実装し、`apps/frontend/src/proofs/register.ts` で本物の証明を生成・検証する。所有者・登録版・入力値の差し替えは失敗させる。
- [ ] T008 [P] [US1] Web担当：`apps/frontend/src/wallet/connect.ts` と `apps/frontend/src/profile/private-store.ts` にKohaku接続、Anon RPCでのSepolia読取、端末内プロフィール・秘密の暗号化バックアップと復元を実装する。匿名読取の失敗は画面に返す。
- [ ] T009 [P] [US1] API担当：`apps/backend/src/search/coordinator.ts` と `apps/backend/wrangler.jsonc` に検索リース・所有者認可・暗号文配送・招待受付を実装する。退出・切断・再送・連続検索を処理し、必要なバインディング型を再生成する。
- [ ] T010 [P] [US1] 資金担当：`apps/contract/contracts/DepositVault.sol` に原単位の入金、実残高差、入金ブロック時刻から7日の期限、noteルート、消費印、転送失敗の巻き戻しを実装する。USDC・EURCの許可アドレスで照合し、同名の別トークンと二重使用を拒否する。資金コード着手前にリポジトリ指定のethskillsを読む。
- [ ] T011 [US1] ZK担当：T007後、`circuits/matching/src/main.nr` に暗号化したビット列、非ゼロ乱数でマスクした内積、復号した真偽の各証明を実装する。[照合契約](contracts/matching.md)の群・入力範囲・登録版・チャレンジ・リースを拘束し、不正な点、ゼロマスク、旧版を拒否する。
- [ ] T012 [US1] Web/ZK担当：T011後、`apps/frontend/src/search/match-session.ts` を独立端末2台のテスト鍵・各自の架空登録版・テスト用暗号文配送で動かす。照合は両端末で本物の証明を生成・相互検証する。一致件数を公開せず、終了済みリースから候補を追加しない。一致・不一致を各1回以上再現し、検索開始→結果表示の実時間と各端末の生成・検証時間を記録する。
- [ ] T013 [US1] 資金/ZK担当：T010後、`circuits/lock/src/main.nr` と `apps/contract/contracts/NoteLock.sol` に両noteの個別証明を同じ一回限りの拘束条件へ結ぶ処理を実装する。後継noteの復元を署名前に確認し、同じ預託を使う競合招待は一方だけ成功させる。
- [ ] T014 [US1] API担当：T007・T010後、`apps/backend/src/registrations/registry.ts` にENSv2サブネームの発行・実解決・所有権確認、Arkiv Rabdiへの公開版書込と読取、許可されたUSDC・EURCの預託確定と証明検証を接続する。更新権移転・失効・ネットワーク障害を区別する。ENS実装前に公式索引を確認する。
- [ ] T015 [US1] Web担当：T008・T010・T014後、`apps/frontend/src/pages/Registration.tsx` と `apps/frontend/src/pages/PublicRegistration.tsx` にSepolia上のUSDC・EURCの二択、預託前の数量・期限計算・配分・送金相関の説明、入金後の確定期限表示、確認中からの再開、仮名別の公開確認を実装する。
- [ ] T016 [US1] 結合担当：T008・T009・T012〜T015後、`apps/frontend/src/pages/Search.tsx` と `apps/frontend/src/App.tsx` でT012を実ウォレット・検索リース・中継に接続する。双方承諾→拘束確認中→両預託の拘束確定→成立を通し、失敗・期限切れ・競合では当該招待の部屋資格発行を拒否する。自己招待・未確定預託を拒否し、画面再読込後も同じ受付結果を表示する。
- [ ] T017 [US1] 検証担当：`specs/001-private-dating/evidence/matching.md` にSC-001の5人の時間・理解度、SC-002の5例、部外者の登録照会、各端末・中継・公開台帳の観察結果を記録する。対面提示の観察結果はT024から参照する。

## Phase 4 — US2：対面後の確認と預託金の精算（P1）

**独立試験**：成立済みマッチのfixtureから開始。Aの100 USDCについて双方が職業の虚偽に合意した場合はBに90 USDCと自身の40 EURC、運営に10 USDC。不一致・無回答では期限後に各自が全額を回収する（FR-008〜012、SC-002/004）。

- [ ] T018 [P] [US2] 資金検証担当：`apps/contract/test/Settlement.ts` にSC-004の受取額、最小単位101、期限直前と同時刻、別チェーン・別責任者・別項目、競合・二重請求、転送失敗の試験を用意する。
- [ ] T019 [P] [US2] ZK担当：`circuits/settle/src/main.nr` に同じマッチへの両者の最終署名、元銘柄別の保存則、90/10の端数、本人・相手・運営の受取先を拘束する。片側署名、回答不一致、出力先差替えで証明が通らないことを確認する。
- [ ] T020 [P] [US2] Web担当：`apps/frontend/src/pages/InPerson.tsx` で本人が選んだ職業または年齢帯だけを端末上で提示し、成立時の登録版に対して確認する。仮想の成立済みマッチで改変検知、非選択項目の非表示、プレビューだけでは資金が動かないことを確認する。
- [ ] T021 [US2] 資金/ZK担当：T010後、`circuits/refund/src/main.nr`、`circuits/withdraw/src/main.nr` と `apps/contract/contracts/NoteClaims.sol` で未拘束時の取消、期限以降の単独返却、宛先を固定した個別受領を通す。入金成功後に登録を失敗させ、本人が7日を待たず全額回収できることを試す。登録再試行で期限が延びず、入金を起点とする期限ちょうどに相手・API停止中でも単独請求できることを確認する。
- [ ] T022 [US2] 資金担当：T013・T019・T021後、`apps/contract/contracts/Settlement.sol` に固定検証鍵・公開入力照合、二者合意の配分、双方終了時の返却を接続する。期限ちょうどは返却だけを通し、T018を実契約・実証明で通す。
- [ ] T023 [US2] Web/API担当：T020〜T022後、`apps/frontend/src/pages/Settlement.tsx`、`apps/frontend/src/funds/restore-notes.ts`、`apps/backend/src/deposits/read.ts` に最終回答・配分確認・本人署名・銘柄別の確定待ちと受領状態を接続する。受取noteは暗号化配送し、再送・再起動後も同じ権利を復元する。
- [ ] T024 [US2] 検証担当：`specs/001-private-dating/evidence/settlement.md` にT018の各期待額と実測額、公開calldata・イベント・ストレージから仮名ペアや申告項目が直接読めないこと、端末の選択開示とバックアップ復元結果を記録する。

## Phase 5 — US3：二人で場面を体験する（P2）

**独立試験**：成立済みペアの部屋資格で2ターン遊ぶ。二人が選んだ行動が次の場面に反映され、再送・切断では手番が増えない。生成停止中も退出・対面意思の選択ができる（FR-006〜008、SC-003）。

- [ ] T025 [P] [US3] API担当：`apps/backend/src/rooms/room.ts` に部屋資格・参加同意・手番・revision・actionId・双方の対面意思を実装する。第三者・手番違いを拒否し、二人目の応答を一度だけ生成待ちへ進める。
- [ ] T026 [P] [US3] モデル担当：`apps/backend/src/model/generate-scene.ts` にWorld Modelとの境界を実装する。入力を共有テーマ・場面・選択履歴に限定し、2〜4選択肢を検証する。実接続と開発fixtureを表示上も識別可能にする。Python側の変更が必要ならサブモジュール作業前に確認する。
- [ ] T027 [P] [US3] Web担当：`apps/frontend/src/pages/Simulation.tsx` に任意参加、手番待ち、選択、再接続、離脱、双方の対面希望一致をfixtureで実装する。一方の希望だけでは相手に通知しない。
- [ ] T028 [US3] 結合担当：T025〜T027後、`apps/backend/src/rooms/routes.ts` と `apps/frontend/src/rooms/session.ts` に両預託の拘束確定後に発行された部屋資格による入室、生成世代の照合、失敗時の再試行を接続する。PWAのサービスワーカーが部屋・プロフィールをキャッシュしないことを確認する。
- [ ] T029 [US3] 検証担当：`specs/001-private-dating/evidence/simulation.md` に5組での所要時間、二つの選択と次場面の対応、再送・退出・生成遅延・部外者拒否の結果を記録する。SC-003の達成人数を明示する。

## Phase 6 — 統合・提出準備

- [ ] T030 [P] 品質担当：`specs/001-private-dating/quickstart.md` の手順を第三者環境で再現し、Biome、frontend lint/build、Workers dry-run、Hardhat format/build/test、Noirの正負例と実証明を確認する。既存エラーと新規失敗を区別し、実測結果を `specs/001-private-dating/evidence/verification.md` に残す。
- [ ] T031 [P] 提出担当：`README.md` に起動手順、プライバシー境界、CROPS各項目、トラッカーの検査、スターターと大会中新作の区別、AI支援・仕様・プロンプト、動作した外部連携をまとめる。公開ライセンスとライブデモを確認する。
- [ ] T032 [P] Arkiv担当：Arkiv賞を選ぶ場合、`arkiv/schema.md`、`arkiv/friction.md`、`arkiv/reach.md`、`arkiv/why-arkiv.md`、`arkiv/how-you-use-arkiv.md` に実際の公開登録データと画面読取の証拠を揃え、T031担当へ書込アドレス・再現クエリを渡す。
- [ ] T033 デモ担当：`docs/demo-script.md` に通過した経路、実験段階の経路、外部接続の有無を明記し、2〜3分の動画と提出用リンクを検証する。証明生成・取引確定の待機のみをカットし、同じ実行の開始と結果を通常速度で残す。実測秒数を字幕に添える。候補賞は実証済みの統合から選び、Hacker Dashboardへの提出はチームが行う。

## 依存関係と分担

先行実証と共通契約を並行 → US1の製品経路・US2を並行 → 端末と契約を結合 → 提出準備。US3は成立済みペアのfixtureで先行でき、本番の導線ではUS1の成立確認後に接続する。最終確認はT017・T024・T029の結果に基づき、未達のストーリーも記録する。

| ストーリー | 並行作業の例 | 結合条件 |
| --- | --- | --- |
| US1 | T007 回路、T008 端末、T009 中継、T010 入金 | T012で二者照合、T016で実預託からの双方承諾を確認 |
| US2 | T018 配分試験、T019 精算回路、T020 対面画面。T021の期限返却はT010後すぐに開始 | T022はUS1のT013と同じ拘束形式を使う。マッチング画面の完成を待たずローカルで精算可能 |
| US3 | T025 部屋、T026 モデル、T027 UI | T028で同じ世代・手番に結合し、実モデルの有無を記録 |

## MVPと締切判断（IST）

| 区切り | 判定と優先順位 |
| --- | --- |
| **11/6 15:00** | 最初の実証はT007・T011・T012の最小往復。テスト用配送でA/Bの真偽と実時間を計測し、動画尺は合否に用いない。並行して資金担当はT010・T021で入金と期限返却を試す。未達なら登録証明だけの録画も確保する。 |
| **20:00** | MVPはUS1の登録→同時検索→非公開照合→招待→拘束確定。US2の90/10・単独返却を別に判定する。資金の秘匿や回復を通せない段階ではローカル実験と表示する。 |
| **11/7 01:00** | 通ったP1の導線とUS3を結合する。外部モデルがfixtureの場合は明示し、提出する賞は実演可能なものに絞る。 |
| **05:30 / 08:00 / 09:00** | 05:30に機能凍結して録画。08:00をチーム提出の目標とし、09:00が公式締切。提出・公開・push・外部デプロイは各操作に必要な権限を確認する。 |
