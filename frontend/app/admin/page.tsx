'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { ARTWORK_REGISTRY_ADDRESS, ARTWORK_REGISTRY_ABI } from '@/config/contracts';
import Navbar from '@/components/shared/Navbar';
import Image from 'next/image';
import { useSendTransaction } from '@privy-io/react-auth';
import { encodeFunctionData } from 'viem';

export default function AdminPage() {
    const { address } = useAccount();
    const [newProducerAddress, setNewProducerAddress] = useState('');
    const [removeProducerAddress, setRemoveProducerAddress] = useState('');
    const [checkProducerAddress, setCheckProducerAddress] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
    const [isAuthorizingProducer, setIsAuthorizingProducer] = useState(false);
    const [isRevokingProducer, setIsRevokingProducer] = useState(false);

    const { sendTransaction } = useSendTransaction();

    const { data: isAdminResult, isLoading: isLoadingAdmin } = useReadContract({
        address: ARTWORK_REGISTRY_ADDRESS,
        abi: ARTWORK_REGISTRY_ABI,
        functionName: 'isAdmin',
        args: address ? [address] : undefined,
    });

    const { data: producerData } = useReadContract({
        address: ARTWORK_REGISTRY_ADDRESS,
        abi: ARTWORK_REGISTRY_ABI,
        functionName: 'getArtist',
        args: checkProducerAddress ? [checkProducerAddress as `0x${string}`] : undefined,
    });

    useEffect(() => {
        if (isAdminResult !== undefined) {
            setIsAdmin(isAdminResult as boolean);
            setIsCheckingAdmin(false);
        } else if (!isLoadingAdmin && isAdminResult !== undefined) {
            setIsCheckingAdmin(false);
        }
    }, [isAdminResult, isLoadingAdmin]);

    const isProducerAuthorized = producerData ? (producerData as any).authorized : undefined;

    const handleAuthorizeProducer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProducerAddress) return;

        setIsAuthorizingProducer(true);
        try {
            const data = encodeFunctionData({
                abi: ARTWORK_REGISTRY_ABI,
                functionName: 'authorizeArtist',
                args: [newProducerAddress as `0x${string}`, true],
            });

            const txHash = await sendTransaction(
                {
                    to: ARTWORK_REGISTRY_ADDRESS,
                    data: data,
                },
                {
                    sponsor: true,
                }
            );
            
            setNewProducerAddress('');
        } catch (error) {
            console.error('Error authorizing producer:', error);
        } finally {
            setIsAuthorizingProducer(false);
        }
    };

    const handleRevokeProducer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!removeProducerAddress) return;

        setIsRevokingProducer(true);
        try {
            const data = encodeFunctionData({
                abi: ARTWORK_REGISTRY_ABI,
                functionName: 'authorizeArtist',
                args: [removeProducerAddress as `0x${string}`, false],
            });

            const txHash = await sendTransaction(
                {
                    to: ARTWORK_REGISTRY_ADDRESS,
                    data: data,
                },
                {
                    sponsor: true,
                }
            );
            
            setRemoveProducerAddress('');
        } catch (error) {
            console.error('Error revoking producer:', error);
        } finally {
            setIsRevokingProducer(false);
        }
    };

    // Loading state while checking permissions
    if (isCheckingAdmin || isLoadingAdmin) {
        return (
            <div className="min-h-screen bg-[#f5f3ef]">
                <Navbar />
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-4">
                    <div className="w-8 h-8 border border-[#d6d0c8] border-t-[#1c1917] rounded-full animate-spin" />
                    <p className="text-[13px] font-light text-[#a8a29e] tracking-[0.06em]">Vérification des permissions…</p>
                </div>
            </div>
        );
    }

    if (!address) {
        return (
            <div className="min-h-screen bg-[#f5f3ef]">
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                    <p className="font-serif italic text-[22px] text-[#a8a29e]">Veuillez connecter votre wallet</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[#f5f3ef]">
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                    <p className="font-serif italic text-[22px] text-[#a8a29e]">Accès refusé : vous n'êtes pas admin</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f3ef]">
            <Navbar />
            <div className="max-w-2xl mx-auto px-6 pt-28 pb-20">
                <div className="text-center mb-12">
                    <img 
                        src="/logo-kigen.png" 
                        alt="Kigen Logo" 
                        className="w-[52px] h-[52px] object-contain mx-auto mb-6"
                    />
                    <h1 className="font-serif text-[clamp(32px,5vw,48px)] font-normal tracking-[-1px] text-[#1c1917] leading-tight">
                        Gestion des <em className="italic text-[#78716c]">Artistes</em>
                    </h1>
                </div>

                {/* Authorize a producer */}
                <div className="border border-[#d6d0c8] bg-[#fafaf8] p-8 mb-px">
                    <h2 className="font-serif text-[22px] font-normal text-[#1c1917] mb-5">
                        Autoriser un <em className="italic text-[#78716c]">Artiste</em>
                    </h2>
                    <form onSubmit={handleAuthorizeProducer} className="space-y-4">
                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Adresse de l'artiste
                            </label>
                            <input
                                type="text"
                                value={newProducerAddress}
                                onChange={(e) => setNewProducerAddress(e.target.value)}
                                placeholder="0x..."
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] font-mono text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                                pattern="^0x[a-fA-F0-9]{40}$"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isAuthorizingProducer}
                            className="w-full bg-[#1c1917] text-[#fafaf8] font-medium text-[12px] tracking-[0.06em] py-3.5 px-8 border border-[#1c1917] disabled:opacity-50 hover:bg-[#292524] transition-all duration-200"
                        >
                            {isAuthorizingProducer ? 'Autorisation en cours…' : 'Autoriser Artiste'}
                        </button>
                    </form>
                </div>

                {/* Revoke a producer */}
                <div className="border border-[#d6d0c8] bg-[#fafaf8] p-8 mb-px">
                    <h2 className="font-serif text-[22px] font-normal text-[#1c1917] mb-5">
                        Révoquer un <em className="italic text-[#78716c]">Artiste</em>
                    </h2>
                    <form onSubmit={handleRevokeProducer} className="space-y-4">
                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Adresse de l'artiste
                            </label>
                            <input
                                type="text"
                                value={removeProducerAddress}
                                onChange={(e) => setRemoveProducerAddress(e.target.value)}
                                placeholder="0x..."
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] font-mono text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                                pattern="^0x[a-fA-F0-9]{40}$"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isRevokingProducer}
                            className="w-full bg-[#1c1917] text-[#fafaf8] font-medium text-[12px] tracking-[0.06em] py-3.5 px-8 border border-[#1c1917] disabled:opacity-50 hover:bg-[#292524] transition-all duration-200"
                        >
                            {isRevokingProducer ? 'Révocation en cours…' : 'Révoquer Artiste'}
                        </button>
                    </form>
                </div>

                {/* Check producer status */}
                <div className="border border-[#d6d0c8] bg-[#fafaf8] p-8 mb-px">
                    <h2 className="font-serif text-[22px] font-normal text-[#1c1917] mb-5">
                        Vérifier le <em className="italic text-[#78716c]">Statut Artiste</em>
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Adresse à vérifier
                            </label>
                            <input
                                type="text"
                                value={checkProducerAddress}
                                onChange={(e) => setCheckProducerAddress(e.target.value)}
                                placeholder="0x..."
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] font-mono text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                                pattern="^0x[a-fA-F0-9]{40}$"
                            />
                        </div>
                        {checkProducerAddress && isProducerAuthorized !== undefined && (
                            <div className="p-4 border border-[#d6d0c8] bg-[#f5f3ef] text-[14px] font-light text-[#1c1917]">
                                {isProducerAuthorized ? '✓ Cette adresse est autorisée comme artiste' : '✗ Cette adresse n\'est pas autorisée comme artiste'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer mark */}
                <div className="flex justify-center mt-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-px h-12 bg-[#d6d0c8]" />
                        <span className="font-serif italic text-[13px] text-[#a8a29e]">Kigen</span>
                    </div>
                </div>
            </div>
        </div>
    );
}