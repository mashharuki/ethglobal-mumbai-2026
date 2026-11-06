# 段階A ENS送信順

対象チェーンはEthereum Sepolia（chain ID `11155111`）、送信元は親名ownerの`0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E`。全操作の送信額は`0 ETH`で、ガス代だけが必要。公開アドレス・calldataは[親Registry計画](ens-parent-plan.json)、[Alice計画](ens-alice-plan.json)、[Bob計画](ens-bob-plan.json)に保存した。現在の参加者計画は親未接続時のプレビューであり、そのまま送信しない。

第1取引のFactory `deployProxy`は[Sepolia tx `0xe2db…b1ec`](https://sepolia.etherscan.io/tx/0xe2db27c89fc275006f33b14bacc28867af18ded2db3664306bb3b547afd9b1ec)で成功（block `12078491`）。`ProxyDeployed`イベントのproxyは予測値`0x8A189F48764C466972c0244C5671B4461C958E8C`、implementationは計画のUserRegistry実装`0x9BD8a88719068D09ecee662f36C0E3856708366a`と一致した。親名`secrettinder.eth`の`getSubregistry("secrettinder")`はこの後のEtherscan読取でゼロアドレスだった。第2取引の親への接続はまだ未送信。

| 順 | 送信元 | 操作 | 確定後の確認 |
| --- | --- | --- | --- |
| 1（receipt成功。コードと`verifyContract`の再照合は未了） | 発行者 | Factory `deployProxy(UserRegistryImpl, salt, initialize(...))` | receipt成功、予測Registry `0x8A189F48764C466972c0244C5671B4461C958E8C`にコード、Factory `verifyContract`が公式UserRegistry実装を返す |
| 2 | 発行者 | 親ETHRegistry `setSubregistry(parentTokenId, predictedRegistry)` | `secrettinder.eth`のsubregistryが予測Registryになり、owner・期限・コードが現行ブロックで一致 |
| 3 | 発行者 | `participant`モードでAlice/Bob計画を再生成し、各専用ResolverをFactoryでデプロイ | 各Resolverの予測アドレス・Factory出自・実装を照合 |
| 4 | 発行者 | 各`register(label, owner, 0, resolver, 0, expiry)` | `LabelRegistered`と`TokenResource`のreceipt、現在のowner・resource・期限を照合 |
| 5 | 発行者 | 各Resolverで本人へ`app.endpoint`と`app.key`の`grantSetterRoles` | 本人の限定setterだけ成功し、資格key・Resolver差替え・譲渡等を拒否する試験を実施 |
| 6 | 発行者 | 登録txから署名ドラフトを作り、発行者が署名・Arkiv公開・読戻し・ENSの`app.credential`参照更新 | 別クライアントが現行参照・署名・版・期限・状態を独立に検証 |

各取引の送信前に現行状態を読み直し、receiptが不明な場合は同じ操作の状態とtxを調べてから再試行する。段階6の実書込と独立検証、および本人の拒否試験は未実装・未実施。リポジトリの`AGENTS.md`は外部デプロイ前の承認を求めるため、送信は承認後に行う。秘密鍵はこのリポジトリやチャットへ置かない。
