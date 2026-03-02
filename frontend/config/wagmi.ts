import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';

const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production';

export const config = createConfig({
    chains: [base, baseSepolia],
    transports: {
        [base.id]: http(process.env.NEXT_PUBLIC_RPC_URL_BASE),
        [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA),
    },
    ...(isProduction ? { defaultChain: base } : { defaultChain: baseSepolia }),
});
