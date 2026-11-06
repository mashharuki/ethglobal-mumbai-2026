# Private Dating

> **プロフィールは秘密に。共通の趣味でつながる。**

プロフィールを公開せず、共通の趣味がある相手を見つけるマッチングアプリの構想です。秘密は各端末に保持し、ENSで仮名、Arkivで公開登録、Ethereum Sepoliaで預託と返却を扱います。

[![32秒の概要：秘密を端末に置く、公開登録、非公開照合、双方の合意と精算](docs/assets/private-dating-overview.gif)](docs/overview.html)

**[再生・一時停止できる概要ページ / English・日本語](docs/overview.html)** · [日本語GIF](docs/assets/private-dating-overview-ja.gif) · [30秒の紹介文](docs/mentor-brief.md)

*32秒の設計イメージです。アプリはひな形段階で、二者のZK照合・秘匿精算は未検証。実際の登録や取引を記録したデモではありません。*

## 一目でわかる概要

| 観点 | 内容 |
| --- | --- |
| 誰のためか | プロフィールを広く公開せずに、共通点がある相手と出会いたい人 |
| 解きたい課題 | 出会いを探すために、最初から多くの個人情報を開示する負担 |
| 体験 | 仮名で登録し、共通の趣味があるかを非公開で照合。双方の承諾と預託拘束を経てマッチ成立 |
| 技術の役割 | ZK：自己申告との整合性を検証 / ENS：仮名と権限 / Arkiv：公開登録 / Sepolia：預託・合意精算・期限返却 |
| 今回もらいたい意見 | 利用者にとっての価値、預託の負担、最小限で説得力のあるデモ範囲 |
| 現在地 | 仕様はDraft。外部統合・実証明・資金回復は実装と検証が必要 |

GIFはGitHubのREADME内で再生します。概要ページはローカルで`docs/overview.html`をブラウザに開くと利用できます。GitHub上のHTMLリンクはソース表示になります。外部公開はしていません。

## 設計と応募目標

[構成図・責務・データフロー](docs/architecture.md) / [日本語の静止画](docs/architechture.drawio.png) / [英語の静止画](docs/architecture-en.drawio.png) / [編集用draw.io](docs/architecture.drawio)

[統合仕様](specs/001-private-dating/spec.md) / [正式応募目標](specs/001-private-dating/prize-targets.md)

応募目標は **Ethereum Foundation・ENS・Arkiv**。各賞の条件・担当・実演・提出判断は応募目標の文書にまとめています。

概要の見せ方は[YOHAKUのREADME](https://github.com/kou-uni/ethglobal-tokyo2026-uni)を参考にしました。[アニメーションの編集・再生成方法](docs/overview/README.md)も残しています。
