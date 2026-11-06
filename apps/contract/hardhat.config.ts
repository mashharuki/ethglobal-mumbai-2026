import { existsSync } from "node:fs";
import path from "node:path";
import hardhatSlang from "@nomicfoundation/hardhat-slang";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

// Load secrets (RPC URLs, private keys) from apps/contract/.env into process.env.
// configVariable() falls back to process.env, and is only resolved when a network
// that uses it is actually selected, so local tasks work without a .env file.
const envFilePath = path.join(import.meta.dirname, ".env");
if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatSlang],
  solidity: {
    profiles: {
      default: {
        version: "0.8.37",
      },
      production: {
        version: "0.8.37",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      slang: {
        type: "slang",
        version: "0.8.37",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
