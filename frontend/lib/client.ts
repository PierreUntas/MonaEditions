import { createPublicClient, http } from "viem";
import { activeChain, activeRpcUrl, isProduction } from "@/config/constants";

export const publicClient = createPublicClient({
    chain: activeChain,
    transport: http(activeRpcUrl),
});

const DEPLOYMENT_BLOCK_SEPOLIA = 10795135n;
const DEPLOYMENT_BLOCK_BASE = 0n;

export const DEPLOYMENT_BLOCK = isProduction ? DEPLOYMENT_BLOCK_BASE : DEPLOYMENT_BLOCK_SEPOLIA;

export const getDeploymentBlock = () => DEPLOYMENT_BLOCK;