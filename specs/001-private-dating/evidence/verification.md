# 検証記録（2026-11-07 IST、T030進行中）

対象は親リポジトリのmain `49cd9fa`から作った独立worktree。同じ開発ホストでのクリーンcheckoutであり、第三者環境での再現ではないため、T030完了とは判定しない。

| 項目 | 実行結果 | 限界・次の確認 |
| --- | --- | --- |
| `pnpm exec biome ci . --reporter=summary` | 99ファイル検査、exit 0 | `.agents`とAIBotサブモジュールは親のBiome対象から除外。別repoの品質を親のCIで保証しない |
| `pnpm --filter frontend lint` | exit 0 | 概要画面のみ。照合/登録UIの検査ではない |
| `pnpm --filter frontend build` | クリーンworktreeでVoid準備、Worker/client bundle、PWA生成までexit 0。Vercel用の`VERCEL_STATIC_BUILD=1 pnpm build`も先行してexit 0で`dist/client/index.html`を確認 | Void/PWAの生成ログには`sw.js`と出るが、クリーンビルド後の出力には存在しない。Vercelの静的ビルドではPWAを無効化 |
| Vercel本番 | main `49cd9fa`のマージ後、未認証HTTPで`200`と現行Secret Tinder HTMLを確認。新規ブラウザーからAlice/Bobを直接検証し、両方`資格あり`・Sepolia block `12080239`・資格版`1` | 既存Chromeでは旧Vite starterが再読込後も残った。旧Service Worker/キャッシュの可能性があり、原因と移行策は別途検証する |
| `pnpm --filter backend check-types` / `test` | 型検査成功、参加資格の14試験すべて成功 | 合成契約/権限試験が中心。実ネットワークの停止/再発行は未検証 |
| `pnpm --filter shared check-types` / `test` | 型検査成功、署名/schemaの12試験すべて成功 | 審査・照合・資金の受入試験ではない |
| `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist` | bundle生成、`--dry-run: exiting now`、exit 0 | Wranglerのホームディレクトリへのdebugログ書込は`EPERM`と出力。実デプロイは未実施 |
| `pnpm --filter contract format:sol:check` | exit 0 | Solidityの整形のみ |
| `pnpm --filter contract format:sol:check` / `build` / `test` | クリーンworktreeで全てexit 0。`slang` profileで既存Counterの5試験が成功 | slangは実験的コンパイラ。入金・精算の新規契約/証明はなく、実資金経路の検証ではない。以前のdefault solc buildはcompiler-download-listのロック待ちで失敗した |
| Noir回路・実証明 | 未実施 | `circuits/`は存在せず、`nargo`も環境にない。正負例を検証できない |
| Arkiv `query-publications.ts` | 型検査/Biome成功。公開RPCからAlice/Bobの発行IDで索引検索し、entity key/版/digestを取得 | 公開RPCはレート制限が厳しい。第三者環境での再現、更新/失効は未実施 |
| `verify-participation.ts`とWeb検証 | 型検査/Biome成功。Alice/BobのWeb/CLIは各同一Sepolia blockで`eligible`・版`1`が一致。Hono backend停止時にWeb動作。CLIで未登録名は`ineligible`、Sepolia/Arkiv障害は`unavailable` | Arkivは現行entity読取であり、過去Sepolia blockとの原子的スナップショットではない。Webの負例と第三者環境での再現は未実施 |

ルートBiomeは当初、ミラーされた`.agents/skills`と別リポジトリのAIBotを対象に含めて多数の既存エラーを報告した。`biome.json`で両ディレクトリを除外した後、親リポジトリの対象99ファイルが通過した。AIBotの独自検証は[作者側の検査記録](aibot-inspection.md)を参照。

残るT030の完了条件は第三者環境でのquickstart再現、Noir回路の正負例と実証明、既存Chromeの旧表示の解消、実装が増えた後の再検査。部分結果を全機能の合格と扱わない。
