# 賞別提出判定（2026-11-07 IST、T036進行中）

公式条件を[EF](https://ethglobal.com/events/mumbai/prizes/ethereum-foundation)、[ENS](https://ethglobal.com/events/mumbai/prizes/ens)、[Arkiv](https://ethglobal.com/events/mumbai/prizes/arkiv)で2026-11-07に再確認した。判定対象は親リポジトリの統合worktree。公開コミットとHacker Dashboardの選択・受付は未確認。[本番ライブURL](https://ethglobal-mumbai-2026.vercel.app/)のAlice/Bob公開資格はクリーンブラウザーで確認したが、統合worktreeは未公開。提出動画は未収録。**以下は応募済みの記録ではない。**

| 目標 | 担当 | 現在の判定 | 根拠と不足 |
| --- | --- | --- | --- |
| EF-CROPS — Best CROPS App | Web/ZK担当、提出担当 | 未達 | [READMEのCROPS節](../../../README.md#crops)と静的トラッカー検査はある。非公開照合の2端末実演、第三者観察、3分以内の端から端までの動画がない。AIBotサブモジュールのライセンスも未確認。[EF条件](https://ethglobal.com/events/mumbai/prizes/ethereum-foundation)の実動作を満たしていない |
| ENS-V2 — Best Use of ENSv2 | API担当、Web/検証担当 | 未達 | [実ENSv2取引とWeb/独立CLI比較](ens.md)で専用Resolver、限定setter、Arkiv参照、Alice/Bobの各同一ブロック判定と本番の公開資格画面を確認。オフライン負例と[合成審査](participation-review.md)は追加したが、チームの受入基準にある実ネットワークの有限停止/回復、委任鍵失効、本人審査UIとの接続は未達。[ENS公式条件](https://ethglobal.com/events/mumbai/prizes/ens)の最終応募判断はT036で機能範囲を限定して行う |
| ARKIV-APP — Build on Arkiv (from scratch) | Arkiv担当、Web担当 | 再確認待ち | [Alice/Bobの実書込、索引読取と本番Web実読取](arkiv.md)を確認。[指定の5資料](../../../arkiv/schema.md)とREADMEの書込ウォレット・再現クエリもある。[Arkiv条件](https://ethglobal.com/events/mumbai/prizes/arkiv)の技術要素は公開資格を中心に実演可能。チーム外の第三者再現、新作/再利用区分、5資料・公開Gitの最終照合とDashboard選択が未確認。公開登録・新版/失効は後段の製品課題で公式必須条件ではない |
| EF-RPC — Best Use of Anon-RPC（追加候補） | Web担当 | 未達 | Anon-RPCを標準読取とする実装・実測がない。EF-CROPS自体の必須要件にはしない |
| ARKIV-SWARM — Arkiv + Swarm bonus（条件付き） | Arkiv/Web担当 | 見送り | 公開素材のSwarm upload→Arkiv検索→Swarm read→画面表示を実装・実測していない。正式目標3件の不足解消を優先 |

共通の未完了項目は[検証記録](verification.md)、[120秒対面台本](../../../docs/demo-script.md)のリハーサル、EF-CROPSに必須の2〜3分提出動画、チーム外の第三者によるライブ画面/クエリ確認、新作範囲と公開Git履歴の最終照合。提出時には対象コミットとDashboardの選択結果・受付を追記する。
