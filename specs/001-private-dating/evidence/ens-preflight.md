# ENSv2 Sepolia 読取専用プレフライト（2026-11-06）

これはT038の書込前確認。SC-005の合格証拠ではない。`node scripts/plan-participation.ts parent`をSepoliaのblock `12076726`で実行し、同一ブロックの値から発行計画を生成した。ABI/住所は[ENS公式Sepolia一覧](https://docs.ens.domains/learn/deployments/)が指す[デプロイ成果物](https://github.com/ensdomains/contracts-v2/blob/07e55a056f5b6a9c90119f501bdd05714e67dddd/contracts/deployments/sepolia/ETHRegistry.json)に合わせた。

| 確認項目 | 読取結果 |
| --- | --- |
| 親名 | `secrettinder.eth` |
| 親のETHRegistry | `0xD4eBcbBdF463C9c45784603Db0dDD499BC44A8B4` |
| 親owner / 指定発行者 | `0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E` |
| 親の期限（Unix秒） | `1825526676` |
| 親のsubregistry | ゼロアドレス（未接続） |
| 発行者の親名`ROLE_SET_SUBREGISTRY` | `true` |
| VerifiableFactory | `0xda70306c98e97ece36f997a21368e53298572991` |
| factoryのproxyLogic | `0xC41576B4B809B99CF0fF2e5B41b4F147cd9b6BDd` |
| UserRegistry実装 | `0x9bd8a88719068d09ecee662f36c0e3856708366a` |
| PermissionedResolver実装 | `0x115eb53f0c60696633855f90b138178fb40b2b2c` |
| 予測した参加者用Registry | `0x8A189F48764C466972c0244C5671B4461C958E8C`（このブロックではコードなし・未接続） |

Factory・UserRegistry実装・Resolver実装の実コードhashは順に`0x141dc0d5ee8c60ae9b9cce12c870d3babc28719602238ee0f77016a9f1916265`、`0xed6d71bc90b0882fa63ef78a8dddabff2730b4c1cab9eab2ad91fa2aacd269f7`、`0x02d6c15c6443251e5d3c5acbd971d66057c8e13ee0d0f046d5c65cd27a20b007`。これらはこのブロックで取得したコードのhashであり、将来の状態保証ではない。

2026-11-07（IST）のblock `12078364`で再読取した。owner・期限・subregistry・親名の設定権限・Factory/実装コードhash・予測Registryの未デプロイ状態は上表と同じだった。これは確認時点の状態であり、取引送信前には再読取する。

block `12078365`の[親Registry発行計画](ens-parent-plan.json)には、Factoryの`deployProxy`と親ETHRegistryの`setSubregistry`の送信先・calldataを保存した。実行順はデプロイ→receiptと予測アドレス/実装の照合→親への接続→現行状態の再検証。JSONは発行者ウォレットによる署名や送信を含まない。

親の接続から参加者発行までの依存と確認手順は[未送信のENS送信順](ens-transaction-sequence.md)に整理した。

## Alice/Bobの未送信プレビュー

ユーザー指定の公開アドレスを[ENSデモ参加者fixture](../fixtures/ens-demo-participants.json)に記録し、ENSラベルを`alice`/`bob`とした。`participant-preview`を使い、[Alice計画](ens-alice-plan.json)はblock `12078379`、[Bob計画](ens-bob-plan.json)はblock `12078382`で作成した。両方とも予測Registryは`0x8A189F48764C466972c0244C5671B4461C958E8C`、親への接続はfalse、Registryコードは未存在。Resolver予測値はAliceが`0x28a0549e48190d69Ae8Bf6046713F766B20A5598`、Bobが`0xf40e2D397cDb891b57eA47CAeBEC26D080778a50`で別々だった。

保存したcalldataをデコードし、各`register`のlabel・owner・Resolver・`roleBitmap=0`、`grantSetterRoles`の受領アドレスと対象キー`app.endpoint`/`app.key`を照合した。プレビューの登録期限は確認ブロック時刻から7日で、親Registry接続後に現行状態と期限を再取得して計画を作り直す。Bobのプレビューは公開RPCの読取が2回失敗した後に成功した。失敗原因は特定できていない。

公開Sepoliaの`eth_call`で、親RegistryのFactoryデプロイはblock `12078390`に予測アドレスを返し、ガス見積りは`928498`だった。親名への接続はblock `12078391`で呼出しが成功し、ガス見積りは`140677`だった。Alice/BobのResolverデプロイはblock `12078392`でそれぞれ予測アドレスを返し、ガス見積りは各`816973`だった。これらは未送信のシミュレーションで、receiptや永続状態の証拠ではない。子の`register`と限定キーgrantはRegistry/Resolver未デプロイのため実ネットワークでのシミュレーションをしていない。

block `12078385`のSepolia ETH残高は発行者が`137.058953682100413728`、Alice/Bobがともに`0`だった。本人による限定キー更新を実演するには、各本人ウォレットのガス代を用意するか、別途明示的な代行方式を実装する必要がある。残高は変動するため、送信直前に再確認する。

`planParentRegistry`は発行者のroot権限を登録・登録解除・更新・Resolver差替えに限定し、参加者の登録時ロールをゼロとする。`planParticipant`は参加者ごとに別Resolverを予測し、本人に`app.endpoint`と`app.key`のsetterだけを計画する。Factoryのデプロイと親への接続のcalldataはスクリプトの出力に含まれる。実行前に現行ブロックでowner・権限・コード・予測アドレスの状態を再確認する。

登録receiptから署名対象を生成する読取専用CLIも用意したが、参加者用Registryが未接続のため成功経路は未実行。Arkivへの書込、資格署名、本人キー委任、独立クライアント検証は行っていない。したがってT038・T039・T034は未完了。外部書込はリポジトリの承認境界に従って実行する。

ユーザーは2026-11-07（IST）に親Registryの2取引を発行者ウォレットで進めることを承認した。BraveのSepolia Etherscan Factory `deployProxy`フォームに、保存計画から復号したimplementation・salt・初期化dataを入力した。ウォレットは未接続で、送信・署名は行っていない。block `12078432`でも予測Registryのコードはなく、親のsubregistryはゼロアドレスだった。フォームの入力状態はブラウザーに依存するため、送信前には保存JSONと再照合する。

その後、MetaMask Flaskを接続し、発行者`0xcA34…Fe8E`からFactory `deployProxy`を送信した。[tx `0xe2db…b1ec`](https://sepolia.etherscan.io/tx/0xe2db27c89fc275006f33b14bacc28867af18ded2db3664306bb3b547afd9b1ec)はblock `12078491`で成功。Etherscanの`ProxyDeployed`イベントに記録されたproxy・implementation・saltは保存計画と一致した。Etherscanの親ETHRegistry `getSubregistry("secrettinder")`の読取結果はゼロアドレスであり、親への接続は未送信。別途、公開RPCの再読取CLIは`HttpRequestError`、`ResourceNotFoundRpcError`、代替RPCの`ContractFunctionExecutionError`で失敗したため、デプロイ済みコード・Factory `verifyContract`・現行ブロックのowner/権限の再照合は未完了。第2取引の送信前に確認する。

## ローカル検証

- `pnpm --filter shared check-types`、`pnpm --filter backend check-types`、共有12件/バックエンド13件のテスト、対象ファイルのBiome検査、フロントエンドlint/build、`pnpm install --offline --frozen-lockfile`、`git diff --check`は通過した。
- Workers dry-runは終了コード0でbundleを生成したが、sandbox外のWranglerログ保存先への`EPERM`を表示した。
- ルートの`pnpm exec biome ci .`は、取り込み済み`.agents/skills`等の86エラーで失敗した。今回変更した`apps/backend`、`packages/shared`、`scripts`、`specs/001-private-dating/fixtures`の限定検査は通過した。
