# 賞別提出判定（2026-11-07 IST、T036進行中）

公式条件を[EF](https://ethglobal.com/events/mumbai/prizes/ethereum-foundation)、[ENS](https://ethglobal.com/events/mumbai/prizes/ens)、[Arkiv](https://ethglobal.com/events/mumbai/prizes/arkiv)、[大会規則](https://ethglobal.com/events/mumbai/info/details)で2026-11-07に再確認した。PR #5マージ後の英語UIの基準commitは`538961c`。[本番ライブURL](https://ethglobal-mumbai-2026.vercel.app/)は新規アクセスでHTTP 200、別のクリーンブラウザーでAlice/Bobとも`Eligible`・資格版1・Sepoliaブロック`12080445`を確認した。`/sw.js`は移行WorkerとしてHTTP 200で、旧Chromeタブも再読込後に新画面へ移った。公開[GitHubリポジトリ](https://github.com/mashharuki/ethglobal-mumbai-2026)は匿名アクセスでHTTP 200。**第三者による操作再現、提出動画、Hacker Dashboardの選択・受付は未確認で、以下は応募済みの記録ではない。**

| 目標 | 担当 | 現在の判定 | 根拠と不足 |
| --- | --- | --- | --- |
| EF-CROPS — Best CROPS App | Web/ZK担当、提出担当 | 未達 | [READMEのCROPS節](../../../README.md#crops)は中央依存・ライセンス/ビルド・観測者・信頼境界を記述し、静的トラッカー検査もある。非公開照合の2端末実演、第三者観察、3分以内の端から端までの動画がない。AIBotサブモジュールのライセンス・提出権利も未確認。[EF条件](https://ethglobal.com/events/mumbai/prizes/ethereum-foundation)の実動作を満たしていない |
| ENS-V2 — Best Use of ENSv2 | API担当、Web/検証担当 | 未達 | [実ENSv2取引とWeb/独立CLI比較](ens.md)で専用Resolver、限定setter、Arkiv参照、Alice/Bobの各同一ブロック判定と本番の公開資格画面を確認。オフライン負例と[合成審査](participation-review.md)は追加したが、チームの受入基準にある実ネットワークの有限停止/回復、委任鍵失効、本人審査UIとの接続は未達。[ENS公式条件](https://ethglobal.com/events/mumbai/prizes/ens)に対して、現在実演できる中心機能を「公開資格の参照と独立検証」に限定して最終判断する |
| ARKIV-APP — Build on Arkiv (from scratch) | Arkiv担当、Web担当 | 再確認待ち | [Alice/Bobの実書込、索引読取と本番Web実読取](arkiv.md)を確認。READMEには書込ウォレット`0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E`と2件の`issuance_id`再現クエリがある。[schema](../../../arkiv/schema.md)、[friction](../../../arkiv/friction.md)、[reach](../../../arkiv/reach.md)、[why Arkiv](../../../arkiv/why-arkiv.md)、[how we use Arkiv](../../../arkiv/how-you-use-arkiv.md)の指定5資料もある。[Arkiv条件](https://ethglobal.com/events/mumbai/prizes/arkiv)の技術要素は公開資格を中心に実演可能。チーム外の第三者再現、新作/再利用区分、資料・公開Gitの最終照合、ライセンス/権利確認とDashboard選択が未確認。公開登録・新版/失効は後段の製品課題で公式必須条件ではない |
| EF-RPC — Best Use of Anon-RPC（追加候補） | Web担当 | 未達 | [ローカル実測](anon-rpc.md)で公式browser harnessからSepolia `eth_blockNumber`を読んだ。障害時に通常RPCへ迂回しない単体試験も成功。公開資格画面は直接RPCのままで、標準読取・第三者匿名性・本番実演は未検証。EF-CROPS自体の必須要件にはしない |
| ARKIV-SWARM — Arkiv + Swarm bonus（条件付き） | Arkiv/Web担当 | 見送り | 公開素材のSwarm upload→Arkiv検索→Swarm read→画面表示を実装・実測していない。正式目標3件の不足解消を優先 |

## 提出担当の最終記録（未記入欄）

大会規則は原則2〜4分の動画を求め、EF-CROPSは3分以内の動画を要求する。共通の2〜3分動画を[撮影表](../../../docs/demo-script.md)に沿って収録し、720p以上・早送りなし・AI音声なしで再生確認する。動画と公開Git/ライブURLを賞別の主張に照らす。録画の存在、審査員による閲覧、Dashboard受付を推測で埋めない。

| 項目 | 記入欄・確認条件 |
| --- | --- |
| 最終提出commit | ________（英語UI基準`538961c`以降の差分と公開URLを再確認） |
| 公開コードと新作区分 | 匿名Gitアクセス再確認：________ ／スターター・AIBot等の来歴とStart Fresh/Classic適合をチーム確認：________ ／親・サブモジュールのライセンス/提出権利を確認：________ |
| 本番ライブ画面 | 最終URL：________ ／Alice/Bobの版・結果・同一Sepoliaブロック：________ ／旧Chromeキャッシュ対応確認：________ |
| Arkiv第三者再現 | 実施者：________ ／実施日時：________ ／2件のREADMEクエリと画面結果：________ ／失敗時の制限・再試行：________ |
| 120秒対面リハーサル | 実施者・初見観察者：________ ／実測時間：________ ／目的・主操作・送信範囲の観察記録：________ |
| 提出動画 | URL：________ ／長さ：________ ／720p・通常速度・人間の説明を確認：________ ／対象commitと撮影時刻：________ |
| EF-CROPSの動画位置 | 動作する端から端までの実演：________ ／CROPS説明：________ ／不足が残れば応募見送り理由：________ |
| ENS-V2の動画位置 | Alice/Bobの実検証とENS固有の権限・参照：________ ／未実装境界の説明：________ |
| ARKIV-APPの動画位置 | Rabdi実書込/索引読取/ユーザー画面：________ ／指定5資料と公開Gitの照合：________ |
| Hacker Dashboard | EF-CROPS：選択/未選択________・受付________ ／ENS-V2：選択/未選択________・受付________ ／ARKIV-APP：選択/未選択________・受付________ ／最終提出時刻・担当者：________ |
| 追加賞 | EF-RPC：ローカル読取のみ・本番実演なし・選択見送り（変更時は証拠：________） ／ARKIV-SWARM：実証なし・選択見送り（変更時は証拠：________） |

T031はREADMEの証拠導線を整えたが第三者再現と権利確認が残る。T033は台本と撮影表までで、人間のリハーサルと動画が残る。T036は上記の最終照合・賞の選択と受付が残る。いずれも完了扱いにしない。
