import { createPublicClient, http, fallback } from "viem";
import { base } from "viem/chains";

export const publicClient = createPublicClient({
    chain: base,
    transport: fallback([
        http(process.env.NEXT_PUBLIC_RPC_URL_BASE),
        http('https://mainnet.base.org'),
    ])
});

export const DEPLOYMENT_BLOCK = 42793770n;

export const getDeploymentBlock = () => {
    return DEPLOYMENT_BLOCK;
};