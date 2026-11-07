# なぜArkivか

参加資格の内容と発行者署名をArkivのwallet-owned entityとして公開し、ENSv2の発行者限定`app.credential`参照から取得できる。別クライアントはチームのHonoバックエンドが止まっていても、公開entityを読んで署名・現行ENS参照を検証できる。[ブラウザーと独立CLIの比較](../specs/001-private-dating/evidence/ens.md#ブラウザーとcliの比較)ではこの読取を実測した。

Postgresでも同じschemaと検索APIは作れる。ただし、この実装のように公開チェーン上のentity key・wallet creator/owner・期限と、ENSからの参照を第三者が自分の読取経路で追うには、Postgres運営者のAPI公開・可用性・監査可能性に追加の信頼が要る。Arkivの選択は公開資格の可搬性と索引検索を利用者の見える検証へ結び付けるため。暗号署名の正当性や発行者の誠実さをArkiv単体が保証するとは主張しない。

実際にユーザーが見る差は、[画面の現行entity読取](../apps/frontend/src/pages/Participation.tsx)に失敗すると`unavailable`になる点と、[独立CLI](../scripts/verify-participation.ts)が同じENS参照とArkiv entityを自分で検証できる点。`issuance_id`索引は[公開クエリ](../apps/backend/scripts/query-publications.ts)と[Web版履歴](../apps/frontend/src/pages/participation-verifier.ts)で、Aliceの停止・回復を同じ発行世代の別entityとして見つけるために使う。現行の有効状態はENS参照で決める。Arkivを単なる監査ログとして置いたものではない。一方、Postgresでも運営者が署名付きデータを完全公開すれば暗号学的な署名検証そのものは可能であり、この違いを「Arkivだけが署名を検証できる」とは説明しない。

Arkivに置かないものは、趣味、希望条件、ペア、照合結果、審査の私的根拠、AI会話。これらは公開すると当初のプライバシー目的に反する。公開資格のウォレット/ENS名/時刻も関連付け可能なので、完全匿名の仕組みとは説明しない。
