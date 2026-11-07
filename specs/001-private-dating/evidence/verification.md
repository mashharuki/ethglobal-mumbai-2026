# 検証記録（2026-11-07 IST、T030進行中）

対象は親リポジトリのmain `49cd9fa`から作った統合worktree `feat/001-spec-integration`。API・ENS・Webの担当worktreeのコミットをcherry-pickし、同じ開発ホストで検査した。第三者環境での再現ではないため、T030完了とは判定しない。以下の本番観察はmain `49cd9fa`であり、統合ブランチの公開動作ではない。

| 項目 | 実行結果 | 限界・次の確認 |
| --- | --- | --- |
| `pnpm exec biome ci .` | 統合後112ファイル検査、exit 0 | `.agents`とAIBotサブモジュール、Wrangler生成型は親のBiome対象から除外。別repoの品質を親のCIで保証しない |
| `pnpm --filter frontend lint` / `build` | 統合後ともにexit 0。Void準備、Worker/client bundle、PWA生成を確認 | 対面開示は独立プレビューで公開Appには未接続。照合/登録UIの合格ではない |
| Vercel本番 | main `49cd9fa`のマージ後、未認証HTTPで`200`と現行Secret Tinder HTMLを確認。新規ブラウザーからAlice/Bobを直接検証し、両方`資格あり`・Sepolia block `12080239`・資格版`1` | 既存Chromeでは旧Vite starterが再読込後も残った。旧Service Worker/キャッシュの可能性があり、原因と移行策は別途検証する |
| `pnpm --filter backend check-types` / `test` | 統合後に型検査成功、参加資格の21試験すべて成功。追加の認証統合試験も明示実行で1件成功 | 認証試験はbackendの通常`test` scriptに未登録。自動承認審査がscript変更を拒否したため、明示承認を確認中。実ネットワークの停止/再発行は未検証 |
| `pnpm --filter shared check-types` / `test` | 型検査成功、署名/schemaの12試験すべて成功 | 審査・照合・資金の受入試験ではない |
| `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist` | 統合後bundle生成、`AUTH_STORE` Durable Object bindingを表示してexit 0 | 実デプロイは未実施。最初のsandbox内試行は出力先/ログ書込の`EPERM`で失敗し、権限付き再試行で成功 |
| `pnpm --filter contract format:sol:check` | exit 0 | Solidityの整形のみ |
| `pnpm --filter contract format:sol:check` / `build` / `test` | 統合後に全てexit 0。`slang` profileで既存Counterの5試験が成功。Sepolia固定ブロックへの読取専用ENS権限試験は担当worktreeで4件成功 | slangは実験的コンパイラ。入金・精算の新規契約/証明はなく、実資金経路の検証ではない。並列試行のbuildはcompiler-download-listロック待ちで一度失敗し、単独再試行で成功した |
| 平文照合oracle | `node --test circuits/oracle.test.ts` の12試験成功。固定288座標とSC-002の条件7例を確認 | `nargo`環境とNoir回路・実証明はなく、残り3例の証明主体/版・リース検証は未実施。秘匿性の実証ではない |
| 対面開示プレビュー | `node --test apps/frontend/src/pages/in-person-disclosure.test.ts` の5試験成功 | 合成fixtureの項目別照合であり、実登録ルート・成立マッチ・資金経路に未接続 |
| Arkiv `query-publications.ts` | 型検査/Biome成功。公開RPCからAlice/Bobの発行IDで索引検索し、entity key/版/digestを取得 | 公開RPCはレート制限が厳しい。第三者環境での再現、更新/失効は未実施 |
| `verify-participation.ts`とWeb検証 | 型検査/Biome成功。Alice/BobのWeb/CLIは各同一Sepolia blockで`eligible`・版`1`が一致。Hono backend停止時にWeb動作。統合後Web/CLIの署名fixture負例10試験も成功 | Arkivは現行entity読取であり、過去Sepolia blockとの原子的スナップショットではない。Webの実ネットワーク負例と第三者環境での再現は未実施 |

ルートBiomeは当初、ミラーされた`.agents/skills`と別リポジトリのAIBotを対象に含めて多数の既存エラーを報告した。`biome.json`で両ディレクトリを除外した後、親リポジトリの対象99ファイルが通過した。AIBotの独自検証は[作者側の検査記録](aibot-inspection.md)を参照。

残るT030の完了条件は第三者環境でのquickstart再現、Noir回路の正負例と実証明、既存Chromeの旧表示の解消、公開後の統合ブランチ検査。部分結果を全機能の合格と扱わない。
