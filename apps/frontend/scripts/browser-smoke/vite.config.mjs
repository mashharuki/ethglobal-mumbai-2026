import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const workspace = fileURLToPath(new URL("../../../../", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  publicDir: process.env.ZK_BROWSER_CRS_DIR ?? false,
  server: { host: "127.0.0.1", fs: { allow: [workspace] } },
});
