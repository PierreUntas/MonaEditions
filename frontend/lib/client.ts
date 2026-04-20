import { createPublicClient, http, fallback } from "viem";
import { base } from "viem/chains";

export const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL_BASE)
});

export const DEPLOYMENT_BLOCK = 42793770n;

export const getDeploymentBlock = () => {
    return DEPLOYMENT_BLOCK;
};