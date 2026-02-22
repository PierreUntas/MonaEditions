"use client"

import Image from "next/image";
import Navbar from "../components/shared/Navbar";
import { usePrivy } from '@privy-io/react-auth';

export default function Home() {
    const { login, authenticated, user } = usePrivy();

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#07080B', color: '#F2F4F8' }}>
            <Navbar />
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="flex flex-col items-center">
                    <div
                        className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl mb-4"
                        style={{
                            background: 'linear-gradient(145deg, #1C1608, #28200A)',
                            border: '1px solid rgba(201,165,90,0.25)',
                            boxShadow: '0 0 32px rgba(201,165,90,0.12)',
                            fontFamily: 'Georgia, serif',
                            color: '#C9A55A',
                        }}
                    >
                        起
                    </div>
                    <div 
                        className="text-6xl font-bold mt-4"
                        style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                            color: '#F2F4F8'
                        }}
                    >
                        Kigen
                    </div>
                </div>

                <div className="flex flex-col items-center mt-16 text-center px-6">
                    <h1 
                        className="text-4xl font-bold mb-3"
                        style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                            color: '#F2F4F8'
                        }}
                    >
                        Bienvenue sur <em style={{ fontStyle: 'italic', color: '#C9A55A' }}>Kigen</em>
                    </h1>
                    <h2 style={{ fontSize: '17px', color: '#8C95AA', fontWeight: 300, lineHeight: 1.75 }}>
                        Traçabilité complète de vos produits, de l'origine à la consommation.
                    </h2>
                </div>

                <div className="mt-20">
                    {authenticated ? (
                        <div className="text-center">
                            <div className="mb-6 space-y-2">
                                <p style={{ fontSize: '15px', color: '#8C95AA' }}>Connecté en tant que</p>
                                {user?.email?.address && (
                                    <p style={{ fontSize: '15px', color: '#F2F4F8' }}>{user.email.address}</p>
                                )}
                                {(() => {
                                    const wallet = user?.wallet || user?.linkedAccounts?.find((account: any) => account.type === 'wallet');
                                    const walletAddress = (wallet as any)?.address;
                                    return walletAddress ? (
                                        <p className="font-mono" style={{ fontSize: '13px', color: '#8C95AA' }}>
                                            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                                        </p>
                                    ) : null;
                                })()}
                            </div>
                            <a
                                href="/explore/batches"
                                className="px-8 py-3 rounded-xl font-semibold transition-all duration-200 inline-block cursor-pointer"
                                style={{
                                    background: 'linear-gradient(145deg, #C9A55A, #B89449)',
                                    color: '#07080B',
                                    border: '1px solid rgba(201,165,90,0.3)',
                                    boxShadow: '0 4px 16px rgba(201,165,90,0.2)',
                                }}
                            >
                                Explorer
                            </a>
                        </div>
                    ) : (
                        <button
                            onClick={login}
                            className="px-8 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer"
                            style={{
                                background: 'linear-gradient(145deg, #C9A55A, #B89449)',
                                color: '#07080B',
                                border: '1px solid rgba(201,165,90,0.3)',
                                boxShadow: '0 4px 16px rgba(201,165,90,0.2)',
                            }}
                        >
                            Se connecter
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}