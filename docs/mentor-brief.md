# メンター向け：Private Dating

**2026-11-06 / アイデアと目標設計。二者照合・秘匿精算は未検証。**

ブース訪問後、**ENSの権限分離・独立検証 → 希望条件付き二者照合 → 多人数候補選択**を採用した。[更新Plan](../specs/001-private-dating/plan.md)・[検討の根拠](mentor-feedback-proposal.md)を参照。以下の動画・画像は拡張前の概要で、独立検証と多人数選択はまだ描いていない。

[評判・没収・運営収益の検討記録](reputation-and-bond-proposal.md)から、根拠付きの資格停止・異議・回復と運営の罰金収入ゼロを採用した。マッチ用預託は各自への元本返却専用へ変更。独立保証金・新しい没収は未採用。現行仕様は[資格審査契約](../specs/001-private-dating/contracts/participation-review.md)を参照。

## 2分プレゼン

**シークレットTinder — 写真より先に、共通点から。**

技術名から始めず、利用者の流れと情報の扱いを先に伝える。[120秒の英語原稿・画面順・UI方針](demo-script.md)と[Arkivフィードバック](arkiv-feedback.md)を参照。既存32秒アニメーションは設計の補足として使う。

## 補足の32秒

[![Animated concept overview in English](assets/private-dating-overview.gif)](overview.html)

[再生・一時停止・日英切替のある概要ページ](overview.html) / [日本語GIF](assets/private-dating-overview-ja.gif)

「秘密を手元に → 公開登録 → 共通点の照合 → 合意と精算」の順で進む。概要ページはブラウザでローカルファイルとして開ける。説明中は一時停止、または下の4つの場面ボタンで見せたい部分を選ぶ。GIFは繰り返し再生、概要ページは一度再生すると停止する。

## 静止画で説明する場合

![Mentor overview in English](architecture-en.drawio.png)

[日本語版](architechture.drawio.png) / [編集用draw.io](architecture.drawio) / [技術的な詳細と境界](architecture.md)

## 最初の30秒

> We’re building Secret Tinder: common ground before photos. Find shared interests without publishing your dating profile. Then, if you choose, try a conversation with an approved AI Persona before deciding whether to meet. AI sharing is optional and separate from private matching.

> シークレットTinder。写真より先に、共通点から。プロフィールを公開せずに条件が合う相手を探し、希望する人は承認済みのAI Personaと会話してみる。会うかどうかは本人が決めます。AIへの共有は任意で、非公開照合とは別に同意します。

## フィードバックをもらう3点

1. **利用者の価値**：プロフィールを公開せずに共通点を探せることは、既存アプリのどの不安を解消するか。 / Which user concern would this address better than existing dating apps?
2. **預託の必要性**：プロフィール申告に責任を持つ仕組みとして、預託は納得できるか。それとも初回利用の負担が大きいか。 / Would a deposit encourage honest profiles, or add too much friction?
3. **デモの優先順位**：二端末での非公開照合、ENS・Arkivの実登録、預託の返却のうち、何が最も説得力のある実演になるか。 / What is the smallest demo that would make this idea convincing?

これらは相談用の問いであり、既存の仕様・応募タスクを変更する決定ではない。

## 詳しく聞かれたとき

- **何が秘密か**：趣味の内容は各端末に置き、照合結果は当事者だけに返す目標。ZKが検証するのは登録した自己申告との整合性であり、現実の趣味や身元が真実かまで保証しない。通信時刻や公開取引の相関まで隠せるとは主張しない。
- **何が公開か**：ENSの仮名と登録参照、Arkivの公開可能な登録記録・証明。プロフィールやペア一覧を公開データベースへ置かない。
- **預託はどう返るか**：Sepoliaのテスト資金を各自の元本として返す。未拘束は即時取消、双方終了合意なら期限前に返却、合意がなくても固定期限後に単独返却できる。通報・資格停止・異議で減額や期限延長をせず、運営は受け取らない。
- **AI会話はどこか**：任意P2として[完成したAIBot](../ethglobal-mumbai-2026-AIBot/README.md)を採用。本人承認済みPersonaとの自由会話で、二人同時の共同World Modelは後続。承認済み入力は推論先が処理し、親のマッチングとは未接続。
- **応募先はどこか**：正式目標はEthereum Foundation・ENS・Arkiv。[応募条件・担当・証拠](../specs/001-private-dating/prize-targets.md)は別紙に整理済み。
- **今どこまで動くか**：親アプリはひな形段階。AIBot単体には実装と作者の試験報告がある。二者の実証明・秘匿精算・復元・AIBotの親接続はこれから検証する。
