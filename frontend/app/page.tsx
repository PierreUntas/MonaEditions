"use client"

import Image from "next/image";
import Navbar from "../components/shared/Navbar";
import { usePrivy } from '@privy-io/react-auth';

export default function Home() {
    const { login, authenticated, user } = usePrivy();

    return (
        <div className="min-h-screen bg-[#E8DFD3] flex flex-col">
            <Navbar />
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="flex flex-col items-center">
                    <Image
                        src="/originlink-logo.png"
                        alt="Logo"
                        width={120}
                        height={120}
                        className="opacity-70"
                    />
                    <div className="text-6xl font-[Carbon_Phyber] mt-2 text-[#000000]">OriginLink</div>
                </div>

                <div className="flex flex-col items-center mt-16">
                    <h1 className="text-3xl">Bienvenue sur OriginLink</h1>
                    <h2 className="text-lg mt-2 font-[Olney_Light]">Traçabilité complète de vos produits, de l'origine à la consommation.</h2>
                </div>

                <div className="mt-20 font-[Olney_Light]">
                    {authenticated ? (
                        <div className="text-center">
                            <div className="mb-4 space-y-1">
                                <p className="text-lg font-medium">Connecté en tant que</p>
                                {user?.email?.address && (
                                    <p className="text-base text-gray-700">{user.email.address}</p>
                                )}
                                {(() => {
                                    const wallet = user?.wallet || user?.linkedAccounts?.find((account: any) => account.type === 'wallet');
                                    const walletAddress = (wallet as any)?.address;
                                    return walletAddress ? (
                                        <p className="text-sm text-gray-500 font-mono">
                                            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                                        </p>
                                    ) : null;
                                })()}
                            </div>
                            <a
                                href="/explore/batches"
                                className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-black font-medium rounded-lg transition-all duration-300 inline-block cursor-pointer"
                            >
                                Explorer
                            </a>
                        </div>
                    ) : (
                        <button
                            onClick={login}
                            className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-black font-medium rounded-lg transition-all duration-300 cursor-pointer"
                        >
                            Se connecter
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}