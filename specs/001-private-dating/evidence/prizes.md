# 賞別提出判定（2026-11-07 IST、T036進行中）

公式条件を[EF](https://ethglobal.com/events/mumbai/prizes/ethereum-foundation)、[ENS](https://ethglobal.com/events/mumbai/prizes/ens)、[Arkiv](https://ethglobal.com/events/mumbai/prizes/arkiv)で再確認した。判定対象は親リポジトリの未コミット作業ツリー（基点コミット`1c024df`）。公開コミット、ライブデモ、提出動画、Hacker Dashboardの選択・受付は未確認。**以下は応募済みの記録ではない。**

| 目標 | 担当 | 現在の判定 | 根拠と不足 |
| --- | --- | --- | --- |
| EF-CROPS — Best CROPS App | Web/ZK担当、提出担当 | 未達 | [READMEのCROPS節](../../../README.md#crops)と静的トラッカー検査はある。非公開照合の2端末実演、第三者観察、3分以内の端から端までの動画がない。AIBotサブモジュールのライセンスも未確認。[EF条件](https://ethglobal.com/events/mumbai/prizes/ethereum-foundation)の実動作を満たしていない |
| ENS-V2 — Best Use of ENSv2 | API担当、Web/検証担当 | 未達 | [実ENSv2取引](ens.md)で専用Resolver、限定setter、Arkiv参照を確認。独立したWeb/CLI検証、有限停止と失効鍵、機能するライブデモの検証が残る。[ENS条件](https://ethglobal.com/events/mumbai/prizes/ens)の中心機能の実演をまだ確認できない |
| ARKIV-APP — Build on Arkiv (from scratch) | Arkiv担当、Web担当 | 未達 | [Alice/Bob書込](arkiv-alice-publication.json)はreceipt/SDK読戻し済み。発行者と索引検索CLIは[README](../../../README.md)に記載。ただし検索CLIの実測と、利用者が見る機能での実データ読取、登録の更新・失効、指定`arkiv/*.md`資料が未了。[Arkiv条件](https://ethglobal.com/events/mumbai/prizes/arkiv)では書込だけでは足りない |
| EF-RPC — Best Use of Anon-RPC（追加候補） | Web担当 | 未達 | Anon-RPCを標準読取とする実装・実測がない。EF-CROPS自体の必須要件にはしない |
| ARKIV-SWARM — Arkiv + Swarm bonus（条件付き） | Arkiv/Web担当 | 見送り | 公開素材のSwarm upload→Arkiv検索→Swarm read→画面表示を実装・実測していない。正式目標3件の不足解消を優先 |

共通の未完了項目は[検証記録](verification.md)、[120秒対面台本](../../../docs/demo-script.md)のリハーサル、2〜3分の提出動画、第三者が開けるライブURL、新作範囲と公開Git履歴の最終照合。提出時には対象コミットとDashboardの選択結果・受付を追記する。
