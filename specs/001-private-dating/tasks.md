# 実装タスク：プロフィールを公開せずに相手と出会う

[統合仕様（Draft）](spec.md)・[実装計画](plan.md)・[データモデル](data-model.md)・[設計判断](research.md)・[正式応募目標](prize-targets.md)を入力とする。パスはリポジトリルート基準で、新規ファイルの予定位置も含む。チェックは受入条件を満たした時に付ける。担当は役割で表す。[P] は先行条件を満たした別担当・別ファイルでの並行作業。既存T001〜T036の参照を維持するため、追加はT037〜T044とし、番号順ではなく明記した依存順で実行する。

**採用順**：A（T037→T038→T039、T041→T042→T034）→ B（T007→T011→T012）→ C（T009→T040→製品結合）。審査APIの認証準備はT003→T006を並行する。Aは入金・ZKを待たない。資格停止/異議/回復を採用し、資金は元本返却専用へ変更する。独立保証金・金銭没収は追加しない。T001・T002・T037は完了、残り41タスク。AIBot単体は実装済みで、T025〜T029は親側の結合を対象とする。T043は説明/UI、T044は条件付きSwarm追加。

## 仕様とタスクの主担当

共同作業の完了判定を下表の担当が引き受ける。各タスクのチェック欄・依存順は後続のフェーズで一元管理する。

| 主担当 | タスクID | 結合先 |
| --- | --- | --- |
| [フロントエンド仕様](frontend.md) | T004、T007、T008、T011、T012、T015、T016、T017、T020、T023、T027、T029、T035、T039、T042、T043 | T039を先行し、T014の登録参照、T013の拘束確定、T022の精算、T028のAIBot接続を後段で結合する。 |
| [バックエンド仕様](backend.md) | T003、T006、T009、T014、T025、T026、T028、T032、T034、T037、T038、T040、T041、T044 | T037・T038の資格を先行。T007・T010は製品登録の前提とし、資格だけでは検索・入室を認可しない。 |
| [スマートコントラクト仕様](smart-contract.md) | T005、T010、T013、T018、T019、T021、T022、T024 | T015・T016・T023へ入金、拘束、精算と受領の確定結果を渡す。 |
| チーム共通 | T001、T002、T030、T031、T033、T036 | 環境、共通fixture、統合試験、提出資料は3領域で共有する。提出担当がT036の判定を集約し、チームが提出する。 |

## 正式目標と提出判定の対応

公式条件と実演の合否は[応募目標と提出判定](prize-targets.md)の同じIDを使う。3目標すべての証拠作成を計画に含め、実装できたものを後から目標にする運用にはしない。証拠不足の場合の応募可否は個別に記録する。

| 判定ID | 実装・製品受入 | 賞別証拠の主担当タスク | 共通提出物・最終判定 |
| --- | --- | --- | --- |
| EF-CROPS | T008・T012・T016・T017。資金を実演する場合はT024 | T035 Web/ZK担当 | T031・T033 → T036 |
| ENS-V2 | T037〜T039・T041・T042。製品登録への結合はT014・T015 | T034 API担当（段階Aで実行） | T031・T033 → T036 |
| ARKIV-APP | T037〜T039の公開資格書込・実読取 | T032 Arkiv担当（API領域） | T031・T033 → T036。公開プロフィール登録は後段のT014・T015 |
| EF-RPC（EF枠内の追加応募） | T008 | T035内でWeb担当が別判定 | 未達でもEF-CROPSの必須条件にはしない。T036で選択を記録 |
| ARKIV-SWARM（Arkiv枠内の追加候補） | T044 | T044内でArkiv/Web担当が証拠を作成 | 未達なら追加を見送り、本賞の提出を遅らせない。T036で別判定 |

## Phase 1 — セットアップ

- [X] T001 [P] 開発担当：Node・pnpm・Hardhat・Noirのローカル版と利用可能な端末を照合し、必要な追加依存・選ぶ理由・代案・既存CIの失敗を `specs/001-private-dating/quickstart.md` に記録する。依存追加の承認後、対象package.jsonと `pnpm-lock.yaml` を同期する。
- [X] T002 [P] デモ担当：`specs/001-private-dating/fixtures/scenarios.json` に架空のA/B/C、H=8・G=3・I=2の合成辞書と指定なしを含む希望mask、SC-002の10例、SC-005の資格正負例、SC-006のN/K設定、既存の職業・年齢帯・2銘柄・期限境界を固定する。合成カテゴリを一般利用者向け分類として扱わない。

## Phase 2 — 担当間で先に固定する契約

- [ ] T003 [P] API担当：[サービス契約](contracts/service.md)の全HTTP操作を `packages/api-specs/openapi.yaml` に定義する。認証、承諾digest/認証用封筒/受付証の形式、公開／本人専用の投影、202後の照会、冪等キー、409・422・429・503を含め、OpenAPI Generatorで `packages/shared/src/generated/client.ts` を再生成できるようにする。OpenAPI契約は定義済み。固定版Generatorの実行手順は `packages/api-specs/README.md` に記載済みだが、Java 11以上またはDocker daemonが必要な実生成、`client.ts` と型検査は未完了。
- [ ] T004 [P] ZK担当：T002後、`circuits/Nargo.toml` と `circuits/protocol.md` に属性・希望mask・許可趣味のルートと288座標の導出、役割・資格世代・辞書版・transcript、群/fieldの範囲、検証鍵の版を固定する。[照合契約](contracts/matching.md)の式と平文oracleが一致することを確認し、実証明の実装は段階A後に進める。平文oracleの12試験は成功。Nargo workspace、群/fieldと検証鍵の確定は未完了。
- [ ] T005 資金担当：T003後、[精算契約](contracts/settlement.md)に沿って `apps/contract/test/fixtures/note-vectors.ts` に二者の署名対象、受付証と信頼する受付公開鍵/版、消費印、期限、受取先、各操作の公開値と期待配分を用意する。公開列にペアや申告項目の識別子を含めない。
- [ ] T006 API担当：T003後、`apps/backend/src/auth/session.ts` と `apps/backend/src/index.ts` に単回署名チャレンジ、期限・Originの確認、共通エラー、本文を残さないログ、操作IDの照会を接続する。別人の非公開操作は取得不可にする。SIWEとDurable Objectの単回消費、審査の実操作IDを使った本人200・別人404はローカルWrangler統合試験済み。認証試験は通常backend testに登録済み。公開Webからの同一Origin BFF接続は未完了。

**着手条件**：T001・T002→T037で資格契約を先に固定する。T003〜T006の準備とT005→T010→T021の資金安全性は別担当で並行可。第一段階のENSはT007・T010・T014を待たない。製品結合はT013・T014・T015等を満たし、資金を使う公開導線はT021・T024も通す。

## Phase 3 — US1：匿名登録と相性確認（P1）

**独立試験**：段階AはSC-005/007、BはSC-002、CはSC-006。候補割当、相性候補、双方承諾後の資金拘束・成立を別に判定する。段階Aの成功はUS1全体の完成ではない。

### 段階A：ENS資格を先に実証

- [X] T037 [US1] API担当：T001・T002後、`packages/shared/src/participation/schema.ts` と `specs/001-private-dating/fixtures/participation.json` に[資格契約](contracts/participation.md)のschema、署名/digest形式、状態・エラー、権限表、信頼するnamespace/issuerを固定する。公式deployment版・ABI・実コード・発行世代の確認方法を照合し、実測した公開設定だけをfixtureへ記録する。
- [ ] T038 [US1] API/Arkiv担当：T037後、`scripts/issue-participation.ts` と `apps/backend/src/participation/issuer.ts` に専用Resolver、非譲渡サブネーム、限定キー委任、署名付き公開資格のArkiv書込とENS参照更新・有限期限付き停止を実装する。審査停止は参照無効化で代替せず、基盤障害をunavailableとして区別する。`apps/contract/test/ParticipationPermissions.ts` で本人による資格/Resolver/LINK/UPGRADE/admin迂回、別参加者更新、失効鍵を拒否する。外部デプロイ・書込は必要な承認を得て実行し、ZK・入金とは依存させない。Sepolia固定ブロックの権限読取4試験と、有限停止の新版draft→署名済み内容確認→Arkiv読戻し→ENS参照更新計画のオフラインゲートは成功。実停止/回復の署名・書込・ENS更新、失効鍵の実検査は未完了。
- [ ] T039 [US1] Web担当：T038後、`apps/frontend/src/pages/Participation.tsx` と `scripts/verify-participation.ts` に2つの独立読取実装を作る。共有はschema/fixtureまでとし、後者はWebのBFF・判定・検証関数を使わずENS/Arkivを読む。eligible/ineligible/unavailable、同一ブロック/版での一致、BFF停止、旧版/再発行/別発行者拒否を確認する。WebとCLIのAlice/Bob正常系は各同一Sepoliaブロック/版で一致し、Hono停止時のWeb動作を実測済み。旧版/別発行者/Arkiv読取障害の署名fixture負例は各実装で成功。実ネットワークでの停止・再発行とWeb画面負例は未完了。
- [ ] T041 [US1] API担当：T037・T038・T006後、`apps/backend/src/participation/review.ts` と `apps/backend/src/participation/review.test.ts` に[審査契約](contracts/participation-review.md)の規則版、合成ケースの私的状態、審査/異議の役割、本人通知、有限停止の集約と有効な資格への反映、再発行時の主体継続、期限を実装する。受付だけで停止せず、無権限・利益相反・再送延長を拒否する。停止中も救済APIへ本人認証でアクセス可能にする。合成状態機械・本人専用のDurable Object保存/GET/反証/異議・他人404・停止中アクセスはローカル試験成功。接触資格で制限する通報作成、審査員決定APIと鍵、署名済み新版のArkiv/ENS反映、再発行主体台帳の永続化は未完了。
- [ ] T042 [US1] Web/検証担当：T039・T041後、`apps/frontend/src/pages/ParticipationReview.tsx` と `scripts/verify-participation.ts` に本人の根拠/期限/異議/ブロックと実効資格の確認を接続する。SC-007の署名付きtier更新と枠判定fixture、私的ブロック状態、取消/期限ちょうど/別停止が残る回復、古い版/他人アクセス拒否、公開漏えい0件を `specs/001-private-dating/evidence/participation-review.md` へ記録する。実割当への枠/ブロック反映はT040/T016、資金不変はT024で後段検証し、候補選択や入金をAの前提にしない。本人向け合成fixture UIと他人の私的表示拒否4試験は成功。本人認証/私的API・実資格更新・独立検証との接続は未完了。
- [ ] T034 [US1] API担当：T042後、SC-005/007とENS-V2を実ネットワークで検証し、`specs/001-private-dating/evidence/ens.md` に役割・deployment/ABI・参照・ブロック/取引、独立検証、停止/回復、管理者への信頼を記録する。審査詳細はT042の非公開項目検査を参照する。合成の判断と実世界の不正検出を混同しない。段階Aの技術合格と公開資料/T036の提出可を分ける。

### 段階B/Cと製品結合

- [ ] T007 [US1] ZK担当：T034の技術合格・T004後、`circuits/register/src/main.nr` と `apps/frontend/src/proofs/register.ts` に属性・希望mask・許可趣味・項目別乱数を固定する登録証明を実装する。辞書外、複数の自己申告カテゴリ、非0/1、所有者/版の差し替えを拒否する。
- [ ] T008 [P] [US1] Web担当：`apps/frontend/src/wallet/connect.ts` と `apps/frontend/src/profile/private-store.ts` にKohaku接続、Anon-RPCを標準とするSepolia読取、端末内プロフィール・秘密の暗号化バックアップと復元を実装する。対象外の読取と理由を列挙し、匿名読取の失敗時は黙って通常RPCへ迂回せず画面に返す。EF-RPCの証拠はT035へ渡す。
- [ ] T009 [US1] API担当：T012・T003・T005・T006後、`apps/backend/src/search/coordinator.ts` と `apps/backend/wrangler.jsonc` に資格/登録/預託の認可、リース、待ち時間順＋ランダム同順位の割当、各人K/同時数上限、ペア/版の再割当拒否、暗号文配送を実装する。双方承諾の封筒と現行資格を照合し、固定鍵/版で署名受付証を発行する。同一操作の再送で期限を延長せず、鍵はWorkers secretsへ置く。属性索引を作らず、切断・再送・連続検索を処理し型を再生成する。
- [ ] T010 [P] [US1] 資金担当：`apps/contract/contracts/DepositVault.sol` に原単位の入金、実残高差、入金ブロック時刻から7日の期限、noteルート、消費印、転送失敗の巻き戻しを実装する。USDC・EURCの許可アドレスで照合し、同名の別トークンと二重使用を拒否する。資金コード着手前にリポジトリ指定のethskillsを読む。
- [ ] T011 [US1] ZK担当：T007後、`circuits/matching/src/main.nr` に全288座標の登録値からの導出・暗号化、マスク内積、真偽復号の証明を実装する。[照合契約](contracts/matching.md)の群・スカラー・役割・希望mask・順序付きtranscript・資格/登録/辞書/リース版を拘束し、中間の条件別真偽を返さない。不正点・ゼロマスク・旧版を拒否する。
- [ ] T012 [US1] Web/ZK担当：T011後、`apps/frontend/src/search/match-session.ts` を独立2端末の合成入力・テスト鍵・配送で動かす。SC-002の10例を実証明で通し、条件別結果・件数・秘密入力を出さない。時間・通信量・反復や限定希望による推測を `specs/001-private-dating/evidence/matching.md` に先行記録する。安全性/性能が未達ならBを未達とし、模擬照合で置き換えない。
- [ ] T013 [US1] 資金/ZK担当：T005・T010後、`circuits/lock/src/main.nr` と `apps/contract/contracts/NoteLock.sol` に両noteの個別証明、同じ拘束digestへの双方承諾、調整用APIの受付署名/ID/期限を検証する原子的拘束を実装する。受付期限切れ・差替え・使用済みnoteを拒否し、返却用秘密を署名前に保持する。
- [ ] T014 [US1] API担当：T038・T006・T007・T010後、`apps/backend/src/registrations/registry.ts` に現行参加資格、プロフィール登録証明、許可USDC/EURCの確定預託、Arkiv公開登録版の書込/読取を結合する。資格とprofileの版を混同せず、停止・旧版・読取不能では新規検索を許可しない。製品登録の後段実証材料として残し、公開資格によるT032の賞提出判定を妨げない。
- [ ] T015 [US1] Web担当：T008・T010・T014後、`apps/frontend/src/pages/Registration.tsx` と `apps/frontend/src/pages/PublicRegistration.tsx` にSepolia上のUSDC・EURCの二択、預託前の数量・期限計算・配分・送金相関の説明、入金後の確定期限表示、確認中からの再開、仮名別の公開確認を実装する。実装は先行可だが、公開資金導線の有効化はT021・T024合格後とする。
- [ ] T016 [US1] 結合担当：T008・T012〜T015・T040後、`apps/frontend/src/pages/Search.tsx` と `apps/frontend/src/App.tsx` に資格・希望・候補割当を結合する。双方承諾の受付で資格を検証し、ID/digest/期限付き受付証を得る。停止前の同一受付が期限内に拘束確定した場合だけ既存マッチとして成立させ、新規受付/差替え/期限切れを拒否する。本人ブロックの割当/接触除外と、停止/異議中の救済/返却を分離する。公開資金導線はT021・T024合格後に有効化する。
- [ ] T017 [US1] 検証担当：T016後、`specs/001-private-dating/evidence/matching.md` にT012の先行記録を保ったままSC-001の5人、SC-002の10例、現行資格の再検証、第三者観察を追記する。SC-005/006はT034/T040を参照し、模擬負荷と実暗号を分離する。対面提示はT024から参照する。
- [ ] T040 [US1] API/検証担当：T009後、`apps/backend/src/search/coordinator.test.ts` と `specs/001-private-dating/evidence/scheduling.md` でSC-006のN=10/50、K=3、同時上限1、各10ラウンドを再現する。新規枠1・ブロック除外を追加例で確認する。自己照合/重複/失効リース/上限超過を0件とし、待ち時間・割当偏り・再接続・通信量を記録する。合成の認可・暗号処理を明示し、実暗号の性能はT012だけを根拠にする。

## Phase 4 — US2：合意終了と固定期限の元本返却（P1）

**独立試験**：成立済みマッチのfixtureで、Aの100 USDCはAへ、Bの40 EURCはBへ全額返し、運営は0。合意なし・無回答・通報/停止/異議/ブロック中も固定期限後は各自で回収する（FR-008〜012、SC-004）。

- [ ] T018 [P] [US2] 資金検証担当：`apps/contract/test/Settlement.ts` にSC-004の各所有者への全額返却、101原単位、期限境界、別チェーン/マッチ/旧規則版、相手/運営への付替え、競合・二重請求・転送失敗の試験を用意する。
- [ ] T019 [P] [US2] ZK担当：`circuits/settle/src/main.nr` に両者の合意終了署名と各noteの元銘柄・元本・所有者を保存する証明を実装する。署名は新プロトコル版と同じマッチへ拘束し、片側署名、旧90/10、減額、相手/運営出力への付替えを拒否する。
- [X] T020 [P] [US2] Web担当：`apps/frontend/src/pages/InPerson.tsx` で本人が選んだ職業または年齢帯だけを端末上で提示し、成立時の登録版に対して確認する。仮想の成立済みマッチで改変検知、非選択項目の非表示、プレビューだけでは資金が動かないことを確認する。独立ローカルfixtureとして5試験成功。実登録ルート・本番App・資金経路との結合はT007/T018/T023に残す。
- [ ] T021 [US2] 資金/ZK担当：T010後、`circuits/refund/src/main.nr`、`circuits/withdraw/src/main.nr` と `apps/contract/contracts/NoteClaims.sol` で未拘束時の取消、期限以降の単独返却、宛先を固定した個別受領を通す。入金成功後に登録を失敗させ、本人が7日を待たず全額回収できることを試す。登録再試行で期限が延びず、入金を起点とする期限ちょうどに相手・API停止中でも単独請求できることを確認する。
- [ ] T022 [US2] 資金担当：T013・T019・T021後、`apps/contract/contracts/Settlement.sol` に固定検証鍵と公開入力を接続し、合意終了による各自の全額返却だけを通す。期限ちょうど以降は単独返却とし、T018の実契約/実証明検証を通す。審査・没収・運営受取の分岐は作らない。
- [ ] T023 [US2] Web/API担当：T020〜T022後、`apps/frontend/src/pages/Settlement.tsx`、`apps/frontend/src/funds/restore-notes.ts`、`apps/backend/src/deposits/read.ts` に合意終了・本人への全額返却・署名確認・受領復元を接続する。反証や異議のUIと資金の署名を分け、停止/ブロック中も既存資金を扱えるようにする。
- [ ] T024 [US2] 検証担当：T018・T020・T022・T023後、`specs/001-private-dating/evidence/settlement.md` に期待額/実測額、公開情報からの仮名ペア/申告項目の抽出検査、選択開示、バックアップ復元を記録する。資格停止・期限切れ・ENS読取不能でも未拘束取消/期限返却/既存受領が可能なことを実契約で確認する。T015/T016の公開資金導線は本検証合格まで有効化しない。

## Phase 5 — US3：任意のAIBot会話と親側結合（P2）

**独立試験**：[AIBot契約](contracts/simulation.md)の本人引継ぎ→現行同意→承認済みPersonaとの会話→申請。単体実装は再作成せず、親側の認可/申請を結合する。旧共同手番は後続（FR-006〜008、SC-003）。

- [ ] T025 [P] [US3] API担当：T006・T013・T016・T026後、`apps/backend/src/simulation/access.ts` に成立マッチとsubject/相手Persona/現行同意/ブロック/期限の対応を実装する。Persona所有者・承認/撤回はT026の信頼できるサーバー照会で確認し、相手別の利用同意を本人認証で記録する。[AIBot契約](contracts/simulation.md)のGET match用認可を担い、架空の成立fixtureでは先行試験可。会話状態やPersonaを親へ複製しない。
- [ ] T026 [P] [US3] API・AIBot担当：`packages/api-specs/openapi.yaml` と `packages/shared/src/simulation/contract.ts` に[既存Adapter](../../ethglobal-mumbai-2026-AIBot/docs/MATCHING_ADAPTER.md)との本人引継ぎ・マッチ照会・冪等申請を定義する。HMAC形式/期限/audience、サービス認証、相手別同意の設定/撤回、失敗時、別Originを固定する。AIBotに未実装のowner subject/Persona/現行承認のメタデータ照会を担当者と定義し、ブラウザー申告だけでは関連付けない。単体の実装・作者試験は `evidence/aibot-inspection.md` を参照。サブモジュール変更が必要なら担当者と承認を得て行う。
- [ ] T027 [P] [US3] Web担当：T026後、`apps/frontend/src/pages/Simulation.tsx` に任意参加・AI送信の別同意・AIBotへの遷移・戻り・期限切れ/再開始の案内を実装する。校正/会話UIはAIBotを再利用。実AI/定型デモと架空/実マッチを別表示し、未接続の導線を製品完成と表示しない。
- [ ] T028 [US3] 結合担当：T025〜T027後、`apps/backend/src/simulation/routes.ts` と `apps/frontend/src/simulation/session.ts` に本人assertion、サービス認証付きマッチ照会、冪等デート申請、別Originの安全な引継ぎを接続する。AIBotの各操作で同意/ブロックを再確認し、親の部屋DOは追加しない。秘密・assertion・Persona・会話をPWAキャッシュや公開ログへ残さない。会話送信の結果不明時は自動再送せず終了/再開始を案内し、既存Retryや申請冪等性と区別する。Personaメタデータ照会等のAIBot変更は担当者の承認後に結合する。
- [ ] T029 [US3] 検証担当：T028後、`specs/001-private-dating/evidence/simulation.md` にSC-003の初見5人、3シーン9ターン、Retry、撤回・ブロック・失効・別主体、モデル停止・再起動、申請再送の結果を記録する。対象AIBot/親コミット、作者の既存試験と自分たちの結合試験、実AI/定型デモ/架空マッチを分離する。両リポジトリの正しいgitlinkで再現できることも確認する。

## Phase 6 — 統合・提出準備

- [ ] T043 [P] Web・提出担当：`docs/demo-script.md` と `apps/frontend/src/App.tsx` の説明/UIを「シークレットTinder」「条件→照合→任意AI会話」にそろえる。一画面の主操作を一つにし、公開登録・端末内の秘密・AI送信同意を区別する。初見の人に目的/次の操作/送信範囲を聞いた結果を `specs/001-private-dating/evidence/ux.md` に残す。台本原稿と概要UIは作成済み、初見の人による実測は未完了。T033の前提とし、技術機能の完成は主張しない。
- [ ] T044 [P] Arkiv・Web担当：条件付きで `scripts/publish-scene-assets.ts`、`apps/frontend/src/scenes/catalog.ts` に[Swarm素材契約](contracts/swarm-assets.md)の公開素材upload→Arkiv検索→Swarm read→画面表示を実装する。`arkiv/swarm.md` に公式指定証拠を残す。依存/外部書込/支払いは承認後。期限切れ・参照不正・取得不能も確認し、実施判断は3正式目標と提出準備の不足・残時間を確認して行う。採用時はT033の動画に読取箇所を追加する。未実施/未達ならT036で追加を見送りと記録する。

- [ ] T030 [P] 品質担当：`specs/001-private-dating/quickstart.md` の手順を第三者環境で再現し、Biome、frontend lint/build、Workers dry-run、Hardhat format/build/test、Noirの正負例と実証明を確認する。既存エラーと新規失敗を区別し、実測結果を `specs/001-private-dating/evidence/verification.md` に残す。
- [ ] T031 [P] 提出担当：`README.md` に起動手順、見出し`CROPS`と各項目、トラッカーの検査、公開ライセンス、ライブデモ、3目標と条件付き追加ARKIV-SWARMを記す。Classic / From Scratchの新作範囲と再利用スターター、コミット履歴、AI支援箇所とチームの貢献、仕様・プロンプト・計画への参照を確認する。賞別証拠の最終リンクとArkiv書込アドレス・クエリはT036で反映する。
- [ ] T032 [P] Arkiv担当：T037〜T039の署名付き公開資格をArkiv Rabdiへ実書込し、receipt→entity読戻し→索引反映→公開ライブ画面でのENS参照先entity実読取を確認する。`specs/001-private-dating/evidence/arkiv.md` にチェーン、書込ウォレット、取引／エンティティキー、再現クエリと画面の対応を残す。`arkiv/schema.md`、`arkiv/friction.md`、`arkiv/reach.md`、`arkiv/why-arkiv.md`、`arkiv/how-you-use-arkiv.md` を実測根拠で揃え、README用の書込アドレス・クエリをT036へ渡す。秘密・ペア・相性結果を公開せず、ログ書込のみでは完了にしない。公開資格の書込・索引CLI・ライブWeb実読取は確認済み。第三者からの再現、指定5資料と公開Git/ライブURLの最終照合は残る。公開プロフィール登録と資格新版/失効の実演は後段であり、公式必須条件とはしない。
- [ ] T033 デモ担当：T031・T043と実演可能な結果を受け、`docs/demo-script.md` を120秒の対面プレゼンへ仕上げる。キャッチコピー→利用者操作→スポンサーの役割を示し、リハーサル実測を残す。別途2〜3分の提出動画に実演箇所・対象コミット・実接続/合成/未接続・公開リンクを記録する。証明生成/取引確定待ちのカットは実測秒数を添え、同じ実行の開始/結果を残す。EF-RPC/ARKIV-SWARMは実証時のみ追加し、T036へ渡す。
- [ ] T035 [P] Web/ZK担当：T008・T016・T017・T031後、API・資金担当とEF-CROPSの情報境界とCROPS4項目を確認し、`specs/001-private-dating/evidence/ef-crops.md` に2端末の実照合、第三者観察、トラッカー検査、秘密の所在、運営依存・残る推測可能性を記す。資金経路を主張する場合はT024も照合する。Web担当は追加賞EF-RPCを `specs/001-private-dating/evidence/anon-rpc.md` で別判定し、標準読取の成功・対象範囲・例外の理由・障害時の挙動を記録する。
- [ ] T036 提出担当：T030〜T035・T043の結果とT044の実施/見送り判断（未達を含む）を集め、`specs/001-private-dating/evidence/prizes.md` にEF-CROPS・ENS-V2・ARKIV-APPと追加EF-RPC・ARKIV-SWARMの判定を個別に記録する。公式条件を再確認し、証拠・README・動画・ライブデモの主張を照合する。`README.md` に賞別証拠、Arkiv書込ウォレットと再現クエリを反映し、第三者アクセスを確認する。提出可・未達・再確認待ちの理由、担当・対象コミットを残し、チームがDashboardで選択・提出した後に選択結果と受付を記録する。資料作成だけで応募完了にしない。

## 依存関係と分担

US1のA→B→Cを優先し、資金の取消・返却は独立に並行する。US3の追加は3段階と賞別証拠の不足解消後。最終確認はT034・T012・T040・T017・T024・T029の結果に基づき、未達も記録する。T021・T024では資格停止/失効/ENS読取不能でも既存の返却権が妨げられないことを追加確認する。

賞の証拠は先にT037〜T039→T032、T039・T041→T042→T034を並行で進め、T008・T016・T017・T031→T035を確認する。T014・T015は公開プロフィール登録として後段に残す。T031はREADME、各賞担当は証拠を別ファイルで編集し、T033の動画と合わせてT036が最終集約する。US3が未達であることだけを3賞共通の応募不可条件にはしない。

| ストーリー | 並行作業の例 | 結合条件 |
| --- | --- | --- |
| US1 | Aの担当とT008の端末準備・T010の入金担当は独立。Bの後はT009の待機列とT014の登録結合を別担当で実施可 | T034→T012→T040の順。T016ではT013〜T015も必要 |
| US2 | T018 配分試験、T019 精算回路、T020 対面画面。T021の期限返却はT010後すぐに開始 | T022はUS1のT013と同じ拘束形式を使う。マッチング画面の完成を待たずローカルで精算可能 |
| US3 | T026 接続契約、T025 マッチ認可、T027 AIBotへのUI | T028で本人/同意/マッチ/申請を結合。独立AIBotの作者試験と親のT029を分離 |

## MVPと締切判断（IST）

| 区切り | 判定と優先順位 |
| --- | --- |
| **段階A** | 最初の完成単位はENS資格の独立検証。SC-005/007を通してから二者照合へ進む。資格確認の成功を入金付き製品の完成とは呼ばない。 |
| **段階B→C** | SC-002の10例→SC-006の候補割当→T016の製品結合。US2の合意精算・単独返却は別に判定し、未検証の資金経路はローカル実験と表示する。 |
| **11/7 01:00** | T032・T034・T035で正式目標3件の証拠を確認し、不足解消をUS3の追加より優先する。外部モデルがfixtureの場合は明示する。 |
| **05:30 / 08:00 / 09:00** | 05:30に機能凍結してT033の動画を仕上げる。08:00までにT036で賞別基準を判定してチームが提出する。09:00は公式締切。未達賞は理由を残し、提出済みと扱わない。提出・公開・push・外部デプロイは各操作に必要な権限を確認する。 |
