# 検証記録（2026-11-07 IST、T030進行中）

対象は親リポジトリの未コミット作業ツリー（基点コミット`1c024df`）。第三者のクリーン環境ではまだ再現していないため、T030完了とは判定しない。

| 項目 | 実行結果 | 限界・次の確認 |
| --- | --- | --- |
| `pnpm exec biome ci . --reporter=summary` | 95ファイル検査、exit 0 | `.agents`とAIBotサブモジュールは親のBiome対象から除外。別repoの品質を親のCIで保証しない |
| `pnpm --filter frontend lint` | exit 0 | 概要画面のみ。照合/登録UIの検査ではない |
| `pnpm --filter frontend build` | Void準備、Worker/client bundle、PWA生成までexit 0 | ライブURLと実ブラウザーの外部到達性は未確認 |
| `pnpm --filter backend check-types` / `test` | 型検査成功、参加資格の14試験すべて成功 | 合成契約/権限試験が中心。実ネットワークの停止/再発行は未検証 |
| `pnpm --filter shared check-types` / `test` | 型検査成功、署名/schemaの12試験すべて成功 | 審査・照合・資金の受入試験ではない |
| `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist` | bundle生成、`--dry-run: exiting now`、exit 0 | Wranglerのホームディレクトリへのdebugログ書込は`EPERM`と出力。実デプロイは未実施 |
| `pnpm --filter contract format:sol:check` | exit 0 | Solidityの整形のみ |
| `pnpm --filter contract build` | `MultiProcessMutexTimeoutError`でexit 1 | `~/Library/Caches/hardhat-nodejs/compilers-v3/compiler-download-list`のロック取得が60秒で失敗。Hardhat testも本作業では実行できていない |
| Noir回路・実証明 | 未実施 | `circuits/`は存在せず、`nargo`も環境にない。正負例を検証できない |
| Arkiv `query-publications.ts` | TypeScript/Biome成功。実検索は未実測 | `ARKIV_ACCESS_KEY`が未設定。第三者の鍵で索引反映と出力を確認する |

ルートBiomeは当初、ミラーされた`.agents/skills`と別リポジトリのAIBotを対象に含めて多数の既存エラーを報告した。`biome.json`で両ディレクトリを除外した後、親リポジトリの対象95ファイルが通過した。AIBotの独自検証は[作者側の検査記録](aibot-inspection.md)を参照。

残るT030の完了条件は第三者環境でのquickstart再現、Hardhat build/test、Noir回路の正負例と実証明、実ブラウザー/デプロイ確認。これらは実行せずに成功と記載しない。
