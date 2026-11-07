# 対象ユーザーと到達範囲

想定ユーザーは、出会いの条件を公開せずに参加資格だけを確認したい参加者と、発行者の自社APIに依存せずにその資格を確認したい別クライアントの開発者。現在の実ユーザー数は**未計測**で、継続利用やユーザー需要の実証はしていない。メンター・スポンサーから得たフィードバックは[仕様](../specs/001-private-dating/spec.md)に反映したが、利用意向の定量調査ではない。

今日試せる範囲は[公開ライブ画面](https://ethglobal-mumbai-2026.vercel.app/)のAlice/Bob資格検証、[独立CLI](../scripts/verify-participation.ts)、[公開索引query](../apps/backend/scripts/query-publications.ts)。架空の2名についてAliceの3版、Bobの1版を読む。新規の未認証ブラウザーで現行Aliceが`Eligible`・版`3`、Bobが`Eligible`・版`1`を返した。版履歴をブラウザーで直接検索・検証・表示する機能は[PR #8](https://github.com/mashharuki/ethglobal-mumbai-2026/pull/8)で実装し、ローカル画面でAlice版1→2→3とBob版1を実測した。公開本番での履歴表示はPRのマージ後に再確認する。チーム外の第三者環境からの再現は未確認であり、賞の提出準備として残る。

参加者ではない開発者も、[READMEの発行IDクエリ](../README.md#verify-it-yourself)から同じ公開entityを発見できる。2026-11-07のチーム内再読取ではAliceが3件、Bobが1件返った。これは利用者数や依存プロジェクト数の実績ではない。

Mumbai後も、他のクライアントがENS名から公開資格を検証できる方式を継続検討する。ただしチームの保守・運用と実利用者獲得は未確定。将来の利用や採用数を既成事実としては扱わない。
