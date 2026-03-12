import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL_BASE;

export const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_URL)
});

// Deployment block number on Base mainnet
export const DEPLOYMENT_BLOCK = 42793770n;

export const getDeploymentBlock = () => {
    return DEPLOYMENT_BLOCK;
};
