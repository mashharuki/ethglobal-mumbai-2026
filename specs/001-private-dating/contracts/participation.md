# ENS参加資格と独立検証の契約（T037実装済み・T038以降未完了）

第一段階の実証は、入金・プロフィール証明から独立した参加資格の発行と検証。資格の有効性だけを確認する画面を、検索・マッチ成立の許可と混同しない。本番の検索には現行登録、確定預託、生存リースも必要になる。

## 信頼と更新権限

MVPはチームが管理する発行者が、架空の参加者へ資格を発行する。[資格審査契約](participation-review.md)に従い、合成の根拠に基づく停止・本人通知・異議・回復を実装する。現実の不正検出、人気スコア、普遍的な一人一資格、自動没収を実証したとは扱わない。

Sepoliaの信頼する名前空間・Registry・発行者鍵・deployment版を検証者の設定に固定する。親名`secrettinder.eth`、親のETHRegistry、発行者公開アドレスは[実測fixture](../fixtures/participation.json)に記録し、共有schemaの`participationTrustAnchor`にも固定した。block 12076657では親名のownerと指定発行者が一致し、block 12076672ではそのアドレスに親のsubregistry設定権限があった。このfixtureは過去ブロックのスナップショットで、その時点では参加者用Registryは未接続だった。参加者用Registryと専用Resolverの現在の接続と実コードhashは[公開の信頼設定](../evidence/ens-trust.json)・[実ネットワーク証拠](../evidence/ens.md)を参照する。検証時にも現行ブロックで親の接続、コード、権限、発行世代を読み直す。任意のENS名を同じ発行者の資格として受け入れない。参加者ごとにResolver proxyのコードはsaltを含んで異なるため、共通信頼設定ではResolver実装のコードhashを固定し、各proxyは公式Factoryの`verifyContract`で出自と現行実装を確認する。

| 対象 | 更新者 | 検証者の扱い |
| --- | --- | --- |
| サブネームの発行・期限・再発行 | 発行者 | 名前の有効性、信頼する階層、現在の登録世代を確認 |
| `app.credential` text key | 発行者のみ | 現行のArkiv参照・内容digest・資格版を指す。本プロジェクト独自キーでありENS標準schemaではない |
| `app.endpoint` / `app.key` text key | 本人、またはそのキーだけを許可された委任鍵 | 署名対象に用途・主体・版・期限を含める。接続先を変更できても、資格・資金の操作権限は与えない |
| Arkiv上の資格レコード | 発行者 | 下記schemaと発行者署名を検証。本人のプロフィール登録とは別のレコード種別 |

各参加者に独立したPermissioned Resolverを割り当てる。標準Resolverの権限は名前別ではないため、同じキーを全員が更新できる共有Resolverを使わない。本人には資格key、Resolver差替え、包括的setter、LINK、UPGRADEとそれらを再付与できるadminを渡さない。委任はendpoint/keyだけに限定し、包括的operator承認で代替しない。

非譲渡は固定版Registryの登録時ロールで設定し、transferとunsafe transferを試験する。親・祖先のsubregistry差替えやupgrade等が発行者に残る場合は信頼前提として記録する。子側の設定だけで全階層が不変とは扱わない。秘密鍵の譲渡・複数発行・管理者侵害はこの構成で解決しない。

根拠：[Resolver](https://docs.ens.domains/ensv2/permissioned-resolver/)・[Registry](https://docs.ens.domains/ensv2/permissioned-registry/)・[EAC](https://docs.ens.domains/ensv2/enhanced-access-control/)・[現在のSepolia公開一覧](https://docs.ens.domains/learn/deployments/)・[確認対象ABI](https://github.com/ensdomains/contracts-v2/blob/07e55a056f5b6a9c90119f501bdd05714e67dddd/contracts/deployments/sepolia/ETHRegistry.json)。一覧が示すコミット`07e55a0`と9月のリリースタグはアドレスが異なるため混用しない。文書確認と実際の設定の検証を区別する。

## 公開資格schemaと正本

資格にはschemaVersion、issuer、subject、chainId、registry、DNS名、issuanceId、発行イベント参照、credentialVersion、status（eligible / suspended）、expiresAt、発行者署名を含める。署名にはschema・チェーン・名前空間・主体・発行世代・版・状態・期限の全体を拘束する。

署名形式はEIP-712。domainは`SecretTinderParticipation` / version `1` / chainId `11155111` / verifyingContract＝参加者用Registry。`Participation`メッセージは共有コードの定義順でschemaVersion、chainId、registry、issuer、subject、dnsName、issuanceId、issuanceEventTransactionHash、issuanceEventLogIndex、credentialVersion、status、expiresAt、policyVersion、accessTier、suspendedUntilを含む。statusはeligible＝0・suspended＝1、accessTierはnew＝0・standard＝1、suspendedUntilのnullは0として符号化する。署名は65バイトのhex。発行IDは`keccak256(abi.encode(uint256 chainId, address registry, bytes32 transactionHash, uint256 logIndex))`で計算し、Registryの発行イベントを確認するまで任意の値を信用しない。内容digestは`keccak256(abi.encode(bytes32 EIP712MessageHash, bytes signature))`とする。共有実装は[credential.ts](../../../packages/shared/src/participation/credential.ts)に置く。

ENSの`app.credential`は本プロジェクト独自のtext値で、`schemaVersion: 1`、`arkivEntityKey`、上記digest、`credentialVersion`を持つJSONとする。検証時には厳密なschemaで読み、参照版と署名レコード版を照合する。公開資格には私的な審査根拠を含めない。

採用した審査ルールに対応してpolicyVersion、accessTier（new / standard）、suspendedUntilも署名対象に含める。停止期限は発行者が有効な措置全体を集約した値とし、最新参照・確認済みブロック時刻で実効的な参加可否を判定する。停止期限切れは基礎資格の期限切れや読取不能と区別する。ケースID・相手・根拠の私的詳細は含めない。

資格状態の正本は、**現在有効なENS名の、発行者だけが更新できる参照に一致する署名付きレコード**とする。古い署名が正しくても、現在の参照と異なる版は受理しない。Arkivへの書込確定と読取を確認してから参照を更新する。審査による停止は有限のsuspendedUntilを持つ有効な署名資格へ更新し、参照の無効化で代替しない。参照欠落や鍵侵害等の基盤障害はunavailableとして別に扱い、有限停止や期限後の回復を実証したとは数えない。

名前の再発行は新しいissuanceIdと発行イベント参照にする。参照先は参加者用Registryが出した`LabelRegistered`イベントのtransactionHash/logIndexとし、receiptのemitter・label・owner・tokenId、同時に出る`TokenResource`、現在の`getResource`を同一確認ブロックで照合する。`TokenRegenerated`によるtoken ID変更は同じresource・発行世代のまま扱い、失効後の再登録は新たな`LabelRegistered`とresourceを要求する。文字列や可変token IDだけを恒久的な主体IDにしない。

プロフィール登録のversion/commitmentと資格のcredentialVersionは別。Arkivの期限切れ・欠落は資格の再発行や評判の初期化を意味しない。趣味、性別、交際目的、希望mask、ペア、相性結果、停止理由の私的詳細は公開資格に載せない。公開資格の継続利用による関連付けと、発行者・RPCへの依存を説明する。

T038の公開資格はArkiv SDKの`ExpirationTime.fromDays(30)`で読取専用entityとして準備する。署名資格の期限は書込時の確認時刻から最大29日とし、Arkiv側が先に失効しない余裕を設ける。Arkivの期限や読取不能をENS名の失効・審査停止として扱わず、unavailableとして区別する。

## 二つの独立した読取実装

クライアントAはWeb画面、Bは別の最小検証ツールとする。schemaと固定fixtureは共有してよいが、BはAのBFF、認可結果、検証関数を呼ばず、ENSとArkivから自分で取得・判定する。Bは別のアプリ全体を作るタスクではない。

1. 信頼する設定から名前を解決し、階層・所有者/subject・期限・登録世代・現在のResolverと権限を確認する。
2. `app.credential`の現行参照から公開レコードを取得し、digest・発行者署名・主体・版・期限・状態を照合する。
3. 結果はeligible / ineligible / unavailableと確認ブロック・参照版を返す。unavailableをeligibleや「未登録なので新規可」に変換しない。
4. 比較試験は同じ確定ブロックと公開レコード版を使い、更新をまたいだ結果差を誤って成功/失敗に数えない。運用時は新規検索・更新・候補確定前に現行状態を再検証し、古い成功結果で許可し続けない。

未信頼の接続先URLはデータとして検証し、BFFから任意URLへアクセスしない。接続先の署名・TLS等は参加資格そのものの証明とは別に扱う。

## 第一段階の合格条件（SC-005）

- A/Bが同じ有効資格を独立に受理し、AのBFF停止中にもBが検証できる。
- 本人の限定キー更新が成功し、資格キー変更、Resolver差替え、transfer、LINK/UPGRADE/admin経由の本人による迂回が拒否される。
- 委任鍵の失効後、その鍵による更新が拒否される。
- 期限内のsuspended、名前/資格の期限切れ、別発行者、古い版、再発行前の資格を両者が拒否する。停止期限ちょうどの回復、異議による新版、別の停止が残る場合をSC-007で確認する。ネットワーク障害はunavailableとして区別する。

役割表、deployment/ABI版、確認ブロック、取引、両実装の読取記録をT034に残す。ここでは入金・ZK証明を要求しない。後段T014で検索条件に結合し、T021・T024で資格停止/失効中にも既存の返却権が保持されることを検証する。
