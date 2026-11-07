# Anon-RPC 実測記録（T008 / T035）

2026-11-07 07:46 IST、ローカル Vite の一時的な測定ページを Chrome で開き、`@anon-rpc/browser-harness@0.4.0` の `AnonRpcWorker` と公式 Nox specifier（Sepolia `0x35133267A8F7EC35046a83DCA0f4Ca8A6e1b7A9A`）を起動した。`worker.ready` 後にアプリの `readSepoliaBlock()` を呼ぶと、`eth_chainId` は Sepolia と判定され、`eth_blockNumber` は **12080644** を返した。測定ページは削除済みで、再実行用の開発画面は `apps/frontend/src/pages/AnonRpcDiagnostics.tsx` にある。

## 実装で確認できる経路

- `apps/frontend/src/wallet/anon-rpc.ts` は Nox specifier の `workerHash()` / `workerResolvers()` に対する `eth_call` のみを固定の Sepolia bootstrap RPC に許す。ここは**非匿名**の識別子取得で、参加者アドレスを渡さない。
- 公式ハーネスは specifier のハッシュに合う worker bundle を取得して起動する。bundle 取得と接続初期化も Sepolia のアプリ読取とは異なる通信である。ハーネスの [公式 README](https://github.com/ethereum/anon-rpc/blob/main/impl/browser-harness/README.md) と [Nox の登録情報](https://github.com/ethereum/anon-rpc/blob/main/adopters.json5) を参照。
- `apps/frontend/src/wallet/connect.ts` は `eth_chainId` と `eth_blockNumber` を渡された worker の `fetch()` だけで読み、失敗時にウォレット・通常 `fetch`・直接 RPC に迂回しない。`anon-rpc.test.ts` / `connect.test.ts` の計9件が合格した。
- 既存の公開資格検証 `apps/frontend/src/pages/participation-verifier.ts` は現在も直接 Sepolia RPC と Arkiv Rabdi RPC を使用する。匿名読取の適用範囲に**含めない**。通常のアプリ読取全体が Anon-RPC 標準になったという主張は保留する。

## 未確認と判定

今回のブラウザー実測は、アプリが公式 worker の `fetch()` を通して Sepolia の応答を得たことを示す。外部の第三者が送信元 IP、宛先、通信量、時刻、経路上メタデータを何まで観察できたかは測定していない。Nox の匿名性や EF-RPC 賞への適格性を、この結果だけで証明しない。障害時の画面表示は開発画面で試験し、公開 UI と他の Sepolia 読取への適用範囲を決めてから最終判定する。
