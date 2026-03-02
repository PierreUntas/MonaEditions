import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';

const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production';
const activeChain = isProduction ? base : baseSepolia;
const rpcUrl = isProduction 
    ? process.env.NEXT_PUBLIC_RPC_URL_BASE 
    : process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA;

export const config = createConfig({
    chains: [activeChain],
    transports: {
        [activeChain.id]: http(rpcUrl),
    },
});
