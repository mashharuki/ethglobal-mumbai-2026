# 段階A ENS送信順

対象チェーンはEthereum Sepolia（chain ID `11155111`）、送信元は親名ownerの`0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E`。全操作の送信額は`0 ETH`で、ガス代だけが必要。公開アドレス・calldataは[親Registry計画](ens-parent-plan.json)、[Aliceの接続後計画](ens-alice-connected-plan.json)、[Bobの接続後計画](ens-bob-connected-plan.json)に保存した。旧[Aliceプレビュー](ens-alice-plan.json)と[Bobプレビュー](ens-bob-plan.json)は親未接続時の履歴であり、送信に使わない。

第1取引のFactory `deployProxy`は[Sepolia tx `0xe2db…b1ec`](https://sepolia.etherscan.io/tx/0xe2db27c89fc275006f33b14bacc28867af18ded2db3664306bb3b547afd9b1ec)で成功（block `12078491`）。`ProxyDeployed`イベントのproxyは予測値`0x8A189F48764C466972c0244C5671B4461C958E8C`、implementationは計画のUserRegistry実装`0x9BD8a88719068D09ecee662f36C0E3856708366a`と一致した。[proxyのEtherscanページ](https://sepolia.etherscan.io/address/0x8A189F48764C466972c0244C5671B4461C958E8C#code)でコードの存在を確認し、Factory `verifyContract(proxy)`も予定のUserRegistry実装を返した。親名`secrettinder.eth`の`getSubregistry("secrettinder")`はこの後のEtherscan読取でゼロアドレスだった。

第2取引の親ETHRegistry `setSubregistry`は[Sepolia tx `0x0afe…4bcf`](https://sepolia.etherscan.io/tx/0x0afe81bdc06d3b8c1cbd5b1d29fa4b368b1e442f21367b45e3a41d4725fd4bcf)で成功（block `12078582`）。`SubregistryUpdated`イベントのtokenId・接続先・送信元は保存計画と一致した。block `12078589`の再読取でも`secrettinder.eth`のsubregistryは予測Registry、RegistryコードとFactoryの実装照合も成功した。

2026-11-07にAlice/Bob用の次の8取引も発行者がMetaMask Flaskで署名した。receipt、calldata、現行権限の照合結果は[ENS実ネットワーク証拠](ens.md)と[同一ブロックのスナップショット](ens-onchain-snapshot.json)に記録した。

| 順 | 送信元 | 操作 | 確定後の確認 |
| --- | --- | --- | --- |
| 1（確認済み） | 発行者 | Factory `deployProxy(UserRegistryImpl, salt, initialize(...))` | receipt成功、予測Registry `0x8A189F48764C466972c0244C5671B4461C958E8C`にコード、Factory `verifyContract`が公式UserRegistry実装を返す |
| 2（確認済み） | 発行者 | 親ETHRegistry `setSubregistry(parentTokenId, predictedRegistry)` | `secrettinder.eth`のsubregistryが予測Registryになり、owner・期限・コードがblock `12078589`で一致 |
| 3（確認済み） | 発行者 | 各専用ResolverをFactoryでデプロイ | 各Resolverの予測アドレス・Factory出自・実装を照合 |
| 4（確認済み） | 発行者 | 各`register(label, owner, 0, resolver, 0, expiry)` | `LabelRegistered`と`TokenResource`のreceipt、現在のowner・resource・期限を照合 |
| 5（付与確認済み、本人の実送信は未実施） | 発行者 | 各Resolverで本人へ`app.endpoint`と`app.key`の`grantSetterRoles` | 限定setterの役割を読取。本人の許可/拒否操作は`eth_call`で確認 |
| 6 | 発行者 | 登録txから署名ドラフトを作り、発行者が署名・Arkiv公開・読戻し・ENSの`app.credential`参照更新 | 別クライアントが現行参照・署名・版・期限・状態を独立に検証 |

段階6の資格署名・Arkiv実書込・ENS参照更新・独立クライアント検証は未実施。本人の実送信、委任鍵の失効、審査停止/回復も未実施。以後の外部書込は別途内容を確認してから行う。秘密鍵はこのリポジトリやチャットへ置かない。
