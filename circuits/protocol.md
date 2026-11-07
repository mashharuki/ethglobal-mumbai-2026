# 二者照合の平文oracleと証明実装ゲート

この文書は[二者照合契約](../specs/001-private-dating/contracts/matching.md)の合成辞書 `synthetic-1` に対する実装メモである。[平文oracle](oracle.ts)、[fixture試験](oracle.test.ts)、[合成登録回路](register/src/main.nr)のNargo checkと4件の実行試験は動く。暗号化通信、照合回路、証明鍵、登録ルートのブラウザー実装、実ユーザーのマッチングは未実装であり、T004・段階Bの合格を意味しない。

## 固定するツールチェーンと群

- Noir compilerは正式release `v1.0.0`。[Noir公式release](https://github.com/noir-lang/noir/releases/tag/v1.0.0)は2026-10-29公開。macOS arm64の公式配布物をrelease digestとSHA-256で照合し、`nargo --version`が`1.0.0`と実測した。[公式手順](https://www.noir-lang.org/docs/getting_started_manually)はBarretenbergの`bb`で証明・検証するが、2026-11-07時点の[bbup公式互換表](https://github.com/AztecProtocol/aztec-packages/blob/next/barretenberg/bbup/bb-versions.json)にはNoir `1.0.0`の行がない。`bb --version`と実証明/検証が通るまではVK版を確定しない。
- 回路fieldはBN254 Fr、暗号群はそのfield上のGrumpkinを候補とする。[Noir標準のembedded curve API](https://www.noir-lang.org/docs/libraries/standard_library/cryptographic_primitives/embedded_curve_ops)がこの組を提供する。群スカラーはNoir `Field`と同一視しない。暗号乱数・秘密鍵・Bの非零マスクはOSの暗号用乱数から生成する128-bit非零整数とし、`EmbeddedCurveScalar::new(lo, 0)`へ正準に写す。`q > 2^128 > H=8`を実装時に確認する。`Field`上の非零だけでは群スカラーの条件にならない。
- 公開点は正準の`(x,y)`、無限遠点は公開鍵・暗号文の入力として拒否する。Aが実際に生成した全288暗号文と一時公開鍵に対する証明を検証してからBが演算する。曲線・部分群・スカラー範囲はNoir/Barretenberg実行系の実試験でも確認する。暗号用乱数は同一セッション・座標で再使用しない。

## 固定した座標と入力

- 辞書は `h1..h8`、`g1..g3`、`i1..i2` の合成ID。G/Iは実利用者向け分類ではない。
- 座標順は外側から `(h, gA, gB, iA, iB)`。`index = ((((h * G + gA) * G + gB) * I + iA) * I + iB)`、総数 `H * G * G * I * I = 288`。
- 自己申告のgender/intentはそれぞれ辞書内の単一カテゴリ。趣味は重複のない1件以上の集合。希望maskは辞書内の重複のない1件以上の集合か、単独の `*`。`*` と個別IDの混在は拒否する。
- AのビットはAの趣味、自己申告 `gA/iA`、Bに対する希望 `gB/iB` の積。BのビットはBの趣味、自己申告 `gB/iB`、Aに対する希望 `gA/iA` の積。各ビットは0/1。両ベクトルの内積が正のときだけ候補真偽を返す。

## 登録値と証明入力の符号化

`synthetic-1`では趣味`[u8; 8]`、自己申告gender`[u8; 3]`、intent`[u8; 2]`、相手への許容gender`[u8; 3]`、intent`[u8; 2]`を辞書順のビット列とする。各要素を0/1へ制約し、趣味と両許容maskは非空、二つの自己申告はそれぞれ和1とする。`*`は許容maskの全ビット1へ正規化する。職業・年齢帯は別の本人選択開示項目としてルートへ含め、相性ベクトルへは入れない。合成辞書外のgender/intent/hobby IDはクライアントで拒否し、回路では対応するビット列の長さ・和・値域を検査する。

登録ルートはNoir標準のBN254 `pedersen_hash`を用いる。各項目を`H(tag, schemaVersion, dictionaryVersion, ownerSubject, credentialIssuance, profileVersion, itemValue, itemSalt)`で別々にコミットし、固定順の項目コミット列と登録ドメインタグをもう一度`H`で束ねる。配列項目の値は辞書順の全ビットを固定長で入力する。タグ・版・主体は公開の正準field符号化を使い、32-byte IDをfieldへ単純還元せず128-bit limbsに分ける。項目saltは本人端末で独立に生成し、非零かつ十分なエントロピーを要求する。`pedersen_hash`の引数長は固定し、異なる種類の項目ではタグを先頭に入れる。実装したハッシュ式と公開入力順を証明の生成・検証側で共有し、署名済み資格の現在性は別途ENS/Arkivで確認する。

登録証明の公開入力は`schemaVersion`、辞書版、主体、発行世代、プロフィール版、ルート、検証鍵版。秘密入力は上記の値と項目salt。登録証明はルートと値域を拘束するが、自己申告の真実性は証明しない。照合証明は登録ルートを再計算して同じ登録値から288座標のビットを導く。登録時・照合時で別の値を入力すれば証明が失敗する。

照合transcriptは、固定タグ`secret-tinder/matching/synthetic-1`とchain、A/Bの順序付き主体・発行世代・資格版・登録ルート・プロフィール版・検索リース世代・一時公開鍵、288暗号文の順序付きdigest、チャレンジを含む。A/Bを入れ替える、どちらかの版を古くする、暗号文の一つを並べ替える、別セッションの証明を再送する場合はdigestが変わり拒否する。Aの暗号文証明、Bの再ランダム化証明、Aの復号結果証明を同じtranscriptへ拘束する。最終公開値は候補真偽の1ビットだけで、共通趣味数や条件別ビットは返さない。

`node --test circuits/oracle.test.ts` は座標の先頭・末尾と7つの条件例、範囲外ID、曖昧なwildcard、辞書重複を確認する。SC-002残り3例の証明主体/登録版と検索リースの検査は、この数学oracleの責務外であり、実証明・セッションの試験で行う。

## 証明・暗号化に進む前の固定事項

登録ルートは属性、希望mask、趣味ビット列を**項目別乱数**と辞書版・所有主体・登録版に拘束する。照合の公開入力には登録ルート、資格の発行ID/世代/版、検索リース世代、辞書版、A/Bの役割、両者の一時公開鍵、順序付き暗号文digestを含める。各段階の証明は同じセッションのドメイン付きtranscriptに拘束し、別セッション・役割反転・旧版で再利用できないようにする。

BN254 Fr/Grumpkinと128-bit非零スカラーは上記の実装候補に絞ったが、**回路での点・スカラー正準性、部分群、復号、実証明は未検証**。`q > H`と非零スカラーの範囲検査が必要で、field上の非零だけで代用できない。実照合回路の正負例が通り、`bb`版と生成VKのdigestを記録するまでT004や鍵の版を完成扱いにしない。平文oracleと登録回路の一致だけでは秘匿性・悪意ある参加者への安全性・性能は証明できない。

通信やログで公開してよいのは、資格/登録の公開識別子、暗号文、証明、最終1ビットのみ。中間の条件別真偽、共通趣味数、秘密入力は出さない。反復と限定希望からの推測可能性は[契約の制約](../specs/001-private-dating/contracts/matching.md#制約)として残る。
