# 二者照合の平文oracleと証明実装ゲート

この文書は[二者照合契約](../specs/001-private-dating/contracts/matching.md)の合成辞書 `synthetic-1` に対する実装メモである。[平文oracle](oracle.ts)、[fixture試験](oracle.test.ts)、[合成登録回路](register/src/main.nr)、[288座標導出](profile/src/lib.nr)、[群演算の試験](curve_probe/src/lib.nr)のNargo check・22件の試験は動く。[合成Prover入力](register/Prover.example.toml)から`nargo execute --package register`でACIRとwitnessを生成し、BBで登録証明の生成・検証も確認した。暗号化通信、照合回路、登録ルートのブラウザー実装、実ユーザーのマッチングは未実装であり、段階Bの合格を意味しない。

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

`apps/frontend/src/proofs/register.ts`は合成辞書の値域を確認し、OSの暗号用乱数から独立した項目saltを作り、BB.jsのPedersenでルートを計算してNoirJS/BB.jsで証明・検証する。別の検証関数はpinしたBB.js検証鍵digest、主体、発行ID、版、ルートを8公開入力と照合する。`apps/frontend/scripts/register-integration.mjs`をNode 24で実行し、正例、再登録で別ルート、改変した主体・版・ルート・鍵・proof、辞書外値の拒否を確認した。これはNodeのBB.js実行系による試験であり、実ブラウザー・公開登録API・2端末通信への結合は未確認。ブラウザー用WASMは公式CRSの取得を必要とする。

## 固定した座標と入力

- 辞書は `h1..h8`、`g1..g3`、`i1..i2` の合成ID。G/Iは実利用者向け分類ではない。
- 座標順は外側から `(h, gA, gB, iA, iB)`。`index = ((((h * G + gA) * G + gB) * I + iA) * I + iB)`、総数 `H * G * G * I * I = 288`。
- 自己申告のgender/intentはそれぞれ辞書内の単一カテゴリ。趣味は重複のない1件以上の集合。希望maskは辞書内の重複のない1件以上の集合か、単独の `*`。`*` と個別IDの混在は拒否する。
- AのビットはAの趣味、自己申告 `gA/iA`、Bに対する希望 `gB/iB` の積。BのビットはBの趣味、自己申告 `gB/iB`、Aに対する希望 `gA/iA` の積。各ビットは0/1。両ベクトルの内積が正のときだけ候補真偽を返す。

## 登録値と証明入力の符号化

`synthetic-1`では趣味`[u8; 8]`、自己申告gender`[u8; 3]`、intent`[u8; 2]`、相手への許容gender`[u8; 3]`、intent`[u8; 2]`を辞書順のビット列とする。各要素を0/1へ制約し、趣味と両許容maskは非空、二つの自己申告はそれぞれ和1とする。`*`は許容maskの全ビット1へ正規化する。職業・年齢帯は別の本人選択開示項目としてルートへ含め、相性ベクトルへは入れない。合成fixtureの職業IDは201〜203、年齢帯IDは301〜303の`u16`。合成辞書外のgender/intent/hobby IDはクライアントで拒否し、回路では対応するビット列の長さ・和・値域と職業・年齢帯IDの範囲を検査する。

登録ルートはNoir標準のBN254 `pedersen_hash`を用いる。各項目を`H(tag, schemaVersion, dictionaryVersion, ownerSubject, credentialIssuance, profileVersion, itemValue, itemSalt)`で別々にコミットし、固定順の項目コミット列と登録ドメインタグをもう一度`H`で束ねる。配列項目の値は辞書順の全ビットを固定長で入力する。タグ・版・主体は公開の正準field符号化を使い、32-byte IDをfieldへ単純還元せず128-bit limbsに分ける。項目saltは本人端末で独立に生成し、非零かつ十分なエントロピーを要求する。`pedersen_hash`の引数長は固定し、異なる種類の項目ではタグを先頭に入れる。実装したハッシュ式と公開入力順を証明の生成・検証側で共有し、署名済み資格の現在性は別途ENS/Arkivで確認する。

現在の登録回路の公開入力は`schemaVersion`、辞書版、主体の128-bit limbs、発行世代の128-bit limbs、プロフィール版、ルート。秘密入力は上記の値と項目salt。合成登録証明のBB CLI v6.0.0検証鍵ファイルSHA-256は`8ed4807f85d25489818b523f67599fd2762fea398c85282d61202495e5693afa`、BBの`vk_hash`は`1d5e6fdd8c518b9ef545e8b460edcbe3a6e99ae68ebb2002f7ddcafea74b9f61`。ブラウザー候補のNoirJS v1.0.0とBB.js v5.3.0のWASMでは同じ合成登録回路のprove/verifyが成功し、検証鍵SHA-256は`a43ba027d8548eb19f4e45f15d83fa50d293481d751a640aee9d9d9292c239d7`。公開入力はCLI版と一致したが、BB CLI v6.0.0ではBB.js v5.3.0の証明を検証できなかった。**2版の鍵と証明は混用しない**。これらはsynthetic-1登録回路の実測値であり、公開登録のメタデータへは未結合。登録証明はルートと値域を拘束するが、自己申告の真実性は証明しない。照合証明は登録ルートを再計算して同じ登録値から288座標のビットを導く予定である。登録時・照合時で別の値を入力すれば証明が失敗する形を実装・検証するまでは結合済みと扱わない。

照合transcriptは、固定タグ`secret-tinder/matching/synthetic-1`とchain、A/Bの順序付き主体・発行世代・資格版・登録ルート・プロフィール版・検索リース世代・一時公開鍵、288暗号文の順序付きdigest、チャレンジを含む。A/Bを入れ替える、どちらかの版を古くする、暗号文の一つを並べ替える、別セッションの証明を再送する場合はdigestが変わり拒否する。Aの暗号文証明、Bの再ランダム化証明、Aの復号結果証明を同じtranscriptへ拘束する。最終公開値は候補真偽の1ビットだけで、共通趣味数や条件別ビットは返さない。

`node --test circuits/oracle.test.ts` は座標の先頭・末尾と7つの条件例、範囲外ID、曖昧なwildcard、辞書重複を確認する。SC-002残り3例の証明主体/登録版と検索リースの検査は、この数学oracleの責務外であり、実証明・セッションの試験で行う。

## 証明・暗号化に進む前の固定事項

登録ルートは属性、希望mask、趣味ビット列を**項目別乱数**と辞書版・所有主体・登録版に拘束する。照合の公開入力には登録ルート、資格の発行ID/世代/版、検索リース世代、辞書版、A/Bの役割、両者の一時公開鍵、順序付き暗号文digestを含める。各段階の証明は同じセッションのドメイン付きtranscriptに拘束し、別セッション・役割反転・旧版で再利用できないようにする。

BN254 Fr/Grumpkinと128-bit非零スカラーを採用した。BB.js v5.3.0に含まれるGrumpkin群位数は`21888242871839275222246405745257275088696311157297823662689037894645226208583`で、`2^128 > H=8`より大きい。`curve_probe`で固定基底乗算と点加算の一致、ゼロスカラー拒否をNargoで確認した。A側は秘密鍵から公開鍵と全288暗号文を回路内で再計算するが、**外部から受ける点の正準性・部分群、B側の非零マスク、復号証明は未検証**。登録証明はBBで検証し、公開入力を1 bit改変した独立verifyは失敗した。実照合回路全体の正負例が通るまでT004全体や段階Bを完成扱いにしない。平文oracleと登録回路の一致だけでは秘匿性・悪意ある参加者への安全性・性能は証明できない。

## A側の暗号化回路の実測（段階Bの一部）

`matching/src/main.nr`はAの登録ルートを再計算し、`profile`ライブラリで全288座標を導出する。Aの非零128-bit秘密鍵からGrumpkin公開鍵を検証し、各座標の非零128-bit乱数によるElGamal暗号文`(rG, bit·G + rPK)`を拘束する。暗号文全288件を固定順でPedersenの連鎖digestに束ね、公開`session_digest`、鍵、登録root、主体/発行ID/版に結び付ける。受信者は実際に届いた暗号文全件から同じdigestを計算し、証明の公開値と照合する必要がある。ここでは`session_digest`自体を署名済みのチェーン・資格・リース文脈から導出するクライアント処理はまだない。

合成fixtureはBB.jsの実Grumpkin演算と独立の平文oracleから生成した。Noir v1.0.0でwitness生成、BB CLI v6.0.0でUltraHonk prove/verify成功、暗号文の最初のx座標を1変更したwitnessは失敗し、公開digestを1 bit変更したverifyも失敗した。A側VKファイルSHA-256は`629107f9a38859e0460efe80439e93a979f1e1dd105ba0f584c3557775ddecf1`。公開入力12個、証明14,656 byte、暗号文の生座標だけで36,864 byte。ACIRは15,688 opcodes。初回proveコマンドは27.5秒、再実行は5.6秒、BBのメモリ表示は最大約1.67 GiBだった。計測機はmacOS arm64で、ブラウザーの処理時間・メモリとは異なる。`matching`が登録ルート式を複製しているため、登録回路との合成root一致試験を維持する。

これは**A側の暗号化証明だけ**である。B側の登録値からの暗号文選択・非零マスク・再ランダム化証明、A側の復号と結果1ビット証明、2端末配送、独立ブラウザー実行、実登録との結合は未実装。したがってT011/T012と段階Bの合格には数えない。BB CLI v6.0.0のA側VKとBB.js v5.3.0の登録VKは別物で、混用しない。

通信やログで公開してよいのは、資格/登録の公開識別子、暗号文、証明、最終1ビットのみ。中間の条件別真偽、共通趣味数、秘密入力は出さない。反復と限定希望からの推測可能性は[契約の制約](../specs/001-private-dating/contracts/matching.md#制約)として残る。
