# アニメーション概要の編集

`docs/overview.html`は、外部通信なしでブラウザに開ける32秒の説明ページ。日本語・英語、再生・一時停止、再開、場面選択、シークに対応する。端末の「視差効果を減らす」設定では自動再生せず、手動で場面を選べる。

| 時間 | 説明すること |
| --- | --- |
| 0–7秒 | A/Bがそれぞれ秘密を保持し、Sepoliaのテスト資金を預託 |
| 7–14秒 | APIがENSの仮名・Arkivの公開登録を扱う |
| 14–23秒 | 暗号文を中継。各端末で照合し、当事者だけが共通趣味の有無を知る |
| 23–32秒 | 双方承諾 → 両預託の拘束確定 → マッチ成立。合意精算・期限返却のルールを紹介 |

これは固定の成功例を用いた設計イメージであり、登録・証明・取引の実行や成功を実証するものではない。時間の圧縮で7日間の期限経過を再現するものでもない。拒否・照合不成立・障害時の分岐、Anon-RPC、任意のP2共同体験は[詳細設計](../architecture.md)を参照。製品要件は変更していない。

## 編集するファイル

- `story.mjs`：日英の文言、4場面の時刻、SVG描画。HTMLとGIFで共通の描画関数を使う。
- `player.js`、`player.css`、`template.html`：閲覧用ページと操作。
- `build.mjs`：依存追加なしのNodeスクリプト。アイコンとスクリプトをHTMLに埋め込む。
- `render.py`：Pillowと`rsvg-convert`を使用してGIF・静止画を書き出す。Pythonランタイムの製品コードではなく資料生成専用。

```sh
node docs/overview/build.mjs                 # HTMLのみ更新
node docs/overview/build.mjs --frames        # HTMLと一時SVGフレームを生成
python3 docs/overview/render.py             # Pillowが利用できるPythonで実行
pnpm exec biome ci docs/overview docs/overview.html
```

必要な描画ツールが未導入の場合は、既存の出力ファイルをそのまま利用できる。この変更では依存パッケージを追加していない。HTMLへの変更は生成元に加えて再生成し、生成物だけを手で編集しない。

## 配布物

- [操作できる概要](../overview.html)：HTML単体でオフライン利用可能。外部API・ウォレットを呼ばない。
- [英語GIF](../assets/private-dating-overview.gif)、[日本語GIF](../assets/private-dating-overview-ja.gif)：1024×608、8 fps相当、32秒ループ。GIFは120/130 msを交互に指定し、時間の丸め誤差を防ぐ。
- [英語の静止画](../assets/private-dating-overview.png)、[日本語の静止画](../assets/private-dating-overview-ja.png)：動きを止めて共有したい場合。

GitHubのREADMEはGIFを表示できるが、HTMLを実行しない。HTMLは手元のブラウザで開くか、利用者が公開先を決めてから配信する。GitHub Pages設定やデプロイは変更していない。

## 出典

[YOHAKUのREADME](https://github.com/kou-uni/ethglobal-tokyo2026-uni)の「短い価値提案 → アニメーション → 要約 → 詳細」という構成を参考にした。コード・映像・実績は流用していない。アイコンは前回取得した[Lucide素材](../assets/icons/README.md)を利用し、HTMLとGIFにライセンス文を含める。
