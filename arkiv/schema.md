# Secret TinderのArkiv schema

対象賞はETHGlobal Mumbai 2026の[Build on Arkiv (from scratch)](https://ethglobal.com/events/mumbai/prizes/arkiv)。現行テストネットはArkiv Rabdi、chain ID `7794095`。コード上のschemaは[ParticipationPublications](../apps/backend/src/participation/publication.ts)、実データと再現クエリは[読取証拠](../specs/001-private-dating/evidence/arkiv.md)にある。

| Entity | field | 型・検索 | 用途 |
| --- | --- | --- | --- |
| `secret_tinder_participation_v1` | `issuance_id` | string、indexed | ENSv2登録イベントから導く発行世代で等価検索 |
| 同上 | `credential_version` | uint64、indexed | 現行参照との版照合。画面はentity keyによる直接読取 |
| 同上 | `record_digest` | string | ENS `app.credential`のdigestと照合 |
| 同上 | `media_type` | string | `application/json`を確認 |
| 同上 | `content` | bytes | 発行者署名付きの公開資格JSON。主体・状態・期限などを含む |

書込者・original creator・現行ownerは発行者`0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E`。entityは`readonly: true`、`permissionlessExtension: false`で作り、Arkiv SDKの`ExpirationTime.fromDays(30)`を指定する。署名資格の期限は最大29日とし、Arkiv側の期限が先に来ないよう余裕を取る。旧版の更新は既存entityを編集する設計ではなく、新版を新規発行してENS参照を更新する計画であり、実演は未完了。

Alice entity key: `0x628a86b2b8d2ee96d9b91b92a9013f10ce67421e4792bf7911c46234d92ab5d6`。Bob entity key: `0x4e253c8b29d21b401d99a970bfe8624d0d27bd835e49962006e8c1440d39c151`。書込receipt・読戻し・digestは[証拠](../specs/001-private-dating/evidence/arkiv.md)を参照。

実際のArkiv entity expirationはAliceがblock `1600794`、Bobが`1600888`で、書込receiptから読戻した値。30日指定の仕組みは実装・書込済みだが、自然期限切れや新版への切替が起きた場面はまだ観測していない。索引検索は[再現スクリプト](../apps/backend/scripts/query-publications.ts)の`createdBy(issuer)`と`where(eq("issuance_id", ...))`を組み合わせる。ライブ画面は検索結果を固定表示せず、ENSの現行参照が指すentity keyを直接読む。

趣味、希望条件、ペア、照合結果、審査根拠、AI会話はArkivへ保存しない。公開資格にはウォレット、ENS名、発行者、状態と期限が含まれ、相互に関連付けられる。この公開範囲はUIで説明する。
