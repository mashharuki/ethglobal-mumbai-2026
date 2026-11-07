# アプリでのArkiv利用

発行者は[SDKのschema](../apps/backend/src/participation/publication.ts)でAlice/Bobの署名付き公開資格をRabdiへ書き込んだ。現行entityは発行者walletが所有し、read-onlyで、30日のexpirationを指定した。資格そのものの有効期限は最大29日に制限する。既存entityを他者が編集できる仕組みにはしていない。

indexed `issuance_id`の等価検索は、ENSv2の名前登録イベントから得る発行世代に合う資格の発見に使う。`credential_version`も索引付き。実クエリは[README](../README.md#reproduce-the-public-participation-reads)に記載し、Alice/Bobの結果を[読取証拠](../specs/001-private-dating/evidence/arkiv.md)に残した。公開資格画面は、ENSの現行`app.credential`が指すentity keyを直接読み、digest・署名・owner・期限を確認したうえで「資格あり」または別の判定を表示する。したがってArkivの読取が失敗すると画面は`unavailable`になり、キャッシュされた成功を表示し続けない。

利用者に見えるArkivの役割は、別サイトのAPIに頼らず公開資格を確認できること。期限切れの実演、資格新版の書込とENS参照の切替、停止/回復は未実装・未検証であり、今の画面は完成した参加・照合フローではない。
