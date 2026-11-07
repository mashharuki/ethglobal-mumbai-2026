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

利用者が見る[公開資格検証画面](../../../apps/frontend/src/pages/Participation.tsx)もArkivの現行entityをブラウザーから直接取得し、ENS参照と署名を検証する。PR [#4](https://github.com/mashharuki/ethglobal-mumbai-2026/pull/4)をmainへマージした後、[本番URL](https://ethglobal-mumbai-2026.vercel.app/)は未認証でHTTP 200を返し、新規ブラウザーのAlice/Bob検証はともに`資格あり`・credential版`1`・Sepolia block`12080373`だった。同じ開発者の端末での再実測であり第三者確認ではない。画面はentity keyによる現行読取であり、索引による発見は上記CLIの別経路。両経路の対象entity keyとdigestは一致する。Hono backendを止めても[Webと独立CLIの同一ブロック比較](ens.md#ブラウザーとcliの比較)は可能だった。

PR [#5](https://github.com/mashharuki/ethglobal-mumbai-2026/pull/5)の英語UIマージ後、同じ端末のクリーンブラウザーで再検証し、Alice/Bobとも`Eligible`・版`1`・Sepolia block`12080445`を表示した。第三者再現の証拠には数えない。

今回の公開URLへのHTTP到達確認は`200`だった。ただしHTTP応答だけではブラウザー内のArkiv読取や資格判定を再測定したことにはならない。ライブUIの実データ表示は上記のクリーンブラウザー記録を根拠とする。

指定の[5つのArkiv資料](../../../arkiv/schema.md)は作成した。実測値に基づく範囲と未計測事項をそれぞれ明記している。2026-11-07の[提出範囲決定](../prize-targets.md)では、この公開資格をARKIV-APPの主実演にする。公開プロフィール登録、資格新版の実書込、期限切れ/失効は未実装・未検証であり、本番の照合フローと呼ばない。

T032と最終提出判定には、第三者環境からのクエリ・画面再現、GitHub公開状態、新作/再利用範囲、5資料の最終照合を残す。公開URLのHTTP 200と自分たちのクリーンブラウザーの成功を、第三者実測やHacker Dashboardへの応募完了と混同しない。
