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

## 残る合格条件

- T038: 有限停止、委任鍵失効、コントラクト権限テスト。本人ウォレットからの限定キー実更新も未実施。
- T039: Webと別CLIによるENS/Arkivの独立検証、BFF停止・旧版/別発行者・障害の判定。
- T041/T042/T034: 審査停止・異議・回復、SC-005/007の総合判定と提出用証拠。

発行者には親名と参加者Registryを管理する権限が残る。親やResolver実装の変更を検証者が追跡する必要がある。[ENSv2の権限モデル](https://docs.ens.domains/ensv2/enhanced-access-control/)に従い、名前のownerだけではroot権限や発行者署名を代替できない。現段階では段階Aの部分達成であり、SC-005合格やENS賞の応募条件達成とは判定しない。
