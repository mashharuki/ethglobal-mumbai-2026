# Private Dating

> **シークレットTinder — 写真より先に、共通点から。**
>
> Secret Tinder — common ground before photos.

説明用の比較表現です。プロフィールを公開せずに相手を探し、任意で本人承認済みPersonaとの会話を試す構想です。[2分プレゼンとUI方針](docs/demo-script.md) / [Arkivフィードバックの反映](docs/arkiv-feedback.md)。

プロフィールを公開せず、双方の希望と共通の趣味が合う相手を見つけるマッチングアプリの構想です。照合用の秘密は各端末に保持し、ENSで参加資格の参照と更新権限、Arkivで公開登録、Ethereum Sepoliaで預託と返却を扱います。

**採用した実証順序：ENSの権限分離と独立クライアント検証 → 希望条件付き二者照合 → 多人数候補選択。** [更新Plan](specs/001-private-dating/plan.md)と[タスク](specs/001-private-dating/tasks.md)に反映しました。以下の動画・画像は拡張前の設計概要で、独立検証と多人数選択は未反映です。親側の照合・資格・資金機能は未実装・検証前です。AIBot単体の実装と親アプリへの結合は分けて扱います。

資格の停止は根拠通知・異議・期限付き回復と合わせて実証します。マッチ用預託は各自への元本返却専用とし、旧90/10配分・運営の罰金収入は廃止しました。新しい没収や独立保証金は未採用で、動画・画像にもこの精算変更は未反映です。

[![32秒の概要：秘密を端末に置く、公開登録、非公開照合、双方の合意と精算](docs/assets/private-dating-overview.gif)](docs/overview.html)

**[再生・一時停止できる概要ページ / English・日本語](docs/overview.html)** · [日本語GIF](docs/assets/private-dating-overview-ja.gif) · [30秒の紹介文](docs/mentor-brief.md)

*32秒の設計イメージです。アプリはひな形段階で、二者のZK照合・秘匿精算は未検証。実際の登録や取引を記録したデモではありません。*

## 一目でわかる概要

| 観点 | 内容 |
| --- | --- |
| 誰のためか | プロフィールを広く公開せずに、共通点がある相手と出会いたい人 |
| 解きたい課題 | 出会いを探すために、最初から多くの個人情報を開示する負担 |
| 体験 | 参加資格を検証し、双方の希望と共通趣味を非公開で照合。双方の承諾と預託拘束を経てマッチ成立 |
| 技術の役割 | ZK：自己申告・希望条件との整合性 / ENS：資格参照と更新権限 / Arkiv：公開登録 / Sepolia：預託・合意精算・期限返却 |
| 今回もらいたい意見 | 利用者にとっての価値、預託の負担、最小限で説得力のあるデモ範囲 |
| 現在地 | 仕様はDraft。外部統合・実証明・資金回復は実装と検証が必要 |

GIFはGitHubのREADME内で再生します。概要ページはローカルで`docs/overview.html`をブラウザに開くと利用できます。GitHub上のHTMLリンクはソース表示になります。外部公開はしていません。

## 設計と応募目標

[構成図・責務・データフロー](docs/architecture.md) / [日本語の静止画](docs/architechture.drawio.png) / [英語の静止画](docs/architecture-en.drawio.png) / [編集用draw.io](docs/architecture.drawio)

[統合仕様](specs/001-private-dating/spec.md) / [正式応募目標](specs/001-private-dating/prize-targets.md)

応募目標は **Ethereum Foundation・ENS・Arkiv**。同じArkiv枠内で**Arkiv + Swarmボーナス**を条件付き追加候補にします。公開場面素材の実upload/readと利用画面、必要資料がそろった場合だけ選択します。各賞の条件・担当・実演・提出判断は応募目標の文書にまとめています。

AIシミュレーションは別リポジトリの[LOVE MATCH MASALA](ethglobal-mumbai-2026-AIBot/README.md)にあります。Next.jsアプリで、Personaの確認・承認・暗号化保存・自由会話・日英表示を実装済み。作者の検証報告は同README、親側の接続範囲は[接続契約](specs/001-private-dating/contracts/simulation.md)を参照してください。承認済みPersonaと会話は推論サービスが処理します。非公開照合の秘密入力を自動転送する設計ではありません。

概要の見せ方は[YOHAKUのREADME](https://github.com/kou-uni/ethglobal-tokyo2026-uni)を参考にしました。[アニメーションの編集・再生成方法](docs/overview/README.md)も残しています。
