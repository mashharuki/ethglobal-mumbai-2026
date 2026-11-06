# AIBotコード確認記録

2026-11-06、読み取りのみ。サブモジュールのコード・設定・ポインタを変更せず、依存導入、テスト、OpenAI呼出し、公開は実行していない。

| 確認対象 | 観察結果 |
| --- | --- |
| 調査開始時の親の記録 | `96c27295117b2d9d0dce3b0769cb6171a141a2ac`。READMEタイトルだけの旧版 |
| 作業ディレクトリとリモートmain | `4efa4249cce0fc3d268c7f7af1ea96deef66be3d`。ユーザー側で取得済み。`git ls-remote`との一致を確認 |
| コード | [API route](../../../ethglobal-mumbai-2026-AIBot/src/app/api/[...path]/route.ts)、[ゲーム](../../../ethglobal-mumbai-2026-AIBot/src/lib/game.ts)、[推論](../../../ethglobal-mumbai-2026-AIBot/src/lib/server/llm.ts)、[Adapter](../../../ethglobal-mumbai-2026-AIBot/docs/MATCHING_ADAPTER.md)を読取確認 |
| 実装された単体機能 | インタビュー、Personaの抽出/校正/承認/暗号化保存、同意撤回、自由会話、3シーン9ターン、Retry、日英、架空申請 |
| 作者による検証報告 | [README](../../../ethglobal-mumbai-2026-AIBot/README.md)に型チェック・build・9単体試験・デモ全体・実OpenAIの限定スモーク成功。当調査で再実行した結果ではない |
| 未確認・未接続 | 親のPSI/資格・本番認証・実申請・外部公開。結合契約を実装してT029で別途検証 |

調査中に親コミット`a35535d`が作成され、親gitlinkも`4efa4249cce0fc3d268c7f7af1ea96deef66be3d`へ更新されたことを確認した。この調査ではコミット・push・サブモジュールの変更を実行していない。新規クローンでの起動・結合確認は引き続きT029の対象。

本人対Personaを採用するユーザー確認を受け、旧共同World Modelの要件を[新しい接続契約](../contracts/simulation.md)へ変更した。AIBot単体の存在を二者照合やENS/Arkiv統合の成功と扱わない。
