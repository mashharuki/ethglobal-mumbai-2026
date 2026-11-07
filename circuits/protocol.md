# 二者照合の平文oracleと証明実装ゲート

この文書は[二者照合契約](../specs/001-private-dating/contracts/matching.md)の合成辞書 `synthetic-1` に対する実装メモである。[平文oracle](oracle.ts)、[fixture試験](oracle.test.ts)、[合成登録回路](register/src/main.nr)、[288座標導出](profile/src/lib.nr)、[群演算の試験](curve_probe/src/lib.nr)に加え、A側暗号化・B側選択・A側結果の3証明を合成入力で実行した。Nargo workspaceのcheckと27件の試験、BB CLIによる3証明の生成・検証を確認した。独立した2端末の通信と実資格・登録・リースへの結合は未実装であり、段階Bの合格を意味しない。

## 固定するツールチェーンと群

- Noir compilerは正式release `v1.0.0`。[Noir公式release](https://github.com/noir-lang/noir/releases/tag/v1.0.0)は2026-10-29公開。macOS arm64の公式配布物をrelease digestとSHA-256で照合し、`nargo --version`が`1.0.0`と実測した。[bbup公式互換表](https://github.com/AztecProtocol/aztec-packages/blob/next/barretenberg/bbup/bb-versions.json)にはNoir `1.0.0`の行がないため、公式[Barretenberg v6.0.0 release](https://github.com/AztecProtocol/aztec-packages/releases/tag/v6.0.0)を個別に取得し、配布SHA-256 `48bd18a7d53781a2820e7538dfd89584ca5b4d76c7908e8be4910ce994e7c35e`を照合した。`bb --version`は`6.0.0`、最小回路と登録回路のUltraHonk prove/verifyが成功した。互換はこの2回路での実測範囲に限る。
- 回路fieldはBN254 Fr、暗号群はそのfield上のGrumpkinを候補とする。[Noir標準のembedded curve API](https://www.noir-lang.org/docs/libraries/standard_library/cryptographic_primitives/embedded_curve_ops)がこの組を提供する。群スカラーはNoir `Field`と同一視しない。暗号乱数・秘密鍵・Bの非零マスクはOSの暗号用乱数から生成する128-bit非零整数とし、`EmbeddedCurveScalar { lo: value as Field, hi: 0 }`へ正準に写す。`q > 2^128 > H=8`を実装時に確認する。`Field`上の非零だけでは群スカラーの条件にならない。
- 公開点は正準の`(x,y)`、無限遠点は公開鍵・暗号文の入力として拒否する。Aが実際に生成した全288暗号文と一時公開鍵に対する証明を検証してからBが演算する。曲線・部分群・スカラー範囲はNoir/Barretenberg実行系の実試験でも確認する。暗号用乱数は同一セッション・座標で再使用しない。

合成登録証明の再現は`circuits/`で次を実行する。`Prover.toml`、`target/`、証明・鍵は追跡しない。例の小さいsaltは試験専用で、実ユーザーに流用しない。

```sh
cp register/Prover.example.toml register/Prover.toml
nargo test --workspace --deny-warnings
nargo execute --package register
bb prove -b target/register.json -w target/register.gz --write_vk -o target/register-proof
bb verify -p target/register-proof/proof -k target/register-proof/vk -i target/register-proof/public_inputs
```

`apps/frontend/src/proofs/register.ts`は合成辞書の値域を確認し、OSの暗号用乱数から独立した項目saltを作り、BB.jsのPedersenでルートを計算してNoirJS/BB.jsで証明・検証する。戻り値は公開`publicProof`と、プロフィール・項目salt・主体/発行ID・版・ルートを含む端末専用`privateMaterial`に分ける。後者はクラスのprivate fieldに保持し、戻り値全体のJSON直列化には含めない。暗号化バックアップからの復元関数は値域とルートを再計算し、改変を拒否する。暗号化保存への結合自体は未実装であり、呼出側は`privateMaterial`だけを端末内の暗号化保存へ渡す必要がある。別の検証関数はpinしたBB.js検証鍵digest、主体、発行ID、版、ルートを8公開入力と照合する。`apps/frontend/scripts/register-integration.mjs`をNode 24で実行し、正例、再登録で別ルート、改変した主体・版・ルート・鍵・proof、辞書外値の拒否と秘密materialのJSON復元/改変拒否を確認した。これはNodeのBB.js実行系による試験であり、実ブラウザー・公開登録API・2端末通信への結合は未確認。ブラウザー用WASMは公式CRSの取得を必要とする。

## 固定した座標と入力

- 辞書は `h1..h8`、`g1..g3`、`i1..i2` の合成ID。G/Iは実利用者向け分類ではない。
- 座標順は外側から `(h, gA, gB, iA, iB)`。`index = ((((h * G + gA) * G + gB) * I + iA) * I + iB)`、総数 `H * G * G * I * I = 288`。
- 自己申告のgender/intentはそれぞれ辞書内の単一カテゴリ。趣味は重複のない1件以上の集合。希望maskは辞書内の重複のない1件以上の集合か、単独の `*`。`*` と個別IDの混在は拒否する。
- AのビットはAの趣味、自己申告 `gA/iA`、Bに対する希望 `gB/iB` の積。BのビットはBの趣味、自己申告 `gB/iB`、Aに対する希望 `gA/iA` の積。各ビットは0/1。両ベクトルの内積が正のときだけ候補真偽を返す。

## 登録値と証明入力の符号化

`synthetic-1`では趣味`[u8; 8]`、自己申告gender`[u8; 3]`、intent`[u8; 2]`、相手への許容gender`[u8; 3]`、intent`[u8; 2]`を辞書順のビット列とする。各要素を0/1へ制約し、趣味と両許容maskは非空、二つの自己申告はそれぞれ和1とする。`*`は許容maskの全ビット1へ正規化する。職業・年齢帯は別の本人選択開示項目としてルートへ含め、相性ベクトルへは入れない。合成fixtureの職業IDは201〜203、年齢帯IDは301〜303の`u16`。合成辞書外のgender/intent/hobby IDはクライアントで拒否し、回路では対応するビット列の長さ・和・値域と職業・年齢帯IDの範囲を検査する。

登録ルートはNoir標準のBN254 `pedersen_hash`を用いる。各項目を`H(tag, schemaVersion, dictionaryVersion, ownerSubject, credentialIssuance, profileVersion, itemValue, itemSalt)`で別々にコミットし、固定順の項目コミット列と登録ドメインタグをもう一度`H`で束ねる。配列項目の値は辞書順の全ビットを固定長で入力する。タグ・版・主体は公開の正準field符号化を使い、32-byte IDをfieldへ単純還元せず128-bit limbsに分ける。項目saltは本人端末で独立に生成し、非零かつ十分なエントロピーを要求する。`pedersen_hash`の引数長は固定し、異なる種類の項目ではタグを先頭に入れる。実装したハッシュ式と公開入力順を証明の生成・検証側で共有し、署名済み資格の現在性は別途ENS/Arkivで確認する。

現在の登録回路の公開入力は`schemaVersion`、辞書版、主体の128-bit limbs、発行世代の128-bit limbs、プロフィール版、ルート。秘密入力は上記の値と項目salt。合成登録証明のBB CLI v6.0.0検証鍵ファイルSHA-256は`8ed4807f85d25489818b523f67599fd2762fea398c85282d61202495e5693afa`、BBの`vk_hash`は`1d5e6fdd8c518b9ef545e8b460edcbe3a6e99ae68ebb2002f7ddcafea74b9f61`。ブラウザー候補のNoirJS v1.0.0とBB.js v5.3.0のWASMでは同じ合成登録回路のprove/verifyが成功し、検証鍵SHA-256は`a43ba027d8548eb19f4e45f15d83fa50d293481d751a640aee9d9d9292c239d7`。公開入力はCLI版と一致したが、BB CLI v6.0.0ではBB.js v5.3.0の証明を検証できなかった。**2版の鍵と証明は混用しない**。これらはsynthetic-1登録回路の実測値であり、公開登録のメタデータへは未結合。登録証明はルートと値域を拘束するが、自己申告の真実性は証明しない。照合証明は登録ルートを再計算して同じ登録値から288座標のビットを導く予定である。登録時・照合時で別の値を入力すれば証明が失敗する形を実装・検証するまでは結合済みと扱わない。

製品での照合transcriptは、固定タグ`secret-tinder/matching/synthetic-1`とchain、A/Bの順序付き主体・発行世代・資格版・登録ルート・プロフィール版・検索リース世代・一時公開鍵、288暗号文の順序付きdigest、チャレンジを含む必要がある。現状の回路は外部入力の`session_digest`が非零であることだけを確認し、その内部構成を検証しない。よって別セッション、役割反転、旧版の拒否は、信頼する文脈からdigestを生成し、検証者が期待する公開値と比較する実装まで未達である。証明が返す相性情報は候補真偽の1ビットだけで、共通趣味数や条件別ビットは返さない。

`node --test circuits/oracle.test.ts` は座標の先頭・末尾と7つの条件例、範囲外ID、曖昧なwildcard、辞書重複を確認する。SC-002残り3例の証明主体/登録版と検索リースの検査は、この数学oracleの責務外であり、実証明・セッションの試験で行う。

## 証明・暗号化に進む前の固定事項

登録ルートは属性、希望mask、趣味ビット列を**項目別乱数**と辞書版・所有主体・登録版に拘束する。照合の公開入力には登録ルート、資格の発行ID/世代/版、検索リース世代、辞書版、A/Bの役割、両者の一時公開鍵、順序付き暗号文digestを含める。各段階の証明は同じセッションのドメイン付きtranscriptに拘束し、別セッション・役割反転・旧版で再利用できないようにする。

BN254 Fr/Grumpkinと128-bit非零スカラーを採用した。BB.js v5.3.0に含まれるGrumpkin群位数は`21888242871839275222246405745257275088696311157297823662689037894645226208583`で、`2^128 > H=8`より大きい。`curve_probe`で固定基底乗算と点加算の一致、ゼロスカラー拒否をNargoで確認した。A側は秘密鍵から公開鍵と全288暗号文を回路内で再計算し、B側は非零マスク・再乱数化を、結果回路は秘密鍵と最終1ビットを拘束する。登録証明はBBで検証し、公開入力を1 bit改変した独立verifyは失敗した。**外部から受ける点の正準性・部分群検査、実資格・登録・リースの現在性、端末間通信の安全性は未検証**である。合成入力の正負例だけでは秘匿性・悪意ある参加者への安全性・製品性能は証明できない。

## A側の暗号化回路の実測（段階Bの一部）

`matching/src/main.nr`はAの登録ルートを再計算し、`profile`ライブラリで全288座標を導出する。Aの非零128-bit秘密鍵からGrumpkin公開鍵を検証し、各座標の非零128-bit乱数によるElGamal暗号文`(rG, bit·G + rPK)`を拘束する。暗号文全288件を固定順でPedersenの連鎖digestに束ね、公開`session_digest`、鍵、登録root、主体/発行ID/版に結び付ける。受信者は実際に届いた暗号文全件から同じdigestを計算し、証明の公開値と照合する必要がある。ここでは`session_digest`自体を署名済みのチェーン・資格・リース文脈から導出するクライアント処理はまだない。

合成fixtureはBB.jsの実Grumpkin演算と独立の平文oracleから生成した。Noir v1.0.0でwitness生成、BB CLI v6.0.0でUltraHonk prove/verify成功、暗号文の最初のx座標を1変更したwitnessは失敗し、公開digestを1 bit変更したverifyも失敗した。A側VKファイルSHA-256は`629107f9a38859e0460efe80439e93a979f1e1dd105ba0f584c3557775ddecf1`。公開入力12個、証明14,656 byte、暗号文の生座標だけで36,864 byte。ACIRは15,688 opcodes。初回proveコマンドは27.5秒、再実行は5.6秒、BBのメモリ表示は最大約1.67 GiBだった。計測機はmacOS arm64で、ブラウザーの処理時間・メモリとは異なる。`matching`が登録ルート式を複製しているため、登録回路との合成root一致試験を維持する。

同じA側合成入力をNode 24のNoirJS v1.0.0 + BB.js v5.3.0でも`apps/frontend/scripts/matching-bbjs-smoke.mjs matching`でprove/verifyした。実測約59秒、証明14,656 byte、公開入力12個、VK SHA-256は`12ea1b68e06613acdcb46abb3d3a6a8caf99f8ea25e44c86629cc32d3a57ea2f`で、CLI v6の鍵と異なる。公開CRSのローカルキャッシュは8 MiBの圧縮G1を要した。この試験はNode/WASMであり、実ブラウザー内のメモリ、読み込み時間、2端末通信を示さない。

## B側と結果の回路（合成fixture）

`matching_b/src/main.nr`はBの登録ルートから全288座標を導出し、Aの全暗号文の順序付きdigestを再計算する。Bの1の座標だけを群の多重スカラー乗算で選び、非零128-bit maskで内積暗号文を乗算し、別の非零乱数でゼロを再暗号化する。Bの出力は暗号文2点であり、希望条件別の真偽や趣味数ではない。`matching_result/src/main.nr`はAの秘密鍵と一時公開鍵の対応を再検証し、Bの暗号文の2点が復号後に一致するかを**1ビットだけ**公開する。両回路の公開値はセッション、A暗号文digest、鍵、B出力点で接続する。無限遠点の内部表現に依存しないよう、復号点を生成して比較する代わりに`out2 == sk·out1`を証明する。

BB CLI v6.0.0でSC-002の数学的な7条件（全条件一致、共通趣味なし、A/Bそれぞれの性別希望・目的希望の不一致、双方指定なし）の合成fixtureを実prove/verifyした。A側だけが変わる例はAの証明も再生成し、B側だけが変わる例は同じA証明を再利用した。B側VK SHA-256は`669ee65e6f780d055d8e9469bf3c31d2ec5f9c6524e8dec257e29b4d1fc40da7`、16公開入力、証明14,656 byte、ACIR 13,407 opcodes、prove約5.7秒、最大約1.28 GiB。結果回路も真/偽それぞれprove/verifyし、VK SHA-256は`b7cbf302fac9e7ebd45a92bed7b285c6759bda9aad571ae49c195cf7a16999d0`、10公開入力、証明14,656 byte、prove約0.12秒、最大約53 MiB。`apps/frontend/scripts/verify-matching.mjs`は秘密witnessを読まずに3証明のVKをpinして独立検証し、公開transcriptとB出力を突き合わせる。成立/不成立を再現し、成立と不成立の別々のB/結果証明を混ぜると拒否した。

これらは**固定された合成入力のローカル実験**である。fixtureのA秘密鍵・暗号乱数は小さい公開テスト値で、A暗号文を複数の条件試験で再利用している。製品での乱数生成・再利用防止を示していない。`session_digest`は合成定数で、署名済み資格・登録・リースの文脈から導出していない。`verify-matching.mjs`は現在のENS/Arkiv資格や登録root、リースを読み取らず、2つの実端末間配送もしない。実ブラウザーでの証明実行、SC-002の残り3例（版差替え・別人・検索終了）、公開点検査・プロトコル安全性レビューも未達である。従ってT011/T012と段階Bの合格には数えない。BB CLI v6.0.0の3回路VKとBB.js v5.3.0の登録VKは別物で、混用しない。

通信やログで公開してよいのは、資格/登録の公開識別子、暗号文、証明、最終1ビットのみ。中間の条件別真偽、共通趣味数、秘密入力は出さない。反復と限定希望からの推測可能性は[契約の制約](../specs/001-private-dating/contracts/matching.md#制約)として残る。
