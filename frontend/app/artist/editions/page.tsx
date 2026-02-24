'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { ARTWORK_REGISTRY_ADDRESS, ARTWORK_REGISTRY_ABI, ARTWORK_TOKENIZATION_ADDRESS, ARTWORK_TOKENIZATION_ABI } from '@/config/contracts';
import { getFromIPFSGateway } from '@/app/utils/ipfs';
import Navbar from '@/components/shared/Navbar';
import Link from 'next/link';
import { parseAbiItem } from 'viem';
import { publicClient } from '@/lib/client';

interface EditionIPFSData {
    title: string;
    year: number;
    description: string;
    technique: string;
    dimensions: string;
    images: string[];
    editionSize: number;
    category: string;
}

interface EditionInfo {
    tokenId: bigint;
    title: string;
    metadata: string;
    merkleRoot: string;
    remainingTokens: bigint;
    ipfsData?: EditionIPFSData;
}

export default function ArtistEditionsPage() {
    const { address } = useAccount();
    const [editions, setEditions] = useState<EditionInfo[]>([]);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isCheckingAuthorization, setIsCheckingAuthorization] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingIPFS, setIsLoadingIPFS] = useState(false);

    const { data: artistData, isLoading: isLoadingArtist } = useReadContract({
        address: ARTWORK_REGISTRY_ADDRESS,
        abi: ARTWORK_REGISTRY_ABI,
        functionName: 'getArtist',
        args: address ? [address] : undefined,
    });

    useEffect(() => {
        if (artistData) {
            const artist = artistData as any;
            setIsAuthorized(artist.authorized);
            setIsCheckingAuthorization(false);
        } else if (!isLoadingArtist && artistData !== undefined) {
            setIsCheckingAuthorization(false);
        }
    }, [artistData, isLoadingArtist]);

    useEffect(() => {
        const fetchEditions = async () => {
            if (!address || !isAuthorized || !publicClient) return;

            setIsLoading(true);
            try {
                const logs = await publicClient.getLogs({
                    address: ARTWORK_REGISTRY_ADDRESS,
                    event: parseAbiItem('event NewArtworkEdition(address indexed artist, uint indexed editionId)'),
                    args: { artist: address },
                    fromBlock: 9753823n,
                    toBlock: 'latest'
                });

                const editionsData: EditionInfo[] = [];

                for (const log of logs) {
                    const tokenId = log.args.editionId as bigint;

                    const editionInfo = await publicClient.readContract({
                        address: ARTWORK_REGISTRY_ADDRESS,
                        abi: ARTWORK_REGISTRY_ABI,
                        functionName: 'getArtworkEdition',
                        args: [tokenId]
                    }) as any;

                    const balance = await publicClient.readContract({
                        address: ARTWORK_TOKENIZATION_ADDRESS,
                        abi: ARTWORK_TOKENIZATION_ABI,
                        functionName: 'balanceOf',
                        args: [address, tokenId]
                    }) as bigint;

                    let artworkTitle = 'Œuvre sans titre';
                    if (editionInfo.metadata?.trim()) {
                        try {
                            const ipfsData = await getFromIPFSGateway(editionInfo.metadata);
                            artworkTitle = ipfsData.title || 'Œuvre sans titre';
                        } catch (e) {
                            console.error('Error loading IPFS:', e);
                        }
                    }

                    editionsData.push({ tokenId, title: artworkTitle, metadata: editionInfo.metadata, merkleRoot: editionInfo.merkleRoot, remainingTokens: balance });
                }

                editionsData.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
                setEditions(editionsData);

                setIsLoadingIPFS(true);
                for (const edition of editionsData) {
                    if (edition.metadata) {
                        try {
                            const ipfsData = await getFromIPFSGateway(edition.metadata) as EditionIPFSData;
                            setEditions(prev => prev.map(e => e.tokenId === edition.tokenId ? { ...e, ipfsData } : e));
                        } catch (error) {
                            console.error(`Error loading IPFS for edition ${edition.tokenId}:`, error);
                        }
                    }
                }
                setIsLoadingIPFS(false);

            } catch (error) {
                console.error('Error loading editions:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEditions();
    }, [address, isAuthorized]);

    if (isCheckingAuthorization || isLoadingArtist) {
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

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#f5f3ef]">
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                    <p className="font-serif italic text-[22px] text-[#a8a29e] text-center max-w-md px-6">
                        Accès refusé : vous n'êtes pas autorisé comme artiste
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f3ef]">
            <Navbar />
            <div className="max-w-[860px] mx-auto px-6 pt-28 pb-20">
                <div className="text-center mb-12">
                    <img 
                        src="/logo-kigen.png" 
                        alt="Kigen Logo" 
                        className="w-[52px] h-[52px] object-contain mx-auto mb-6"
                    />
                    <h1 className="font-serif text-[clamp(32px,5vw,48px)] font-normal tracking-[-1px] text-[#1c1917] leading-tight mb-8">
                        Mes <em className="italic text-[#78716c]">Œuvres</em>
                    </h1>
                    <Link
                        href="/artist/editions/create"
                        className="inline-block bg-[#1c1917] text-[#fafaf8] font-medium text-[12px] tracking-[0.06em] py-3 px-8 border border-[#1c1917] hover:bg-[#292524] transition-all duration-200"
                    >
                        + Créer une œuvre
                    </Link>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="w-8 h-8 border border-[#d6d0c8] border-t-[#1c1917] rounded-full animate-spin" />
                        <p className="text-[13px] font-light text-[#a8a29e] tracking-[0.06em]">Chargement de vos œuvres…</p>
                    </div>
                ) : editions.length === 0 ? (
                    <div className="text-center font-serif italic text-[18px] text-[#a8a29e] py-12">
                        Vous n'avez pas encore créé d'œuvre.
                    </div>
                ) : (
                    <>
                        {isLoadingIPFS && (
                            <div className="text-center text-[13px] font-light text-[#a8a29e] mb-4 tracking-[0.06em]">
                                Chargement des données IPFS…
                            </div>
                        )}
                        <div className="space-y-px">
                            {editions.map((edition) => (
                                <Link
                                    key={edition.tokenId.toString()}
                                    href={`/explore/edition/${edition.tokenId}`}
                                    className="block border border-[#d6d0c8] bg-[#fafaf8] p-8 hover:bg-[#f5f3ef] transition-colors duration-200"
                                >
                                    <div className="flex justify-between items-start gap-8">
                                        <div className="flex-1">
                                            <h2 className="font-serif text-[28px] font-normal text-[#1c1917] mb-3 leading-tight">
                                                {edition.title}
                                            </h2>
                                            <div className="space-y-1.5">
                                                <p className="text-[12px] font-light tracking-[0.06em] text-[#a8a29e]">
                                                    ŒUVRE #{edition.tokenId.toString()}
                                                </p>
                                                {edition.ipfsData?.category && (
                                                    <p className="text-[13px] font-light text-[#78716c]">
                                                        {edition.ipfsData.category}
                                                    </p>
                                                )}
                                                {edition.ipfsData?.technique && (
                                                    <p className="text-[13px] font-light text-[#78716c]">
                                                        {edition.ipfsData.technique}
                                                        {edition.ipfsData.dimensions ? ` — ${edition.ipfsData.dimensions}` : ''}
                                                    </p>
                                                )}
                                                {edition.ipfsData?.year && (
                                                    <p className="text-[13px] font-light text-[#a8a29e]">
                                                        {edition.ipfsData.year}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-[11px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                                Exemplaires restants
                                            </p>
                                            <p className="font-serif text-[36px] font-normal text-[#1c1917] leading-none">
                                                {edition.remainingTokens.toString()}
                                            </p>
                                            {edition.ipfsData?.editionSize && (
                                                <p className="text-[11px] text-[#a8a29e] mt-1">/ {edition.ipfsData.editionSize}</p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}

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