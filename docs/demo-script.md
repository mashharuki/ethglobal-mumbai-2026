# Secret Tinder：2分プレゼン台本

2026-11-06、原稿・未リハーサル。対面プレゼンはユーザーが共有した120秒制約に合わせる。提出動画は別の2〜3分条件を満たす。T033で実演したコミット、秒数、ライブURL、実接続/合成/未接続を記録して完成させる。

**シークレットTinder — 写真より先に、共通点から。**

**Secret Tinder — common ground before photos.**

## 120秒の見せ方

| 時間 | 話す内容 | 見せるもの |
| --- | --- | --- |
| 0–10秒 | Secret Tinder。写真より先に、共通点から | 一文と主ボタン。構成図は出さない |
| 10–25秒 | 写真中心の選別や、プロフィールを大量に公開することへの不安 | 「条件を決める→非公開で照合→話してみる」の3段階 |
| 25–60秒 | 条件は端末に、公開情報と照合結果を分ける | 実装済みの経路だけ操作。未実装なら設計プレビューと明示 |
| 60–85秒 | ENSは参加資格を別クライアントでも確認、Arkivは公開情報を別アプリから読む | 実証済みなら資格の再検証・Arkiv実読取。未達なら役割説明に限定 |
| 85–105秒 | 任意で承認済みPersonaと会話する | AIBotの承認画面と短い会話。架空マッチ/実AI/親未接続を表示 |
| 105–120秒 | 自分で共有を選び、会うかを決める | 体験導線。Swarmは実読取の証拠がある場合だけ短く補足 |

## 英語原稿（設計と単体デモを紹介する版）

> We’re building Secret Tinder: common ground before photos.
>
> Dating can feel like choosing a face while handing over a detailed personal profile. We want to give people another starting point: shared interests, mutual preferences, and control over what they share.
>
> The journey has three steps. Set your preferences. Check for a private match. Then, optionally, try a conversation before deciding whether to meet.
>
> In our matching design, private inputs stay on each person’s device. Public registration is separate from the matching result. ENS makes participation credentials verifiable by another client, while Arkiv makes permitted public records readable beyond our own app.
>
> Our teammate has also built this AI conversation demo. You review and approve a Persona before it is used. You can revise it, withdraw consent, and try different scenes. This is a conversation with an AI representation, not the other person’s promise or a prediction of your relationship.
>
> AI participation is optional. Approved Persona data and messages are processed by the AI service; matching secrets are not automatically sent there. The demo currently uses fictional matches, and integration with the matching app is still being completed.
>
> Our goal is simple: help people start with common ground, choose what to share, and decide for themselves whether to meet.

実統合が完了した後だけ、未接続の説明を実測結果に差し替える。原稿の速度は計測していないため、画面操作を含めT033で短縮・リハーサルする。暗号や分散保存だけで、現実の人格・誠実さ・安全性を保証する表現は使わない。

## UIで最初に伝えること

- 最初の画面は一文と主ボタン「非公開マッチングを試す」。未実装の導線は「設計プレビュー」と表示する。
- 条件入力では「端末内に保持」「公開登録」を、AI開始前では「AIへ送る内容」を別々に示す。AI同意を登録同意へまとめない。
- 照合結果は「条件が一致する候補」。相性100%・人格評価・容姿ランキングを表示しない。
- AI導線は「任意：Personaと会話してみる」。シミュレーションを省略する選択も同じ画面から可能にする。
- ENS・Arkiv・ZK・Swarmの詳細は「仕組みを見る」へ置く。実読取の表示は実際の確認状態に結び付ける。
- 初見の参加者に「何をするアプリか／次の操作は何か／公開される情報とAIへ送る情報は何か」を聞き、理解できなかった箇所をT043で修正する。
