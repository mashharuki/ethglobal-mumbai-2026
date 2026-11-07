# 検証記録（2026-11-07 IST、T030進行中）

対象は親リポジトリのmain `49cd9fa`から作った統合worktree `feat/001-spec-integration`。API・ENS・Webの担当worktreeのコミットをcherry-pickし、PR [#4](https://github.com/mashharuki/ethglobal-mumbai-2026/pull/4)を全CI成功後にmainへマージした。マージコミットは`8d1ceb7`。以下のローカル検査は同じ開発ホストで行い、第三者環境での再現ではないため、T030完了とは判定しない。

| 項目 | 実行結果 | 限界・次の確認 |
| --- | --- | --- |
| `pnpm exec biome ci .` | 統合後124ファイル検査、exit 0 | `.agents`とAIBotサブモジュール、Wrangler生成型は親のBiome対象から除外。別repoの品質を親のCIで保証しない |
| `pnpm --filter frontend lint` / `build` | 統合後ともにexit 0。Void準備、Worker/client bundleを確認。`VERCEL_STATIC_BUILD=1`でもbuildし、Vercel設定どおり退役用`sw.js`を出力 | 対面開示/審査UIは独立プレビューで公開Appには未接続。照合/登録UIの合格ではない |
| Vercel本番 | PR #4マージ後、公開URLのHTMLは新しい`index-CxflyAhj.js`を参照し、Vercelがマージコミットのデプロイ成功を報告。bundleに「公開資格の実演を見る」等の新文言を確認。`/sw.js`はHTTP 200・`Cache-Control: no-store`で退役コードを配信。新規ブラウザーからAlice/Bobをそれぞれ直接検証し、両方`資格あり`・Sepolia block `12080373`・資格版`1`を表示。旧Vite starterが残っていた既存Chromeタブも再読込後に新画面へ移った | 同じ開発者の端末での観察。第三者ブラウザーや別端末での再現ではない。旧Service Workerが各利用者端末で必ず自動退役することまでは確認していない |
| `pnpm --filter backend check-types` / `test` | 統合後に型検査成功。参加資格34件とSIWE認証1件を通常のbackend testで実行し35件成功。2つのローカルWrangler試験が同時起動して一度失敗したため`--test-concurrency=1`で順次実行 | 外部への審査APIデプロイ、通報の接触資格検証、審査員認可、署名資格への反映は未実装・未検証 |
| 本人向け審査API | ローカルWranglerで停止中の本人が通知GET・反証POST・異議POSTを利用でき、別人には404。操作IDの本人照会と`Cache-Control: no-store`も確認 | 合成ケースの試験用ハーネスでseed。公開の通報作成と審査員決定は本番の信頼設定がないため公開しない |
| `pnpm --filter shared check-types` / `test` | 型検査成功、署名/schemaの12試験すべて成功 | 審査・照合・資金の受入試験ではない |
| `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist` | 統合後bundle生成、`AUTH_STORE` Durable Object bindingを表示してexit 0 | 実デプロイは未実施。最初のsandbox内試行は出力先/ログ書込の`EPERM`で失敗し、権限付き再試行で成功 |
| `pnpm --filter contract format:sol:check` | exit 0 | Solidityの整形のみ |
| `pnpm --filter contract format:sol:check` / `build` / `test` | 統合後に全てexit 0。`slang` profileで既存Counterの5試験が成功。Sepolia固定ブロックへの読取専用ENS権限試験は担当worktreeで4件成功 | slangは実験的コンパイラ。入金・精算の新規契約/証明はなく、実資金経路の検証ではない。並列試行のbuildはcompiler-download-listロック待ちで一度失敗し、単独再試行で成功した |
| 平文照合oracle | `node --test circuits/oracle.test.ts` の12試験成功。固定288座標とSC-002の条件7例を確認 | `nargo`環境とNoir回路・実証明はなく、残り3例の証明主体/版・リース検証は未実施。秘匿性の実証ではない |
| 対面開示プレビュー | `node --test apps/frontend/src/pages/in-person-disclosure.test.ts` の5試験成功 | 合成fixtureの項目別照合であり、実登録ルート・成立マッチ・資金経路に未接続 |
| 本人向け審査プレビュー | `node --test apps/frontend/src/pages/participation-review-preview.test.ts` の4試験成功 | 合成fixtureのみ。本人認証、私的API、ENS新版、公開Appには未接続 |
| Arkiv `query-publications.ts` | 型検査/Biome成功。公開RPCからAlice/Bobの発行IDで索引検索し、entity key/版/digestを取得 | 公開RPCはレート制限が厳しい。第三者環境での再現、更新/失効は未実施 |
| `verify-participation.ts`とWeb検証 | 型検査/Biome成功。Alice/BobのWeb/CLIは各同一Sepolia blockで`eligible`・版`1`が一致。Hono backend停止時にWeb動作。統合後Web/CLIの署名fixture負例10試験も成功 | Arkivは現行entity読取であり、過去Sepolia blockとの原子的スナップショットではない。Webの実ネットワーク負例と第三者環境での再現は未実施 |
| 資格新版の読取専用計画 | Aliceの現行Sepolia block`12080307`から停止version2のdraftを作成。旧V1署名のpublication転用は拒否。Arkiv読戻しが一致するまでENS更新計画を出さない | 実署名・Rabdi新版書込・ENS参照更新・期限後の実回復は未実施。既存Alice/Bob公開状態は変更していない |

ルートBiomeは当初、ミラーされた`.agents/skills`と別リポジトリのAIBotを対象に含めて多数の既存エラーを報告した。`biome.json`で両ディレクトリを除外した後、親リポジトリの対象99ファイルが通過した。AIBotの独自検証は[作者側の検査記録](aibot-inspection.md)を参照。

残るT030の完了条件は第三者環境でのquickstart再現、Noir回路の正負例と実証明、公開後の第三者端末での画面・資格検査。部分結果を全機能の合格と扱わない。
