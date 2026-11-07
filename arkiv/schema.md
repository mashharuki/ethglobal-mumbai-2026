# Secret TinderのArkiv schema

対象賞はETHGlobal Mumbai 2026の[Build on Arkiv (from scratch)](https://ethglobal.com/events/mumbai/prizes/arkiv)。現行テストネットはArkiv Rabdi、chain ID `7794095`。コード上のschemaは[ParticipationPublications](../apps/backend/src/participation/publication.ts)、実データと再現クエリは[読取証拠](../specs/001-private-dating/evidence/arkiv.md)にある。

| Entity | field | 型・検索 | 用途 |
| --- | --- | --- | --- |
| `secret_tinder_participation_v1` | `issuance_id` | string、indexed | ENSv2登録イベントから導く発行世代で等価検索 |
| 同上 | `credential_version` | uint64、indexed | 現行参照との版照合。画面の履歴は`issuance_id`索引で検索 |
| 同上 | `record_digest` | string | ENS `app.credential`のdigestと照合 |
| 同上 | `media_type` | string | `application/json`を確認 |
| 同上 | `content` | bytes | 発行者署名付きの公開資格JSON。主体・状態・期限などを含む |

書込者・original creator・現行ownerは発行者`0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E`。entityは`readonly: true`、`permissionlessExtension: false`で作り、Arkiv SDKの`ExpirationTime.fromDays(30)`を指定する。署名資格の期限は最大29日とし、Arkiv側の期限が先に来ないよう余裕を取る。Aliceの停止版2と回復版3は既存entityを編集せず新規発行し、その都度ENS参照を更新して読戻した。審査APIからの自動反映は未実装。

Alice現行版3 entity key: `0xe71e5fc6e6da0cfc338f8ca32a304947bcb98a7af0245a09638a101bcb4cbe0e`。Bob現行版1 entity key: `0x4e253c8b29d21b401d99a970bfe8624d0d27bd835e49962006e8c1440d39c151`。Alice旧版1・2のkey、書込receipt・読戻し・digestは[証拠](../specs/001-private-dating/evidence/arkiv.md)を参照。

初回entityのArkiv expirationはAliceがblock `1600794`、Bobが`1600888`で、書込receiptから読戻した値。自然期限切れの場面は未観測。索引検索は[再現スクリプト](../apps/backend/scripts/query-publications.ts)と[Web版履歴](../apps/frontend/src/pages/participation-verifier.ts)の`createdBy(issuer)`と`where(eq("issuance_id", ...))`を組み合わせる。現行資格の判定はENS参照先のentity keyを直接読み、履歴は現在索引に残る署名済みentityを列挙する。索引だけでは現行資格を決定しない。

趣味、希望条件、ペア、照合結果、審査根拠、AI会話はArkivへ保存しない。公開資格にはウォレット、ENS名、発行者、状態と期限が含まれ、相互に関連付けられる。この公開範囲はUIで説明する。
