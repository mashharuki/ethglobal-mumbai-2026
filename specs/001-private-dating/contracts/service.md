# ブラウザー、API、外部サービスの契約

この文書は実装前の設計である。HTTP の機械可読な契約は [packages/api-specs/openapi.yaml](../../../packages/api-specs/openapi.yaml) に集約し、実装時はそこで入出力と失敗コードを確定してからクライアントを生成する。公開登録、検索中の照合、成立後の共同セッションは公開範囲が異なる。

## 用途別の境界

| 境界 | 渡してよいもの | 検証と保持 |
| --- | --- | --- |
| 端末 → 公開登録 | 仮名、登録版、乱数で秘匿した登録コミットメント、登録証明、所有者の登録署名 | 仮名の管理権、現行版、登録証明を確認。職業・年齢帯の値、趣味と照合の送り先は公開しない |
| 端末 ↔ 照合相手 | 検索ごとの一時鍵、双方の登録版を拘束した秘匿照合のメッセージ | 相手の一時鍵と登録所有者の署名を照合してから暗号化チャネルを確立。相性の結果は各端末で検証し、中継先に平文の結果や共有した趣味を送らない |
| 端末 → 共同セッション | ランダムな参加資格、参加の意思、共有するテーマと選択肢の識別子 | 非公開。サービスは操作の時刻・アクセス元などの関連を推測し得る。公開検索、RPC引数、診断ログ、分析サービスに組や進行を記載しない |
| セッション → World Model | 順番、場面コード、共有テーマ、匿名の役割 A/B の選択履歴 | 結果は場面・状態の変化・2〜4個の選択肢に限定。仮名、住所、資金、職業、年齢帯、趣味の原文、登録証明を渡さない |
| 登録・精算 → 表示 | 確認済み記録と保留中の操作ID、元の銘柄・数量 | 最終的な預託・返却・受領の根拠はチェーン。APIの応答とモデルの出力に資金を動かす権限はない |

## HTTP と中継の操作（接頭辞 /v1）

ブラウザーは同一オリジンの BFF を利用する。ウォレット署名を使う認証では domain、URI、chainId、単回 nonce、有効期限を検証し、短命の HttpOnly/Secure/SameSite セッションを発行する。書込みでは Origin も確認する。資格は権限ごとに分け、公開データの読取をログイン必須にしない。[Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)

| 操作 | 要求 → 応答 | 必須の判定 |
| --- | --- | --- |
| POST /auth/challenges、POST /auth/sessions | address → 期限付き署名文。message、signature → セッション | nonce の原子的消費。署名と登録・精算への同意を分離 |
| POST /registrations | alias、version、commitment、proof、ownerSignature、depositRef → 202 と operationId | 認証所有者、登録署名、預託所有者と confirmed 状態、検証鍵・公開入力を照合。期限切れ・旧版を拒否 |
| GET /operations/{id}、GET /registrations/{alias} | 本人操作 → pending / confirmed / failed。公開仮名 → 現行公開登録または404 | 登録照会では ENSv2 で解決した現行の登録参照と Arkiv の実データを比較。ペアを返す項目は持たない |
| POST /search-leases、PATCH /search-leases/{id}、DELETE /search-leases/{id} | 一時公開鍵・登録所有者署名 → leaseId、expiresAt。更新・退出 | 確定預託と現行登録がある利用者のみ。例として30秒リースを10秒ごとに更新。明示退出で即時、異常切断は接続検知か期限で失効 |
| GET /search-leases/{id}/channel（WebSocket） | 認証済みリース → 一時ランデブー、順序番号付きの暗号文配送 | 会員ごとの認可と宛先の生存を確認。切断で未完了の照合を破棄し、新規候補の確定直前に双方の現行リースを再確認。中継ログに本文を残さない |
| POST /invites、POST /invites/{id}/decisions | 当事者が登録版・預託・最短期限に署名した内容を封入した暗号文 → 受付IDと配送状況 | 当事者が復号して両署名を検証し、両預託の拘束が確定した招待だけを成立と表示し、その成立に対して部屋資格を発行する。失敗・競合は不成立、成否不明は確認中として同じ取引を再照会する。中継は短命資格と配送状況のみを扱う |
| GET /rooms/{id}、POST /rooms/{id}/actions | 独立した部屋資格 → 現行 revision、手番、状態、場面。actionId、expectedRevision、kind、optionId → 現行または次の revision | kind は参加、選択、離脱、対面意思。双方参加で開始。対面希望は双方一致まで本人自身の回答だけ返す。離脱と精算は独立 |
| GET /deposits/{id} | 所有者 → 公開入金のasset、数量、確認状態。非公開の受取権・受取済み量は端末で復元 | 銘柄は[許可リスト](settlement.md)の chainId + token address の組（USDC・EURCのみ）、数量は最小単位の10進文字列。秘密の権利と公開receiptから端末で復元し、期日到来時の返却をモデル・API障害中にも実行できる |

状態を変える POST/PATCH は同一主体・操作ID・同一内容の再送に同じ受付結果を返す。同じキーで異なる内容、旧版、手番違いは409。未認証は401、他人の非公開リソースや不明IDは404、無効な値は422、検索頻度/同時数超過は429、外部サービス停止は503。送信後の確認待ちは202として既存操作を照会する。機密値・署名・権限URLをエラー、テレメトリー、PWAの共有キャッシュに残さない。

## 整合性と統合確認

- **検索・招待**。実証用には一つの調整用 Durable Object がリースと暗号文配送を直列化する。二重引当の最終判定は精算契約が行う。反映が不明なら端末は確認中を維持して受領記録を照合する。本人同意がない相手を候補に挿入できないことは、クライアント側でも登録版・検索セッションへの拘束を検証する。
- **共同セッション**。部屋ごとの Durable Object で参加者、revision、actionId、手番を一つの更新として保存する。二人目の応答は pending-generation と世代IDまで先に確定する。モデル呼出しは更新の外で実行し、完了時は同じ世代である場合だけ新しい場面を反映する。同じ操作の再送、並行した離脱、遅れた生成結果を受入試験に含める。モデル停止時は同じ場面で再試行できる。モデルの稼働先が未接続なら動作確認用スタブと明示する。[Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/)
- **ENSv2**。Sepolia の親名・UserRegistry を開発開始時に用意し、サブネームの所有者と登録参照の更新権限を別々に検査する。期限切れ、権限移転、二重発行を拒否し、名前の解決だけでログインを認めない。利用者が自分の記録を更新でき、別人では更新できないことを実名解決でデモする。[ENSv2サブネーム](https://docs.ens.domains/ensv2/subnames/)・[現行ドキュメント索引](https://docs.ens.domains/llms.txt)
- **Arkiv**。Rabdi（7794095）に公開登録だけを書く。レコードは許可された発行者の readonly 登録版と所有者署名を検査し、ENS の参照・版が一致する現行データだけを表示する。期限切れは公開確認不能と表示する。読み込み不能と「登録なし」を区別する。アクセスキー付きRPC URL はサーバー側に置く。実際の書込み元アドレス・再現可能な読取クエリ・画面結果を賞の応募証拠にする。[Arkiv公式](https://docs.arkiv.network/)・[Mumbai審査条件](https://ethglobal.com/events/mumbai/prizes/arkiv)
- **Kohaku / Anon RPC**。PWAでウォレット接続・ネットワーク切替を確認し、ENS解決・預託残高などアプリ自身のSepolia読取を、実際に匿名化するトランスポートに既定で渡す。起動時の参照・ウォレットの送信・Arkiv読取の通信経路をREADMEで区別する。匿名経路が停止した場合はその状態を表示して再試行させ、端末テストでは通常RPCへの暗黙の切替が生じていないことを観測する。[Anon RPC公式](https://ethereum.github.io/anon-rpc/wallets/)・[Kohaku](https://github.com/ethereum/kohaku)
