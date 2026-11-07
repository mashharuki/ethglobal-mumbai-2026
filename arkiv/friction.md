# Arkivへのフィードバック

対象はSDK `@arkiv-network/sdk@1.0.1`とArkiv Rabdi（chain ID `7794095`）。現時点で書込・entity読戻し・indexed queryは成功しており、Arkiv側の障害は観測していない。

実測した摩擦は公開endpointの使い分け。access keyを渡さず`rabdi({ accessKey: "" })`で`getEntity`とindexed queryを実行すると両方成功したが、SDKは公開endpointが「heavily rate limited」と警告した。開発初期には、この経路を利用できる範囲や上限を判断しにくい。Webデモでは公開情報の単発読取は鍵なしで可能だった一方、反復テストの再現性には個別の[Arkiv Hub access key](https://hub.arkiv.network/access-keys)が必要と考えている。

今回も[同じ2クエリ](../specs/001-private-dating/evidence/arkiv.md)がindex block `315824`／`315827`で成功した。実際の429やCORS失敗は今回観測していないため、障害発生の再現例としては扱わない。困った点は、警告だけでは「単発デモは許されるのか」「何回から個別キーが必要か」を判断できないことだった。

再現手順は[READMEの2つのquery](../README.md#verify-it-yourself)と[ブラウザー検証画面](../apps/frontend/src/pages/Participation.tsx)。`ARKIV_ACCESS_KEY`を未設定にしてCLIを実行し、警告と結果を観察する。改善案は、公開endpointの許容リクエスト量、access keyの必要条件、ブラウザー読取時のCORS/障害時の扱いをSDK quickstartに短く併記すること。具体的な上限値や失敗率は未測定なので記載しない。
