# Secret Tinder：120秒プレゼンと提出動画

**Secret Tinder — common ground before photos.** この台本は2026-11-07の実装範囲に合わせた。対面120秒と提出動画2〜3分は別物。発話・画面操作を通した人間のリハーサルと動画収録は未実施で、T033は未完了。

## 対面120秒：見せるのは実装済みの公開資格

開始前に[本番ページ](https://ethglobal-mumbai-2026.vercel.app/)を**新しいブラウザープロファイル**で開き、`#proof`、Alice/Bobの検証ボタン、ネットワーク接続を確認する。PR #4マージ後の本番でAlice/Bobとも資格あり・版1・Sepoliaブロック`12080373`を確認済み。`/sw.js`は移行WorkerとしてHTTP 200で配信される。既存Chromeには旧PWAキャッシュでViteスターターが残った観察があり、同じプロファイルでの回復は未確認。旧画面ならその場でキャッシュを無差別削除せず、準備済みのクリーンプロファイルに切り替える。

| 時間 | 発話の要点 | 画面操作 |
| --- | --- | --- |
| 0–15秒 | 「Secret Tinder。写真より先に共通点から。」写真と大量の個人情報から始める課題 | ヒーローと主ボタン「公開資格の実演を見る」 |
| 15–35秒 | 条件を決める→非公開照合→任意のAI会話、という**開発中の**体験 | 3つのステップをスクロール。照合は完成と呼ばない |
| 35–75秒 | 今日動く参加資格。ENSv2の名前と権限、Arkivの署名済み公開記録 | 主ボタンで`#proof`へ。Alice、続いてBobを検証し、結果を読む |
| 75–100秒 | BFFを介さずブラウザーが両ネットワークを直接読む。ENSは現行参照と権限分離、Arkivは第三者が読める公開記録 | `資格あり`、版、Sepoliaブロックを指す。取引リンクは時間があれば開く |
| 100–120秒 | 任意のPersona会話は別チームの単体アプリ。親アプリ接続は未完了。目標と限界を一文で締める | 未実装の明示へ戻す。賞の受賞・申請可は断言しない |

### 英語で話す原稿

> We’re building Secret Tinder: common ground before photos. Dating often starts with a face and a detailed profile. Our proposed journey starts with private preferences, checks mutual interests, then lets each person decide whether to talk. The private matching step is still in development, so let me show what works today.
>
> Alice and Bob each have an ENSv2 name. The issuer controls the participation credential, while the participant has limited control of their own records. Each ENS name points to an issuer-signed public credential on Arkiv Rabdi. I’ll check Alice, then Bob. This browser reads ENS and Arkiv directly, without our backend. Both currently return eligible. ENS gives us a current reference and separate permissions. Arkiv gives other clients a public record they can inspect.
>
> Our teammate also built an optional AI Persona conversation as a separate app. Connecting it to this matching flow is unfinished. Our goal is to let people start with common ground and choose what they share. Today’s live proof is the participation layer, not private matching or a guarantee of anyone’s character.

英語原稿は約160語。話速・クリック待機を含めた120秒の実測はまだない。RPC遅延・制限時は「通信を確認できない」と読み上げ、[ENS](../specs/001-private-dating/evidence/ens.md)と[Arkiv](../specs/001-private-dating/evidence/arkiv.md)の過去の読戻し証拠へ切り替える。その場合、録画内で現在のライブ検証が成功したとは言わない。審査員の前では成功済みブロックを固定値として読まず、画面の**今回の**ブロックと版を読む。

## 提出動画：2〜3分の撮影表（未収録）

大会の動画範囲は2〜4分、EF-CROPSの上限は3分。共通動画を2〜3分に収める。公式の動画条件に従い720p以上で録画し、早送り・AI音声・音楽と文字のみの映像・スマートフォンでの画面撮影を避ける。実際に動く範囲だけを同じ収録で示す。映像の途中でUI・チェーン結果を別撮りにしたら編集点を明示し、処理待ちをカットした場合は開始と結果を同じ実行として残し実測待ち秒数を付ける。

| 尺の目安 | 撮影するもの | 現時点の扱い |
| --- | --- | --- |
| 0:00–0:30 | キャッチコピー、課題、3段階 | 2・3段階は設計／別アプリ |
| 0:30–1:30 | 本番URLでAlice/BobのENS→Arkiv検証を各1回、結果まで | 実接続。通信失敗ならその収録を成功例に使わない |
| 1:30–2:10 | ENS権限とArkiv公開記録の役割、取引・独立CLI証拠 | 実証済みの資格範囲だけ |
| 2:10–2:40 | 実装済み／未実装の境界と次の目標 | PSI・資金・親AIBot連携は未完了と明示 |

収録後に埋める記録（担当者が実測して記入）：

- [ ] 動画URL：________ ／長さ：________ ／撮影日時：________ ／対象commit：________ ／ブラウザー：________。本番URLと公開リポジトリへの匿名アクセスも録画前に再確認。
- [ ] Alice/Bob各操作の開始・結果時刻、Sepoliaブロック、Arkivの参照先、RPC待ち実測を記入。
- [ ] 実接続／合成／未接続の表示を映像・説明・READMEで一致させる。
- [ ] EF-CROPS・ENS-V2・ARKIV-APPの主張を[応募判定](../specs/001-private-dating/prize-targets.md)と照合し、該当動画時刻をT036へ渡す。EF-RPC・ARKIV-SWARMは実証がある場合だけ追加する。
- [ ] 別の初見参加者で[目的・主操作・送信範囲の観察](../specs/001-private-dating/evidence/ux.md)を記録。実測の120秒プレゼン時間：________、修正点：________。
- [ ] [賞別提出判定](../specs/001-private-dating/evidence/prizes.md)に動画時刻・対象commit・Dashboardの選択/受付を記録。提出前に実装済みと計画中の言い方を再確認。

公開資格は本人の誠実さ・相性・安全性を保証しない。AI会話は別同意でPersona・会話をAI処理先に送る。マッチング用の秘密入力が完成済みのUIに存在するかのように演出しない。
