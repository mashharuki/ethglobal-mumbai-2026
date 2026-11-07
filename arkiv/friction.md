# Arkivへのフィードバック

対象はSDK `@arkiv-network/sdk@1.0.1`とArkiv Rabdi（chain ID `7794095`）。現時点で書込・entity読戻し・indexed queryは成功しており、Arkiv側の障害は観測していない。

実測した摩擦は公開endpointの使い分け。access keyを渡さず`rabdi({ accessKey: "" })`で`getEntity`とindexed queryを実行すると両方成功したが、SDKは公開endpointが「heavily rate limited」と警告した。開発初期には、この経路を利用できる範囲や上限を判断しにくい。Webデモでは公開情報の単発読取は鍵なしで可能だった一方、反復テストの再現性には個別の[Arkiv Hub access key](https://hub.arkiv.network/access-keys)が必要と考えている。

再現手順は[READMEの2つのquery](../README.md#reproduce-the-public-participation-reads)と[ブラウザー検証画面](../apps/frontend/src/pages/Participation.tsx)。`ARKIV_ACCESS_KEY`を未設定にしてCLIを実行し、警告と結果を観察する。2026-11-07の実測ではAliceがindex block `312782`、Bobが`312786`で各1件返った。改善案は、公開endpointの許容リクエスト量、access keyの必要条件、ブラウザー読取時のCORS/障害時の扱いをSDK quickstartに短く併記すること。具体的な上限値や失敗率は未測定なので記載しない。
