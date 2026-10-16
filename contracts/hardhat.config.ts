import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
    plugins: [hardhatToolboxMochaEthersPlugin],
    solidity: {
        profiles: {
            default: {
                version: "0.8.28",
            },
            production: {
                version: "0.8.28",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000000,
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
            url: process.env.SEPOLIA_RPC_URL || "",
            accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
        },
        base: {
            type: "http",
            chainType: "op",
            url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
            accounts: process.env.BASE_PRIVATE_KEY ? [process.env.BASE_PRIVATE_KEY] : [],
            gasPrice: "auto",
        },
    },
    // Hardhat 3 reads verification settings from `verify`, not from the
    // top-level `etherscan` block that Hardhat 2 used — and it talks to the
    // Etherscan v2 API, which covers every chain with a single key, so the
    // per-network keys and `customChains` entry are no longer needed.
    verify: {
        etherscan: {
            apiKey: process.env.BASESCAN_API_KEY || "",
        },
        // Blockscout answers 403 for this project; Etherscan is the source of
        // truth for Base, so the plugin is told not to try it.
        blockscout: {
            enabled: false,
        },
    },
});