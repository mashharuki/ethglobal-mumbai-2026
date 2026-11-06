# Arkiv + Swarm：公開場面素材（条件付き追加案）

ARKIV-SWARMは同じArkiv枠の追加候補。基礎の3賞と2分デモの準備を優先し、T044で実書込・実読取・利用画面・証拠がそろう場合だけT036で選択する。現状は未実装。[公式条件](https://ethglobal.com/events/mumbai/prizes/arkiv)。

用途はAIBotを試す前に選ぶ公開の場面カード（例：カフェ・雨の日・散歩）の文章/画像。個人の顔写真やプロフィールを並べる機能にはしない。既存AIBotのシーンを置き換えるAPIがあるとは仮定せず、親のテーマ紹介画面で実際に素材を表示する最小統合から始める。

| 保管先 | 内容 | 利用者に生じる効果 |
| --- | --- | --- |
| Arkiv | 公開sceneId、言語、素材版、タイトル、Swarmの公開reference、SHA-256、byteLength、MIME、許可publisher、期限 | 言語と有効な場面で検索し、現行の公開カードを発見する。他クライアントも同じ公開素材を取得できる |
| Swarm | 権利を確認した公開用の文章・画像。アップロード時のreferenceをArkivへ結び付ける | Arkivの実際の検索結果から素材を読み、画面に表示する |
| 非公開領域 | Persona、インタビュー、会話、ペア、同意、鍵、assertion | Arkiv / Swarmのボーナス実演のために公開しない |

公開・非暗号化のreferenceのみをこのカタログに使用する。暗号化Swarm referenceには復号鍵が含まれるため、そのまま公開Arkivへ載せない。Arkivの期限切れはSwarmのファイル削除や取得済みコピーの消去を意味しない。

公開元は独立した許可publisherとreadonlyな版で検証する。素材は任意HTMLとして実行せず、許可したMIME・サイズ・長さ・digest・ライセンスを確認する。検索不能、期限切れ、Swarm取得不能、改ざんはそれぞれ表示し、固定素材へのfallbackをSwarm実読取成功と数えない。Swarm側の保存期間/可用性とArkiv側の掲載期限は別に記録する。

## T044で残す証拠

`arkiv/swarm.md`に、保存内容と参照field、実entity keyとSwarm reference・開けるリンク、postage batch IDと購入walletまたは提供者、使用Bee node/service、upload/readコードのパス、必要な設定と再現手順、動画の該当秒、利用上の問題を書く。秘密やkey付きreferenceを提出証拠へ載せない。実upload→Arkiv検索→Swarm read→画面表示を一度通す。

依存導入・外部書込・postage購入は各承認境界に従う。資金提供者やbatchが未確定の段階では支払い・永続保存・応募達成を約束しない。
