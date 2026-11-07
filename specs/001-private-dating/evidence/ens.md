# 段階A ENS実ネットワーク証拠（部分達成、2026-11-07）

対象はEthereum Sepolia（chain ID `11155111`）の`secrettinder.eth`。発行者`0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E`がMetaMask Flaskで署名した。親名のRegistryデプロイと接続は[送信順](ens-transaction-sequence.md)を参照。Alice/Bobの公開アドレスは[参加者fixture](../fixtures/ens-demo-participants.json)にある。以下の取引はすべて送金額`0 ETH`、receipt `success`。

| 操作 | 取引 | block |
| --- | --- | --- |
| Alice専用Resolver `deployProxy` | [0x4e12…8a8d](https://sepolia.etherscan.io/tx/0x4e126375875f6400f3551f0436c3d26a16e2f1098ebdb5504bb6bef8483a8d88) | `12078635` |
| Bob専用Resolver `deployProxy` | [0x1cc1…a526](https://sepolia.etherscan.io/tx/0x1cc125958470eaa0eb00f0cb4a605d1352912487d25fcd1e05c04c936281a526) | `12078636` |
| `alice.secrettinder.eth`登録 | [0xd4de…f4bd](https://sepolia.etherscan.io/tx/0xd4de23234337b047fadd2ed3b52abc314a5052499089d291d43c72a36d60f4bd) | `12078638` |
| `bob.secrettinder.eth`登録 | [0x6af8…6e5b](https://sepolia.etherscan.io/tx/0x6af8093c5a999c396fd70229eafde9998830c7804637c5d118f1300fac466e5b) | `12078640` |
| Aliceに`app.endpoint` setter | [0xeb61…850b](https://sepolia.etherscan.io/tx/0xeb6116b2e66b733f5cc46fe2bbfa6105eac45a24566f14e83fd3e2aa0dcf850b) | `12078641` |
| Aliceに`app.key` setter | [0xc3d9…fb7](https://sepolia.etherscan.io/tx/0xc3d9781e805a13e0534e4bc3fafc63433e3825b38c0c9461b9fce7c837024fb7) | `12078642` |
| Bobに`app.endpoint` setter | [0x7a31…b945](https://sepolia.etherscan.io/tx/0x7a31c183a211e527c27e5710d8884f1ab1db4ce964e4eba5d5517e503f28b945) | `12078643` |
| Bobに`app.key` setter | [0x8f17…eec1](https://sepolia.etherscan.io/tx/0x8f174611dfeb2f5fcb117a953f22a3fd06be13cb98c8ba8c4825fa02c952eec1) | `12078645` |

## 同一ブロックの再検証

[公開の信頼設定](ens-trust.json)を基に、block `12078653`の[読取スナップショット](ens-onchain-snapshot.json)を保存した。親名owner・接続先、参加者Registryのコードhash、両参加者のowner・期限・resource・Resolver、FactoryのResolver実装照合が期待値と一致した。AliceのResolverは`0x28a0549e48190d69Ae8Bf6046713F766B20A5598`、Bobは`0xf40e2D397cDb891b57eA47CAeBEC26D080778a50`。両名とも登録時ロールは`0`で、現在の`ROLE_SET_RESOLVER`と`ROLE_CAN_TRANSFER_ADMIN`は本人にない。

各Resolverで本人の`app.endpoint`・`app.key`に対する`ROLE_SET_TEXT`はtrue、`app.credential`・rootの`ROLE_SET_TEXT`・rootの`ROLE_UPGRADE`はfalse。相手のResolverでは3キーとも本人の`ROLE_SET_TEXT`はfalse。発行者には各Resolverのroot `ROLE_SET_TEXT`がある。Resolverの権限がキー別であり、キー引数のresourceは`keccak256(bytes(key))`という[ENSv2の規則](https://docs.ens.domains/ensv2/permissioned-resolver/)で照合した。

読取だけの`eth_call`では、本人による自身の`app.endpoint`・`app.key`更新は両者とも成功した。本人による`app.credential`更新、相手Resolverの`app.endpoint`更新、RegistryのResolver差替え、safe/unsafe transfer、`linkToRecord`、root `ROLE_SET_TEXT`の再付与は両者ともrevertした。RPCによる実行revertを確認しており、これらは実取引や本人ウォレット所持の証明ではない。

登録receiptの`LabelRegistered`・`TokenResource`と現行owner・resource・Factory出自を`scripts/issue-participation.ts`で照合し、[Alice](ens-alice-credential-draft.json)・[Bob](ens-bob-credential-draft.json)のEIP-712資格ドラフトを生成した。発行世代IDは登録イベントから導出した。発行者がドメイン`SecretTinderParticipation v1`、chain ID `11155111`、検証Registryを含めて再署名し、[Aliceの署名済み資格](ens-alice-credential-signed.json)・[Bobの署名済み資格](ens-bob-credential-signed.json)を`verifyParticipationSignature`で照合した。最初のドメインなし署名は検証に失敗したため破棄し、公開していない。

Arkiv Rabdi（chain ID `7794095`）の公開RPCで同じ発行IDのentityが0件であることを確認し、2件の署名済み資格を[書込計画](arkiv-participation-plan.json)に固定した。発行者がAlice・Bobを各1件送信し、[Aliceの書込証拠](arkiv-alice-publication.json)・[Bobの書込証拠](arkiv-bob-publication.json)にreceiptとSDKによるentity読戻しを保存した。両方とも`EntityCreated`と公開資格のdigest・署名・発行者・期限・read-only属性が計画と一致する。取引は[Alice](https://explorer.rabdi.arkiv.network/tx/0x9f5788fd0e4c5dc326c838bf5d5dd19a80a21503c7f3e92bde1ea3578b206399)・[Bob](https://explorer.rabdi.arkiv.network/tx/0x331de4e344cd021bbdc3b6d6bae95a1ab6fc6b5c78afe0a67a95d4c0fb214cbd)。計画上限は各`1,000,000 gas × 1 gwei = 0.001 tGLM`、合計`0.002 tGLM`で、実際のgas使用量は212,708 / 204,650だった。

[ENS参照更新計画](ens-reference-plan.json)にArkiv entity key・digest・資格版を固定した。Aliceの`app.credential`は[取引](https://sepolia.etherscan.io/tx/0xf95064e137e787ef2e8f16ee9d7a0b582be4e6f31afae1504e0b26a422df9b5a)で設定され、[receiptとENS読戻し](ens-alice-reference.json)で確認した。Bobも[取引](https://sepolia.etherscan.io/tx/0xc798656879bcb49a22eacae9bd3beb46e28911bf9e8ec6ea9e1c333b8f4e16a5)で設定され、[receiptとENS読戻し](ens-bob-reference.json)で確認した。両者とも親Registryの接続、名前のowner・期限・Resolver、公式FactoryのResolver実装出自を同じ読取ブロックで照合し、ENS参照がArkiv読戻し証拠のentity key・digest・資格版と一致した。

## 独立CLIによる公開検証

`scripts/verify-participation.ts`はBackendのBFF・判定関数を呼ばず、固定した[公開の信頼設定](ens-trust.json)とENSv2 Sepolia・Arkiv Rabdiの公開状態を直接読む。親名/参加者Registry、Resolver Factory出自、本人のRegistry/root権限の欠如、`app.credential`のsetter分離、Arkiv entityの所有/署名/版/期限、登録イベントを照合する。2026-11-07に次を実測した。

| 呼出し | 判定 | 観測 |
| --- | --- | --- |
| `pnpm exec node scripts/verify-participation.ts alice 12080090` | `eligible` | ENS block `12080090`、資格版`1` |
| `pnpm exec node scripts/verify-participation.ts bob 12080090` | `eligible` | ENS block `12080090`、資格版`1` |
| `pnpm exec node scripts/verify-participation.ts charlie 12080090` | `ineligible` | `NAME_EXPIRED`、exit 1 |
| AliceのSepolia RPCを到達不能URLに変更 | `unavailable` | `ENS_UNAVAILABLE`、exit 1 |
| AliceのArkiv access keyを不正値に変更 | `unavailable` | `ARKIV_UNAVAILABLE`、exit 1 |

Alice/Bobの同一ブロック結果は、権限読取の追加後に再実行した。障害時の判定は障害を資格失効として扱わない。Arkivは実行時の現行entityを読むため、指定するSepolia過去ブロックとArkivの原子的スナップショットを保証しない。CLIの正常系と一部負例は実測した。

## ブラウザーとCLIの比較

Honoバックエンドを起動せず、Viteのローカル画面から`Participation.tsx`のAlice/Bobボタンを操作した。ブラウザー実装は共有schema・固定信頼設定以外のCLI/BFF判定コードを呼ばず、ENSv2とArkivを直接読む。公開RPCのaccess keyやウォレット接続は使用していない。

| 参加者 | Webの表示 | WebのSepolia block | 同blockを指定したCLI |
| --- | --- | --- | --- |
| Alice | `資格あり`、版`1` | `12080132` | `eligible`、版`1` |
| Bob | `資格あり`、版`1` | `12080133` | `eligible`、版`1` |

両CLI呼出しはexit 0。Webは現行ブロックを取得するためAliceとBobのblockは異なるが、各行のWeb/CLIは同一block・版で一致した。Arkivは比較時の現行entityを読んでおり、Sepoliaとの原子的なクロスチェーン状態ではない。このブラウザー操作では負例や障害/停止表示を実演していない。

## 追加の自動検証（2026-11-07）

`apps/backend/src/participation/revision.test.ts`は上記Aliceの実署名資格・現行ENS参照・信頼設定を入力とし、期限付き停止と復帰の署名前ドラフトが資格版`2`になることを確認した。旧版、再発行ID不一致、発行者改ざん、無効な停止期限、資格期限ちょうどを拒否する。`pnpm --filter backend test`は21件合格。ドラフトは署名・Arkiv公開・ENS参照更新を実行せず、実効停止を証明しない。

`scripts/verify-participation.test.ts`はWebとCLIそれぞれの独立した資格照合処理へ同じ実署名fixtureを渡し、正常系と旧版、Arkiv行の発行ID不一致、発行者改ざんを検査した。ENS/Arkiv通信エラーがそれぞれ`ENS_UNAVAILABLE`/`ARKIV_UNAVAILABLE`になることも検査した。停止期限の直前とちょうど、停止終了後の基礎資格期限切れも両実装で確認した。`node --test scripts/verify-participation.test.ts`は14件合格。停止の入力は合成fixtureであり、実署名された停止新版のネットワーク実演ではない。

`apps/contract/test/ParticipationPermissions.ts`は固定block`12078653`の既存ENSv2デプロイに対し、**読取専用**の`eth_call`で権限と実行可否を検査する。`RUN_ENS_PERMISSION_TESTS=1 node --test apps/contract/test/ParticipationPermissions.ts`は4件合格した。Aliceの`app.endpoint`/`app.key`更新は成功し、本人・Bobの資格キー更新、BobによるAliceのendpoint更新、AliceのResolver差替え・safe transfer・権限再付与はrevertした。CI通常実行では外部RPCに依存しないよう、この実ネットワーク試験はskipする。

`apps/contract/test/ParticipationDelegationFork.ts`はSepoliaのblock`12080300`をローカルHardhatへforkし、発行者アカウントを**ローカルでのみ**模擬した。Alice Resolverの`app.endpoint` setterをテスト鍵へ付与すると、その鍵でAliceの同キー更新だけが通り、`app.credential`とBobの同キー更新はrevertした。ローカル`revokeRoles`後はAliceの同キーもrevertし、roleが0へ戻ることを確認した。`RUN_ENS_FORK_TESTS=1 pnpm --filter contract test`は6件合格。fork内の取引hashはSepoliaの実取引ではなく、本人鍵の所持証明や実チェーンでの委任/失効ではない。

### 発行者側の停止・回復計画

`scripts/plan-participation-revision.ts`は`draft`→`publication`→`reference`の順に、外部書込なしで計画を生成する。入力JSONは`label`、`action: {"type":"suspend","until":<Unix秒>}`または`{"type":"restore"}`。`publication`には新版の`signedRevisionPath`、`reference`にはさらにArkiv書込後の`arkivEntityKey`を指定する。`draft`では現行ENS/Arkivを直接読み、現行参照の版・digest、所有者、登録receiptとresourceを照合してEIP-712署名用データを出す。`publication`はそのドラフトと新版署名を照合してArkivの読取専用entity作成値を出す。`reference`は指定entityをArkivから読み戻し、発行者・所有者・不変属性・版・digest・署名を確認した場合だけ、ENSの`app.credential`更新calldataを出す。各段階の出力には観測ENS blockと更新前参照を含める。取引送信や署名操作はしない。

実Aliceの現行公開状態をblock`12080307`で読み、有限停止期限`1794503600`を指定した`draft`は資格版`2`、`status=suspended`、EIP-712 message digest `0x98a196785a10cf94e44d6fdd9a10e44d498e76f96fe5e558719809a2cd212d6f`を生成した。既存版`1`のAlice署名済み資格を`publication`入力として再利用した場合は`ineligible/REVISION_MISMATCH`で終了し、書込計画を出さなかった。Sepolia RPCを到達不能URLにした`draft`は`unavailable/ENS_UNAVAILABLE`で終了した。`apps/backend/src/participation/revision-flow.test.ts`の6件を含めBackendは27件合格。実チェーンの停止は下記で別途検証した。

### Aliceの実チェーン版2停止（2026-11-07 02:36 UTC）

[有限停止→回復の固定計画](ens-alice-suspension-recovery-plan.md)に基づき、発行者がMetaMask FlaskでAlice版`2`のEIP-712を署名した。署名は`verifyParticipationSignature`で固定発行者・発行ID・資格版・期限・message digest `0x98a196785a10cf94e44d6fdd9a10e44d498e76f96fe5e558719809a2cd212d6f`を再検証した。版`1`の署名を版`2`として流用する試行は`REVISION_MISMATCH`で拒否された。

Arkiv Rabdiへの[版2書込](https://explorer.rabdi.arkiv.network/tx/0xd0d7b896dfcda8cf1bf5e886136630278fa77513a58228a2abac0e2c2a702f3b)はblock`316467`でreceipt `success`、gas使用量`204,980`、gas価格`2 gwei`だった。取引sender/宛先/nonce`3`/calldata/送金額`0`を固定計画と照合した。`EntityCreated`の発行者owner、read-only属性と新entity key`0xc7b963327b9a3d58587038e7323df2f9da97e83f4062896a4e5a2c9e53986375`を確認し、SDKのentity読戻しで資格本文・署名・版`2`・record digest`0x4f804ca73c9a00ed12108fc19890b373f4f3fe7d6b4d40bf2fd607b0617bd1c5`を照合した。発行IDでのArkiv索引検索にも版`1`と版`2`の両行が返った。

その後にのみ、Alice専用Resolverの`app.credential`を[Sepolia取引](https://sepolia.etherscan.io/tx/0xa04578be2a72106eaa5dab3cc3af6eec7d5126ffe8609ea682861e835973610e)で版`2`entityへ更新した。block`12080730`でreceipt `success`、gas使用量`124,355`、gas価格`2 gwei`。送信者/Resolver宛先/nonce`30`/`setText` calldata/送金額`0`は計画と一致した。同じblockのENS読戻しでentity key・digest・資格版`2`が一致し、独立CLIの署名・所有者・発行イベント・権限・Arkiv行検証を通過して`status=suspended`、`suspendedUntil=1794503600`を返した。

公開Vercelの「Verify Alice」をブラウザーで操作すると、`alice.secrettinder.eth : Ineligible Sepolia block 12080734 · Credential version 2 Reason: SUSPENDED`と表示された。同じSepolia block`12080734`を指定した独立CLI `node scripts/verify-participation.ts alice 12080734`は`{"verdict":"ineligible","reason":"SUSPENDED","ensBlockNumber":"12080734","credentialVersion":2}`、exit 0を返した。比較時にBFFは使用していない。Arkiv読取はその時点の現行entityを参照するため、SepoliaとArkivの原子的な同block snapshotではない。版`3`の回復はこの時点では未実施で、停止は合成参加者Aliceに対する手動実証であり審査決定に連動した停止ではない。

### 初回発行の計画ゲート（2026-11-07追加）

`scripts/issue-participation.ts`は従来の4引数`draft`を維持し、`publication`と`reference`の段階を追加した。登録receipt・現行owner/resource・親接続・Factory出自を確認して得た初回資格ドラフトと、後から渡す発行者署名済み資格のEIP-712 message hashを比較する。署名と期限が正しい場合だけArkivの読取専用entity書込値を生成する。`reference`は指定したArkiv entityを読み戻し、発行者・所有者・不変属性・版・digest・署名を照合してからENSの`app.credential`更新calldataを生成する。既存参照と異なる更新は`REFERENCE_CONFLICT`、同じ参照は`alreadyCurrent`となる。初回`publication`は参照が既に存在すると`ALREADY_ISSUED`となり、重複公開計画を出さない。外部署名・書込は行わない。

初回資格の期限は登録ブロック時刻から7日とENS名の期限の早い方に固定する。後から`publication`を実行しても、確認ブロックの時刻だけで署名本文が変わらない。期限切れ・未来の登録ブロックは拒否する。Aliceの既存署名のmessage digestがこの変更後も変わらないことを読取で確認した。

Aliceの既存公開資格では、従来の4引数`draft`がblock`12080394`で元のmessage digest `0x7376e32934e9585ba99760ddeec83ff74e3ca3469f60ebbf521289ff85a833c7`を返し、`publication`は`ALREADY_ISSUED`、既存Arkiv entityを指定した`reference`はblock`12080393`で`alreadyCurrent: true`を返した。これは既存Alice/Bob資格への書込ではない。`apps/backend/src/participation/publication-gate.test.ts`は実Alice署名fixtureで正常なArkiv計画、改ざん署名/本文拒否、読戻し後のENS calldataと可変entity拒否を5件検証した。未発行の新規参加者に対する実送信は未実施。

## 残る合格条件

- T038: 版`2`有限停止の発行者署名→Arkiv書込→ENS参照更新と読戻し、既存デプロイの読取専用権限試験、ローカルforkでの委任鍵失効を確認済み。版`3`回復、実チェーンでの委任鍵の発行/失効、本人ウォレットからの限定キー実更新は未実施。
- T039: Web/CLIの正常系比較、BFF停止時のWeb動作、実版`2`停止の同block比較は実測済み。旧版・別発行者・Arkiv行ID不一致・障害分類、合成停止期限の判定は両実装の自動テストで確認済み。再発行後の実ENSイベント照合、Web画面での障害表示、版`3`回復の両実装での実演は未完了。
- T041/T042/T034: 審査停止・異議・回復、SC-005/007の総合判定と提出用証拠。

発行者には親名と参加者Registryを管理する権限が残る。親やResolver実装の変更を検証者が追跡する必要がある。[ENSv2の権限モデル](https://docs.ens.domains/ensv2/enhanced-access-control/)に従い、名前のownerだけではroot権限や発行者署名を代替できない。現段階では段階Aの部分達成であり、SC-005合格やENS賞の応募条件達成とは判定しない。
