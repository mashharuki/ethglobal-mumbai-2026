# Alice資格の有限停止→回復：送信前計画（実行前の固定記録）

2026-11-07 02:00 UTC頃の**読取専用**確認。対象は合成参加者`alice.secrettinder.eth`だけ。この文書は送信前に固定した計画の履歴であり、以下の「未実施」等は計画作成時点の記述である。ユーザー承認後の版`2`停止→版`3`回復の実取引・読戻し・Web/CLI結果は[ENS証拠](ens.md)と[Arkiv証拠](arkiv.md)に記録した。これは資格の手動実証であり、T041の合成審査決定と連動した停止の証拠にはしない。

## 固定した前提

| 項目 | 観測/固定値 |
| --- | --- |
| Ethereum Sepolia | chain `11155111`、発行者`0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E`、Alice Registry`0x8A189F48764C466972c0244C5671B4461C958E8C`、専用Resolver`0x28a0549e48190d69Ae8Bf6046713F766B20A5598` |
| Arkiv Rabdi | chain `7794095`、発行者は同じアドレス、entity宛先`0x4400000000000000000000000000000000000044` |
| 現行資格 | 版`1`、`eligible`、`accessTier=new`、規則版`1`、発行ID`0x5d688d733b4a46be18d41c9fe5c35e9b60db847d4467bf1942723100cefecc2c`、現行ENS参照entity`0x628a86b2b8d2ee96d9b91b92a9013f10ce67421e4792bf7911c46234d92ab5d6`、digest`0x5eef3a22c4bfc28571afc6839201338b553c6e0105ce09bec9f70504b8f2dded` |
| 読取結果 | 独立CLIがENS block`12080540`で`eligible`/版`1`。発行計画CLIがblock`12080544`と再確認block`12080549`で現行参照と登録receipt/owner/Resolver/役割を再照合し、版2のdigestは同一だった。block`12080541`のAlice ownerは`0xfb6DF0D12052a1c8E58920654D44015C61552E57`、名前期限と資格期限は共に`1794597600`（2026-11-13 19:20 UTC） |
| 発行者残高/nonce | Sepolia block`12080541`: `136.048666728514571304` Sepolia ETH、nonce`30`。Rabdi block`315388`: `19.999437149` tGLM、nonce`3`。送信前に再照合し、他の取引で変わればnonceを更新する |

停止の有限期限はUnix秒`1794503600`（2026-11-12 17:13:20 UTC）。資格/名前の期限より短い。[固定入力](ens-alice-suspension-request.json)から`node scripts/plan-participation-revision.ts draft specs/001-private-dating/evidence/ens-alice-suspension-request.json`を実行した。署名前の版`2`は既存の署名本文から`credentialVersion=2`、`status=suspended`、`suspendedUntil=1794503600`だけを変え、その他の主体・発行ID・発行receipt・規則版・利用枠・期限を維持する。EIP-712は`SecretTinderParticipation v1`、Sepolia、参加者Registryをドメインに含む。版`2`のmessage digestは`0x98a196785a10cf94e44d6fdd9a10e44d498e76f96fe5e558719809a2cd212d6f`。

版`3`の回復候補は同じ主体・発行ID・期限・規則版・利用枠を維持し、`credentialVersion=3`、`status=eligible`、`suspendedUntil=null`とする。候補message digestは`0x078ea88bec2684ad0ad8a86cfc7dc7ae5a4d03b96eeee2d91182efe9d7fd0d09`。**版2が現行ENS参照になり、その署名・Arkiv行が読戻せた後**に`draft`を再生成し、一致しなければこの候補を破棄する。版2を飛ばして版3を発行しない。

## 順序と送信停止ゲート

1. 発行者ウォレットで版2のEIP-712を署名する。`verifyParticipationSignature`で回復した署名者が固定発行者であり、版/発行ID/期限/digestが上記と一致することを確認する。署名だけでgasは不要。
2. `publication`段階を実行してArkiv Rabdiの不変entity書込値を生成する。発行者から`0x4400…0044`へ送金額0で**1取引**。候補上限はgas`1,000,000`、gas価格`2 gwei`、最大`0.002 tGLM`。署名済み本文で新たにestimateし、この上限内かつ現在のgas価格で受理される場合だけ送信する。上限外なら再計画する。
3. Arkiv receipt `success`と`EntityCreated`、SDK entity読戻しを確認する。`$creator`/`$owner`が固定発行者、read-only=true、permissionless extension=false、schema/`issuance_id`/版`2`/record digest/本文署名/資格期限を照合する。失敗・不一致・RPC障害時は**ENSを更新しない**。
4. 確認済みentity keyを`reference`段階へ渡す。版1のENS参照がなお現行であること、Factory出自とissuerの`app.credential` setter権限を再確認し、Alice専用Resolverへの`setText` calldataを生成する。Sepolia発行者からResolverへ送金額0で**1取引**。候補上限はgas`2,500,000`、gas価格`2 gwei`、最大`0.005 Sepolia ETH`。初回参照更新の実gasは`1,148,397`だったが、今回も署名直前にestimateする。
5. Sepolia receipt `success`後、`app.credential`を同じ確認済みblockで読み戻す。Arkiv entity key・digest・版`2`が一致し、独立Web/CLIの双方がBFF停止中にそのblockで`ineligible/SUSPENDED`を返すまで、停止実証を完了と呼ばない。どちらかが`unavailable`なら通信障害として保留する。
6. 版2を現行として再読取したうえで版3の`draft`を作り、発行者が新版EIP-712へ署名する。版2を入力とした署名・現行参照・発行ID照合が通らない場合は進まない。版3のArkiv書込→receipt/不変entity読戻し→ENS参照更新→receipt/同block読戻しを上記と同じ順で各**1取引**ずつ行う。版3でも各chainの候補上限は同じ。版3が現行になるまで古い版1の`eligible`表示を回復の証拠にしない。
7. 独立Web/CLIが版`3`を同じSepolia blockで`eligible`と判定し、版2の古い参照を使う照合は拒否されることを確認する。Arkivは現行entityを読むため、Sepoliaとの原子的なクロスチェーンsnapshotは主張しない。

予定する外部取引はRabdi 2件、Sepolia 2件で、候補上限の合計は`0.004 tGLM + 0.010 Sepolia ETH`。この数字は**許可済み費用ではなく送信前の上限案**。ガス見積り・nonce・残高・契約アドレス・calldata・ネットワークを各署名画面で再確認する。Alice/Bobの既存版1の内容・BobのENS参照は変更しない。Arkiv access keyや秘密鍵は計画ファイル・チャット・画面に保存しない。
