# 検証記録（2026-11-07 IST、T030進行中）

対象は親リポジトリの作業ツリー。第三者のクリーン環境ではまだ再現していないため、T030完了とは判定しない。

| 項目 | 実行結果 | 限界・次の確認 |
| --- | --- | --- |
| `pnpm exec biome ci . --reporter=summary` | 99ファイル検査、exit 0 | `.agents`とAIBotサブモジュールは親のBiome対象から除外。別repoの品質を親のCIで保証しない |
| `pnpm --filter frontend lint` | exit 0 | 概要画面のみ。照合/登録UIの検査ではない |
| `pnpm --filter frontend build` | Void準備、Worker/client bundleまでexit 0。Vercel用の`VERCEL_STATIC_BUILD=1 pnpm build`もexit 0で`dist/client/index.html`を確認 | Void/PWAの生成ログには`sw.js`と出るが、クリーンビルド後の出力には存在しない。Vercelの静的ビルドではPWAを無効化 |
| Vercel本番 | Dashboardはmain `0545316`のdeploymentをReadyと表示。公開URLとdeployment固有URLへの新規アクセスは両方`404 NOT_FOUND` | Dashboardの出力に`client/`があり、公開対象の`dist`直下に`index.html`がない構成。`apps/frontend/vercel.json`で`dist/client`を指定したが本番には未反映 |
| `pnpm --filter backend check-types` / `test` | 型検査成功、参加資格の14試験すべて成功 | 合成契約/権限試験が中心。実ネットワークの停止/再発行は未検証 |
| `pnpm --filter shared check-types` / `test` | 型検査成功、署名/schemaの12試験すべて成功 | 審査・照合・資金の受入試験ではない |
| `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist` | bundle生成、`--dry-run: exiting now`、exit 0 | Wranglerのホームディレクトリへのdebugログ書込は`EPERM`と出力。実デプロイは未実施 |
| `pnpm --filter contract format:sol:check` | exit 0 | Solidityの整形のみ |
| `pnpm --filter contract build` | `MultiProcessMutexTimeoutError`でexit 1 | `~/Library/Caches/hardhat-nodejs/compilers-v3/compiler-download-list`のロック取得が60秒で失敗。Hardhat testも本作業では実行できていない |
| Noir回路・実証明 | 未実施 | `circuits/`は存在せず、`nargo`も環境にない。正負例を検証できない |
| Arkiv `query-publications.ts` | 型検査/Biome成功。公開RPCからAlice/Bobの発行IDで索引検索し、entity key/版/digestを取得 | 公開RPCはレート制限が厳しい。第三者環境での再現、更新/失効は未実施 |
| `verify-participation.ts`とWeb検証 | 型検査/Biome成功。Alice/BobのWeb/CLIは各同一Sepolia blockで`eligible`・版`1`が一致。Hono backend停止時にWeb動作。CLIで未登録名は`ineligible`、Sepolia/Arkiv障害は`unavailable` | Arkivは現行entity読取であり、過去Sepolia blockとの原子的スナップショットではない。Webの負例と第三者環境での再現は未実施 |

ルートBiomeは当初、ミラーされた`.agents/skills`と別リポジトリのAIBotを対象に含めて多数の既存エラーを報告した。`biome.json`で両ディレクトリを除外した後、親リポジトリの対象99ファイルが通過した。AIBotの独自検証は[作者側の検査記録](aibot-inspection.md)を参照。

残るT030の完了条件は第三者環境でのquickstart再現、Hardhat build/test、Noir回路の正負例と実証明、実ブラウザー/デプロイ確認。これらは実行せずに成功と記載しない。
