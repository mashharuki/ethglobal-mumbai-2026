# Arkiv公開資格の書込・読取証拠（2026-11-07 IST、T032進行中）

Arkiv Rabdi（chain ID `7794095`）で発行者`0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E`が[Alice](arkiv-alice-publication.json)と[Bob](arkiv-bob-publication.json)の署名付き公開資格を各1件書き込んだ。書込receipt、entity読戻しとENS参照は[ENS証拠](ens.md)に記録している。

`apps/backend/scripts/query-publications.ts`はSDK `1.0.1`で`secret_tinder_participation_v1` schemaを選び、索引付き`issuance_id`を等価検索し、original creatorを発行者に限定する。取得後に現行ownerとread-only flagも検査する。公開RPCからaccess keyなしで次を実測した。公開RPCには厳しいレート制限があるため、反復実行時には各自の`ARKIV_ACCESS_KEY`を環境変数で渡す。

| 参加者 | 再現コマンドの発行ID | 検索block | 取得entity key | 版 |
| --- | --- | --- | --- | --- |
| Alice | `0x5d688d733b4a46be18d41c9fe5c35e9b60db847d4467bf1942723100cefecc2c` | `312782` | `0x628a86b2b8d2ee96d9b91b92a9013f10ce67421e4792bf7911c46234d92ab5d6` | `1` |
| Bob | `0x7bfef7a2d485ad0f25ed0b30cc94458aea0c23da3c846c013709035b53fc9247` | `312786` | `0x4e253c8b29d21b401d99a970bfe8624d0d27bd835e49962006e8c1440d39c151` | `1` |

```sh
pnpm --filter backend exec node scripts/query-publications.ts 0x5d688d733b4a46be18d41c9fe5c35e9b60db847d4467bf1942723100cefecc2c
pnpm --filter backend exec node scripts/query-publications.ts 0x7bfef7a2d485ad0f25ed0b30cc94458aea0c23da3c846c013709035b53fc9247
```

検索結果のdigestはAlice`0x5eef3a22c4bfc28571afc6839201338b553c6e0105ce09bec9f70504b8f2dded`、Bob`0x492c0346ed438fd8cb9d71321a88e6e2ed8c11aa08493924974790b740fac75f`で、[ENS参照の読戻し](ens.md)と一致した。検索結果だけで資格を有効とは判定しない。署名、現在のENS参照、名前の登録世代、期限と権限を[独立CLI](../../../scripts/verify-participation.ts)で別途照合する。


**2026-11-07 ISTの再読取**：上記2コマンドをSDK `1.0.1`・access key未設定の公開RPCで再実行した。Aliceはindex block `315824`、Bobは`315827`で各1件を返し、entity key・`issuance_id`・credential版`1`・digest・entity expiration block（Alice`1600794`、Bob`1600888`）が[書込receipt](arkiv-alice-publication.json)と[Bobのreceipt](arkiv-bob-publication.json)の値に一致した。SDKは公開endpointの強いrate limitを警告したが、この2回のクエリは成功した。別時点の最新状態を保証する記録ではない。

書込取引は[Alice `0x9f57…6399`](https://explorer.rabdi.arkiv.network/tx/0x9f5788fd0e4c5dc326c838bf5d5dd19a80a21503c7f3e92bde1ea3578b206399)（block `304794`）と[Bob `0x331d…4cbd`](https://explorer.rabdi.arkiv.network/tx/0x331de4e344cd021bbdc3b6d6bae95a1ab6fc6b5c78afe0a67a95d4c0fb214cbd)（block `304888`）。両方とも発行者walletからの書込で、receipt statusとentity読戻しは各JSONと[ENS証拠](ens.md)に記録済み。Explorerの画面自体は今回の再確認で取得できなかったため、リンク先の表示を新たな独立検証として数えない。

## Alice公開資格の停止・回復履歴（2026-11-07）

同じ発行IDのAliceについて、発行者署名済みの版`2`停止資格と版`3`回復資格を、各1件の不変entityとして追加した。発行者がMetaMask Flaskで各取引を最終署名した。版`1`のentityは残り、現行資格はENSの`app.credential`参照が指定する版で判定する。

| 版・状態 | Rabdi取引 / block | entity key | record digest |
| --- | --- | --- | --- |
| `2`・`suspended`（期限`1794503600`） | [0xd0d7…2f3b](https://explorer.rabdi.arkiv.network/tx/0xd0d7b896dfcda8cf1bf5e886136630278fa77513a58228a2abac0e2c2a702f3b) / `316467` | `0xc7b963327b9a3d58587038e7323df2f9da97e83f4062896a4e5a2c9e53986375` | `0x4f804ca73c9a00ed12108fc19890b373f4f3fe7d6b4d40bf2fd607b0617bd1c5` |
| `3`・`eligible` | [0x4668…0f77](https://explorer.rabdi.arkiv.network/tx/0x466822cef9d77438c5912d8cd7a5c4ef1eff69c63f0f8bfa126fe35f9cb00f77) / `316696` | `0xe71e5fc6e6da0cfc338f8ca32a304947bcb98a7af0245a09638a101bcb4cbe0e` | `0x5a4b12a165876147c050bdfe36968a233f16eb077fd8c7b60cfc75f23bce6f15` |

両receiptは`success`で、nonceは`3`→`4`、送金額`0`、宛先`0x4400000000000000000000000000000000000044`、gas使用量は`204,980`/`204,692`、価格は各`2 gwei`だった。`EntityCreated`はowner発行者・read-only flagを示し、SDKのentity読戻しでschema・発行ID・版・digest・本文署名・不変属性を照合した。版`3`は索引block`316711`で版`1`/`2`/`3`の3行として反映済み。上記と同じ`query-publications.ts`のAlice発行IDコマンドで再現できる。

版`2`のArkiv読戻し後に[ENS停止参照](https://sepolia.etherscan.io/tx/0xa04578be2a72106eaa5dab3cc3af6eec7d5126ffe8609ea682861e835973610e)を設定し、公開Webが`Ineligible`/版`2`を返した。版`3`のArkiv読戻し後に[ENS回復参照](https://sepolia.etherscan.io/tx/0x536871ba2a6f9bf6116b0ec4c80a6638765172c4ffdf2c03d9ef70b465817f34)を設定し、公開Webが`Eligible`/版`3`を返した。[同一Sepoliaブロックの独立CLI比較](ens.md)も合格した。Arkivの索引だけでは有効状態を示さず、参照と署名の組合せが必要である。二つのチェーンの更新は原子的ではない。


利用者が見る[公開資格検証画面](../../../apps/frontend/src/pages/Participation.tsx)もArkivの現行entityをブラウザーから直接取得し、ENS参照と署名を検証する。PR [#4](https://github.com/mashharuki/ethglobal-mumbai-2026/pull/4)をmainへマージした後、[本番URL](https://ethglobal-mumbai-2026.vercel.app/)は未認証でHTTP 200を返し、新規ブラウザーのAlice/Bob検証はともに`資格あり`・credential版`1`・Sepolia block`12080373`だった。同じ開発者の端末での再実測であり第三者確認ではない。画面はentity keyによる現行読取であり、索引による発見は上記CLIの別経路。両経路の対象entity keyとdigestは一致する。Hono backendを止めても[Webと独立CLIの同一ブロック比較](ens.md#ブラウザーとcliの比較)は可能だった。

PR [#5](https://github.com/mashharuki/ethglobal-mumbai-2026/pull/5)の英語UIマージ後、同じ端末のクリーンブラウザーで再検証し、Alice/Bobとも`Eligible`・版`1`・Sepolia block`12080445`を表示した。第三者再現の証拠には数えない。


今回の公開URLへのHTTP到達確認は`200`だった。ただしHTTP応答だけではブラウザー内のArkiv読取や資格判定を再測定したことにはならない。ライブUIの実データ表示は上記のクリーンブラウザー記録を根拠とする。


指定の[5つのArkiv資料](../../../arkiv/schema.md)は作成した。実測値に基づく範囲と未計測事項をそれぞれ明記している。2026-11-07の[提出範囲決定](../prize-targets.md)では、この公開資格をARKIV-APPの主実演にする。資格新版の停止・回復は上記で実測した。公開プロフィール登録、審査決定に連動した停止、実期限切れは未実装・未検証であり、本番の照合フローと呼ばない。


T032と最終提出判定には、第三者環境からのクエリ・画面再現、GitHub公開状態、新作/再利用範囲、5資料の最終照合を残す。公開URLのHTTP 200と自分たちのクリーンブラウザーの成功を、第三者実測やHacker Dashboardへの応募完了と混同しない。
