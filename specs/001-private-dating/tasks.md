# 実装タスク：プロフィールを公開せずに相手と出会う

[統合仕様（Draft）](spec.md)・[実装計画](plan.md)・[データモデル](data-model.md)・[設計判断](research.md)・[正式応募目標](prize-targets.md)を入力とする。パスはリポジトリルート基準で、新規ファイルの予定位置も含む。チェックは受入条件を満たした時に付ける。担当は役割で表す。[P] は先行条件を満たした別担当・別ファイルでの並行作業。既存T001〜T036の参照を維持するため、追加はT037〜T040とし、番号順ではなく明記した依存順で実行する。

**採用順**：A（T037→T038→T039→T034）→ B（T007→T011→T012）→ C（T009→T040→製品結合）。Aは入金・ZKを待たない。没収・評判の新設計は追加しない。全40タスクは未実施で、計画の更新でチェックを付けない。

## 仕様とタスクの主担当

共同作業の完了判定を下表の担当が引き受ける。各タスクのチェック欄・依存順は後続のフェーズで一元管理する。

| 主担当 | タスクID | 結合先 |
| --- | --- | --- |
| [フロントエンド仕様](frontend.md) | T004、T007、T008、T011、T012、T015、T016、T017、T020、T023、T027、T029、T035、T039 | T039を先行し、T014の登録参照、T013の拘束確定、T022の精算、T028の部屋操作を後段で結合する。 |
| [バックエンド仕様](backend.md) | T003、T006、T009、T014、T025、T026、T028、T032、T034、T037、T038、T040 | T037・T038の資格を先行。T007・T010は製品登録の前提とし、資格だけでは検索・入室を認可しない。 |
| [スマートコントラクト仕様](smart-contract.md) | T005、T010、T013、T018、T019、T021、T022、T024 | T015・T016・T023へ入金、拘束、精算と受領の確定結果を渡す。 |
| チーム共通 | T001、T002、T030、T031、T033、T036 | 環境、共通fixture、統合試験、提出資料は3領域で共有する。提出担当がT036の判定を集約し、チームが提出する。 |

## 正式目標と提出判定の対応

公式条件と実演の合否は[応募目標と提出判定](prize-targets.md)の同じIDを使う。3目標すべての証拠作成を計画に含め、実装できたものを後から目標にする運用にはしない。証拠不足の場合の応募可否は個別に記録する。

| 判定ID | 実装・製品受入 | 賞別証拠の主担当タスク | 共通提出物・最終判定 |
| --- | --- | --- | --- |
| EF-CROPS | T008・T012・T016・T017。資金を実演する場合はT024 | T035 Web/ZK担当 | T031・T033 → T036 |
| ENS-V2 | T037〜T039。製品登録への結合はT014・T015 | T034 API担当（段階Aで実行） | T031・T033 → T036 |
| ARKIV-APP | T014・T015 | T032 Arkiv担当（API領域） | T031・T033 → T036 |
| EF-RPC（EF枠内の追加応募） | T008 | T035内でWeb担当が別判定 | 未達でもEF-CROPSの必須条件にはしない。T036で選択を記録 |

## Phase 1 — セットアップ

- [ ] T001 [P] 開発担当：Node・pnpm・Hardhat・Noirのローカル版と利用可能な端末を照合し、必要な追加依存・選ぶ理由・代案・既存CIの失敗を `specs/001-private-dating/quickstart.md` に記録する。依存追加の承認後、対象package.jsonと `pnpm-lock.yaml` を同期する。
- [ ] T002 [P] デモ担当：`specs/001-private-dating/fixtures/scenarios.json` に架空のA/B/C、H=8・G=3・I=2の合成辞書と指定なしを含む希望mask、SC-002の10例、SC-005の資格正負例、SC-006のN/K設定、既存の職業・年齢帯・2銘柄・期限境界を固定する。合成カテゴリを一般利用者向け分類として扱わない。

## Phase 2 — 担当間で先に固定する契約

- [ ] T003 [P] API担当：[サービス契約](contracts/service.md)の全HTTP操作を `packages/api-specs/openapi.yaml` に定義する。認証、公開／本人専用の投影、202後の照会、冪等キー、409・422・429・503を含め、OpenAPI Generatorで `packages/shared/src/generated/client.ts` を再生成できるようにする。
- [ ] T004 [P] ZK担当：T002後、`circuits/Nargo.toml` と `circuits/protocol.md` に属性・希望mask・許可趣味のルートと288座標の導出、役割・資格世代・辞書版・transcript、群/fieldの範囲、検証鍵の版を固定する。[照合契約](contracts/matching.md)の式と平文oracleが一致することを確認し、実証明の実装は段階A後に進める。
- [ ] T005 [P] 資金担当：[精算契約](contracts/settlement.md)に沿って `apps/contract/test/fixtures/note-vectors.ts` に二者の署名対象、消費印、期限、受取先、各操作の公開値と期待配分を用意する。公開列にペアや申告項目の識別子を含めない。
- [ ] T006 API担当：T003後、`apps/backend/src/auth/session.ts` と `apps/backend/src/index.ts` に単回署名チャレンジ、期限・Originの確認、共通エラー、本文を残さないログ、操作IDの照会を接続する。別人の非公開操作は取得不可にする。

**着手条件**：T001・T002→T037で資格契約を先に固定する。T003〜T006の準備とT005→T010→T021の資金安全性は別担当で並行可。第一段階のENSはT007・T010・T014を待たない。製品結合はT013・T014・T015等を満たし、資金を使う公開導線はT021・T024も通す。

## Phase 3 — US1：匿名登録と相性確認（P1）

**独立試験**：段階AはSC-005、BはSC-002、CはSC-006。候補割当、相性候補、双方承諾後の資金拘束・成立を別に判定する。段階Aの成功はUS1全体の完成ではない。

### 段階A：ENS資格を先に実証

- [ ] T037 [US1] API担当：T001・T002後、`packages/shared/src/participation/schema.ts` と `specs/001-private-dating/fixtures/participation.json` に[資格契約](contracts/participation.md)のschema、署名/digest形式、状態・エラー、権限表、信頼するnamespace/issuerを固定する。公式deployment版・ABI・実コード・発行世代の確認方法を照合し、実測した公開設定だけをfixtureへ記録する。
- [ ] T038 [US1] API/Arkiv担当：T037後、`scripts/issue-participation.ts` と `apps/backend/src/participation/issuer.ts` に専用Resolver、非譲渡サブネーム、限定キー委任、署名付き公開資格のArkiv書込とENS参照更新・停止を実装する。`apps/contract/test/ParticipationPermissions.ts` で本人による資格/Resolver/LINK/UPGRADE/admin迂回、別参加者更新、失効鍵を拒否する。外部デプロイ・書込は必要な承認を得て実行し、ZK・入金とは依存させない。
- [ ] T039 [US1] Web担当：T038後、`apps/frontend/src/pages/Participation.tsx` と `scripts/verify-participation.ts` に2つの独立読取実装を作る。共有はschema/fixtureまでとし、後者はWebのBFF・判定・検証関数を使わずENS/Arkivを読む。eligible/ineligible/unavailable、同一ブロック/版での一致、BFF停止、旧版/再発行/別発行者拒否を確認する。
- [ ] T034 [US1] API担当：T039後、SC-005とENS-V2を実ネットワークで検証し、`specs/001-private-dating/evidence/ens.md` に役割表、deployment/ABI、名前空間、参照、ブロック/取引、2実装の結果、委任失効、停止、管理者の信頼範囲を記録する。公開コード・ライブデモへの参照はT031・T033と後で集約する。段階Aの技術合格と提出可の判定を分け、入金・登録証明を先行条件にしない。

### 段階B/Cと製品結合

- [ ] T007 [US1] ZK担当：T034の技術合格・T004後、`circuits/register/src/main.nr` と `apps/frontend/src/proofs/register.ts` に属性・希望mask・許可趣味・項目別乱数を固定する登録証明を実装する。辞書外、複数の自己申告カテゴリ、非0/1、所有者/版の差し替えを拒否する。
- [ ] T008 [P] [US1] Web担当：`apps/frontend/src/wallet/connect.ts` と `apps/frontend/src/profile/private-store.ts` にKohaku接続、Anon-RPCを標準とするSepolia読取、端末内プロフィール・秘密の暗号化バックアップと復元を実装する。対象外の読取と理由を列挙し、匿名読取の失敗時は黙って通常RPCへ迂回せず画面に返す。EF-RPCの証拠はT035へ渡す。
- [ ] T009 [US1] API担当：T012・T003・T006後、`apps/backend/src/search/coordinator.ts` と `apps/backend/wrangler.jsonc` に資格/登録/預託の認可、リース、待ち時間順＋ランダム同順位の割当、各人K/同時数上限、ペア/版の再割当拒否、暗号文配送を実装する。属性索引を作らず、切断・再送・連続検索を処理し型を再生成する。
- [ ] T010 [P] [US1] 資金担当：`apps/contract/contracts/DepositVault.sol` に原単位の入金、実残高差、入金ブロック時刻から7日の期限、noteルート、消費印、転送失敗の巻き戻しを実装する。USDC・EURCの許可アドレスで照合し、同名の別トークンと二重使用を拒否する。資金コード着手前にリポジトリ指定のethskillsを読む。
- [ ] T011 [US1] ZK担当：T007後、`circuits/matching/src/main.nr` に全288座標の登録値からの導出・暗号化、マスク内積、真偽復号の証明を実装する。[照合契約](contracts/matching.md)の群・スカラー・役割・希望mask・順序付きtranscript・資格/登録/辞書/リース版を拘束し、中間の条件別真偽を返さない。不正点・ゼロマスク・旧版を拒否する。
- [ ] T012 [US1] Web/ZK担当：T011後、`apps/frontend/src/search/match-session.ts` を独立2端末の合成入力・テスト鍵・配送で動かす。SC-002の10例を実証明で通し、条件別結果・件数・秘密入力を出さない。時間・通信量・反復や限定希望による推測を `specs/001-private-dating/evidence/matching.md` に先行記録する。安全性/性能が未達ならBを未達とし、模擬照合で置き換えない。
- [ ] T013 [US1] 資金/ZK担当：T010後、`circuits/lock/src/main.nr` と `apps/contract/contracts/NoteLock.sol` に両noteの個別証明を同じ一回限りの拘束条件へ結ぶ処理を実装する。後継noteの復元を署名前に確認し、同じ預託を使う競合招待は一方だけ成功させる。
- [ ] T014 [US1] API担当：T038・T006・T007・T010後、`apps/backend/src/registrations/registry.ts` に現行参加資格、プロフィール登録証明、許可USDC/EURCの確定預託、Arkiv公開登録版の書込/読取を結合する。資格とprofileの版を混同せず、停止・旧版・読取不能では新規検索を許可しない。T032へ実証材料を渡す。
- [ ] T015 [US1] Web担当：T008・T010・T014後、`apps/frontend/src/pages/Registration.tsx` と `apps/frontend/src/pages/PublicRegistration.tsx` にSepolia上のUSDC・EURCの二択、預託前の数量・期限計算・配分・送金相関の説明、入金後の確定期限表示、確認中からの再開、仮名別の公開確認を実装する。実装は先行可だが、公開資金導線の有効化はT021・T024合格後とする。
- [ ] T016 [US1] 結合担当：T008・T012〜T015・T040後、`apps/frontend/src/pages/Search.tsx` と `apps/frontend/src/App.tsx` に資格・希望条件・N人候補割当を結合する。割当/照合待ち/候補/拘束確認中/成立を区別する。資格は承諾・送信前にも検査し、無効なら拘束を送らない。送信後の停止は成功した拘束へ遡及せず、既存マッチの部屋/返却を維持する競合例を検証する。取引失敗・期限切れ・競合では不成立。公開資金導線の有効化はT021・T024合格後とする。
- [ ] T017 [US1] 検証担当：T016後、`specs/001-private-dating/evidence/matching.md` にT012の先行記録を保ったままSC-001の5人、SC-002の10例、現行資格の再検証、第三者観察を追記する。SC-005/006はT034/T040を参照し、模擬負荷と実暗号を分離する。対面提示はT024から参照する。
- [ ] T040 [US1] API/検証担当：T009後、`apps/backend/src/search/coordinator.test.ts` と `specs/001-private-dating/evidence/scheduling.md` でSC-006のN=10/50、K=3、同時上限1、各10ラウンドを再現する。自己照合/重複/失効リース/上限超過を0件とし、待ち時間・割当偏り・再接続・通信量を記録する。合成の認可・暗号処理を明示し、実暗号の性能はT012だけを根拠にする。

## Phase 4 — US2：対面後の確認と預託金の精算（P1）

**独立試験**：成立済みマッチのfixtureから開始。Aの100 USDCについて双方が職業の虚偽に合意した場合はBに90 USDCと自身の40 EURC、運営に10 USDC。不一致・無回答では期限後に各自が全額を回収する（FR-008〜012、SC-002/004）。

- [ ] T018 [P] [US2] 資金検証担当：`apps/contract/test/Settlement.ts` にSC-004の受取額、最小単位101、期限直前と同時刻、別チェーン・別責任者・別項目、競合・二重請求、転送失敗の試験を用意する。
- [ ] T019 [P] [US2] ZK担当：`circuits/settle/src/main.nr` に同じマッチへの両者の最終署名、元銘柄別の保存則、90/10の端数、本人・相手・運営の受取先を拘束する。片側署名、回答不一致、出力先差替えで証明が通らないことを確認する。
- [ ] T020 [P] [US2] Web担当：`apps/frontend/src/pages/InPerson.tsx` で本人が選んだ職業または年齢帯だけを端末上で提示し、成立時の登録版に対して確認する。仮想の成立済みマッチで改変検知、非選択項目の非表示、プレビューだけでは資金が動かないことを確認する。
- [ ] T021 [US2] 資金/ZK担当：T010後、`circuits/refund/src/main.nr`、`circuits/withdraw/src/main.nr` と `apps/contract/contracts/NoteClaims.sol` で未拘束時の取消、期限以降の単独返却、宛先を固定した個別受領を通す。入金成功後に登録を失敗させ、本人が7日を待たず全額回収できることを試す。登録再試行で期限が延びず、入金を起点とする期限ちょうどに相手・API停止中でも単独請求できることを確認する。
- [ ] T022 [US2] 資金担当：T013・T019・T021後、`apps/contract/contracts/Settlement.sol` に固定検証鍵・公開入力照合、二者合意の配分、双方終了時の返却を接続する。期限ちょうどは返却だけを通し、T018を実契約・実証明で通す。
- [ ] T023 [US2] Web/API担当：T020〜T022後、`apps/frontend/src/pages/Settlement.tsx`、`apps/frontend/src/funds/restore-notes.ts`、`apps/backend/src/deposits/read.ts` に最終回答・配分確認・本人署名・銘柄別の確定待ちと受領状態を接続する。受取noteは暗号化配送し、再送・再起動後も同じ権利を復元する。
- [ ] T024 [US2] 検証担当：T018・T020・T022・T023後、`specs/001-private-dating/evidence/settlement.md` に期待額/実測額、公開情報からの仮名ペア/申告項目の抽出検査、選択開示、バックアップ復元を記録する。資格停止・期限切れ・ENS読取不能でも未拘束取消/期限返却/既存受領が可能なことを実契約で確認する。T015/T016の公開資金導線は本検証合格まで有効化しない。

## Phase 5 — US3：二人で場面を体験する（P2）

**独立試験**：成立済みペアの部屋資格で2ターン遊ぶ。二人が選んだ行動が次の場面に反映され、再送・切断では手番が増えない。生成停止中も退出・対面意思の選択ができる（FR-006〜008、SC-003）。

- [ ] T025 [P] [US3] API担当：`apps/backend/src/rooms/room.ts` に部屋資格・参加同意・手番・revision・actionId・双方の対面意思を実装する。第三者・手番違いを拒否し、二人目の応答を一度だけ生成待ちへ進める。
- [ ] T026 [P] [US3] モデル担当：`apps/backend/src/model/generate-scene.ts` にWorld Modelとの境界を実装する。入力を共有テーマ・場面・選択履歴に限定し、2〜4選択肢を検証する。実接続と開発fixtureを表示上も識別可能にする。Python側の変更が必要ならサブモジュール作業前に確認する。
- [ ] T027 [P] [US3] Web担当：`apps/frontend/src/pages/Simulation.tsx` に任意参加、手番待ち、選択、再接続、離脱、双方の対面希望一致をfixtureで実装する。一方の希望だけでは相手に通知しない。
- [ ] T028 [US3] 結合担当：T025〜T027後、`apps/backend/src/rooms/routes.ts` と `apps/frontend/src/rooms/session.ts` に両預託の拘束確定後に発行された部屋資格による入室、生成世代の照合、失敗時の再試行を接続する。PWAのサービスワーカーが部屋・プロフィールをキャッシュしないことを確認する。
- [ ] T029 [US3] 検証担当：`specs/001-private-dating/evidence/simulation.md` に5組での所要時間、二つの選択と次場面の対応、再送・退出・生成遅延・部外者拒否の結果を記録する。SC-003の達成人数を明示する。

## Phase 6 — 統合・提出準備

- [ ] T030 [P] 品質担当：`specs/001-private-dating/quickstart.md` の手順を第三者環境で再現し、Biome、frontend lint/build、Workers dry-run、Hardhat format/build/test、Noirの正負例と実証明を確認する。既存エラーと新規失敗を区別し、実測結果を `specs/001-private-dating/evidence/verification.md` に残す。
- [ ] T031 [P] 提出担当：`README.md` に起動手順、見出し`CROPS`と各項目、トラッカーの検査、公開ライセンス、ライブデモ、3目標を記す。Classic / From Scratchの新作範囲と再利用スターター、コミット履歴、AI支援箇所とチームの貢献、仕様・プロンプト・計画への参照を確認する。賞別証拠の最終リンクとArkiv書込アドレス・クエリはT036で反映する。
- [ ] T032 [P] Arkiv担当：T014・T015後、ARKIV-APPの実書込→索引反映→第三者の公開登録画面での実読取、更新・失効を実演し、`specs/001-private-dating/evidence/arkiv.md` にチェーン、書込ウォレット、取引／エンティティキー、再現クエリと画面の対応を残す。`arkiv/schema.md`、`arkiv/friction.md`、`arkiv/reach.md`、`arkiv/why-arkiv.md`、`arkiv/how-you-use-arkiv.md` を実測根拠で揃え、README用の書込アドレス・クエリをT036へ渡す。秘密・ペア・相性結果を公開せず、ログ書込のみでは完了にしない。
- [ ] T033 デモ担当：T031と実演可能な製品経路の結果を受け、`docs/demo-script.md` にEF-CROPS・ENS-V2・ARKIV-APPそれぞれの実演箇所、実験段階、外部接続、対象コミットを記す。2〜3分の動画と公開リンクを確認する。証明生成・取引確定の待機だけをカットし、同じ実行の開始と結果を通常速度で残して実測秒数を添える。EF-RPCを追加する場合も実際の経路を示す。最終選択はT036へ引き渡す。
- [ ] T035 [P] Web/ZK担当：T008・T016・T017・T031後、API・資金担当とEF-CROPSの情報境界とCROPS4項目を確認し、`specs/001-private-dating/evidence/ef-crops.md` に2端末の実照合、第三者観察、トラッカー検査、秘密の所在、運営依存・残る推測可能性を記す。資金経路を主張する場合はT024も照合する。Web担当は追加賞EF-RPCを `specs/001-private-dating/evidence/anon-rpc.md` で別判定し、標準読取の成功・対象範囲・例外の理由・障害時の挙動を記録する。
- [ ] T036 提出担当：T030〜T035の結果（未達を含む）を集め、`specs/001-private-dating/evidence/prizes.md` にEF-CROPS・ENS-V2・ARKIV-APPと追加EF-RPCの判定を個別に記録する。公式条件を再確認し、証拠・README・動画・ライブデモの主張を照合する。`README.md` に賞別証拠、Arkiv書込ウォレットと再現クエリを反映し、第三者アクセスを確認する。提出可・未達・再確認待ちの理由、担当・対象コミットを残し、チームがDashboardで選択・提出した後に選択結果と受付を記録する。資料作成だけで応募完了にしない。

## 依存関係と分担

US1のA→B→Cを優先し、資金の取消・返却は独立に並行する。US3の追加は3段階と賞別証拠の不足解消後。最終確認はT034・T012・T040・T017・T024・T029の結果に基づき、未達も記録する。T021・T024では資格停止/失効/ENS読取不能でも既存の返却権が妨げられないことを追加確認する。

賞の証拠は先にT039→T034、後段でT014・T015→T032、T008・T016・T017・T031→T035とする。T031はREADME、各賞担当は証拠を別ファイルで編集し、T033の動画と合わせてT036が最終集約する。US3が未達であることだけを3賞共通の応募不可条件にはしない。

| ストーリー | 並行作業の例 | 結合条件 |
| --- | --- | --- |
| US1 | Aの担当とT008の端末準備・T010の入金担当は独立。Bの後はT009の待機列とT014の登録結合を別担当で実施可 | T034→T012→T040の順。T016ではT013〜T015も必要 |
| US2 | T018 配分試験、T019 精算回路、T020 対面画面。T021の期限返却はT010後すぐに開始 | T022はUS1のT013と同じ拘束形式を使う。マッチング画面の完成を待たずローカルで精算可能 |
| US3 | T025 部屋、T026 モデル、T027 UI | T028で同じ世代・手番に結合し、実モデルの有無を記録 |

## MVPと締切判断（IST）

| 区切り | 判定と優先順位 |
| --- | --- |
| **段階A** | 最初の完成単位はENS資格の独立検証。SC-005を通してから二者照合へ進む。資格確認の成功を入金付き製品の完成とは呼ばない。 |
| **段階B→C** | SC-002の10例→SC-006の候補割当→T016の製品結合。US2の合意精算・単独返却は別に判定し、未検証の資金経路はローカル実験と表示する。 |
| **11/7 01:00** | T032・T034・T035で正式目標3件の証拠を確認し、不足解消をUS3の追加より優先する。外部モデルがfixtureの場合は明示する。 |
| **05:30 / 08:00 / 09:00** | 05:30に機能凍結してT033の動画を仕上げる。08:00までにT036で賞別基準を判定してチームが提出する。09:00は公式締切。未達賞は理由を残し、提出済みと扱わない。提出・公開・push・外部デプロイは各操作に必要な権限を確認する。 |
