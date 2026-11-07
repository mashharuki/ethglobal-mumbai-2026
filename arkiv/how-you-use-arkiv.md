# アプリでのArkiv利用

発行者は[SDKのschema](../apps/backend/src/participation/publication.ts)でAlice/Bobの署名付き公開資格をRabdiへ書き込んだ。現行entityは発行者walletが所有し、read-onlyで、30日のexpirationを指定した。資格そのものの有効期限は最大29日に制限する。既存entityを他者が編集できる仕組みにはしていない。

indexed `issuance_id`の等価検索は、ENSv2の名前登録イベントから得る発行世代に合う資格の発見と版履歴の表示に使う。`credential_version`も索引付き。実クエリは[README](../README.md#verify-it-yourself)に記載し、Alice版1→停止版2→回復版3とBob版1を[読取証拠](../specs/001-private-dating/evidence/arkiv.md)に残した。公開資格画面は、ENSの現行`app.credential`が指すentity keyを直接読み、digest・署名・owner・期限を確認したうえで`Eligible`または別の判定を表示する。履歴画面は索引結果のcreator/owner/read-only属性・署名・digestを個別に検証し、現行ENS参照の版を示す。現行entityの読取が失敗すると画面は`unavailable`になり、キャッシュされた成功を表示し続けない。履歴検索だけの障害は現行資格の判定と区別する。

| Arkiv機能 | 実際の利用 | 利用者に見える結果 |
| --- | --- | --- |
| `issuance_id`索引 | [公開CLI](../apps/backend/scripts/query-publications.ts)とWeb版履歴が発行IDを等価検索。Alice3版、Bob1版を再読取 | 別クライアントが資格entityを発見できる。現行判定はkeyの直接読取 |
| wallet creator/owner・read-only flag | 発行者`0xcA34…Fe8E`とflagを読戻し、署名とENS参照に加えて検査 | 所有者/flagが想定外なら`eligible`にしない |
| entity expiration | 30日を指定。実entityの期限はAlice block `1600794`、Bob `1600888` | entityが取得できなければ`eligible`を表示しない。自然期限切れ時の実画面と判定種別は未観測 |

公開索引の再現は[README記載の2コマンド](../README.md#verify-it-yourself)を実行する。初回のindex block `315824`／`315827`でkey・版・digest・期限が[receipt](../specs/001-private-dating/evidence/arkiv.md)と一致した。続くAlice版2・版3の書込、ENS参照切替後も索引と直接読取を別々に確認した。ローカルWebの版履歴はArkiv index block `317246`でAliceの3版、`317255`でBobの1版を表示した。索引検索の成功だけで現行資格が有効とは判定しない。

利用者に見えるArkivの役割は、別サイトのAPIに頼らず公開資格を確認し、発行者が署名した停止・回復の版をたどれること。自然期限切れの実演と審査決定からの自動更新は未実装・未検証であり、今の画面は完成した参加・照合フローではない。
