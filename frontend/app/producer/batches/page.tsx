'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { PRODUCT_TRACE_STORAGE_ADDRESS, PRODUCT_TRACE_STORAGE_ABI, PRODUCT_TOKENIZATION_ADDRESS, PRODUCT_TOKENIZATION_ABI } from '@/config/contracts';
import { getFromIPFSGateway } from '@/app/utils/ipfs';
import Navbar from '@/components/shared/Navbar';
import Image from 'next/image';
import Link from 'next/link';
import { parseAbiItem } from 'viem';
import { publicClient } from '@/lib/client';

interface BatchIPFSData {
    identifier: string;
    productType: string;
    description: string;
    origin: string;
    productionDate: string;
    certifications: string[];
    labelUri: string;
}

interface BatchInfo {
    tokenId: bigint;
    productType: string;
    metadata: string;
    merkleRoot: string;
    remainingTokens: bigint;
    ipfsData?: BatchIPFSData;
}

export default function ProducerBatchesPage() {
    const { address } = useAccount();
    const [batches, setBatches] = useState<BatchInfo[]>([]);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isCheckingAuthorization, setIsCheckingAuthorization] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingIPFS, setIsLoadingIPFS] = useState(false);

    const { data: producerData, isLoading: isLoadingProducer } = useReadContract({
        address: PRODUCT_TRACE_STORAGE_ADDRESS,
        abi: PRODUCT_TRACE_STORAGE_ABI,
        functionName: 'getProducer',
        args: address ? [address] : undefined,
    });

    useEffect(() => {
        if (producerData) {
            const producer = producerData as any;
            setIsAuthorized(producer.authorized);
            setIsCheckingAuthorization(false);
        } else if (!isLoadingProducer && producerData !== undefined) {
            setIsCheckingAuthorization(false);
        }
    }, [producerData, isLoadingProducer]);

    useEffect(() => {
        const fetchBatches = async () => {
            if (!address || !isAuthorized || !publicClient) {
                return;
            }

            setIsLoading(true);
            try {
                const logs = await publicClient.getLogs({
                    address: PRODUCT_TRACE_STORAGE_ADDRESS,
                    event: parseAbiItem('event NewProductBatch(address indexed producer, uint indexed productBatchId)'),
                    args: {
                        producer: address
                    },
                    fromBlock: 9753823n,
                    toBlock: 'latest'
                });

                const batchesData: BatchInfo[] = [];

                for (const log of logs) {
                    const tokenId = log.args.productBatchId as bigint;

                    const batchInfo = await publicClient.readContract({
                        address: PRODUCT_TRACE_STORAGE_ADDRESS,
                        abi: PRODUCT_TRACE_STORAGE_ABI,
                        functionName: 'getProductBatch',
                        args: [tokenId]
                    }) as any;

                    const balance = await publicClient.readContract({
                        address: PRODUCT_TOKENIZATION_ADDRESS,
                        abi: PRODUCT_TOKENIZATION_ABI,
                        functionName: 'balanceOf',
                        args: [address, tokenId]
                    }) as bigint;

                    batchesData.push({
                        tokenId,
                        productType: batchInfo.productType,
                        metadata: batchInfo.metadata,
                        merkleRoot: batchInfo.merkleRoot,
                        remainingTokens: balance
                    });
                }

                batchesData.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
                setBatches(batchesData);

                // Load IPFS data for each batch
                setIsLoadingIPFS(true);
                for (let i = 0; i < batchesData.length; i++) {
                    if (batchesData[i].metadata) {
                        try {
                            const ipfsData = await getFromIPFSGateway(batchesData[i].metadata);
                            setBatches(prev => prev.map(batch =>
                                batch.tokenId === batchesData[i].tokenId
                                    ? { ...batch, ipfsData }
                                    : batch
                            ));
                        } catch (error) {
                            console.error(`Error loading IPFS for batch ${batchesData[i].tokenId}:`, error);
                        }
                    }
                }
                setIsLoadingIPFS(false);

            } catch (error) {
                console.error('Error loading batches:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBatches();
    }, [address, isAuthorized]);

    // Loading state while checking permissions
    if (isCheckingAuthorization || isLoadingProducer) {
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
                    <p className="font-serif italic text-[22px] text-[#a8a29e]">
                        Veuillez connecter votre wallet
                    </p>
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
                    <div className="w-[52px] h-[52px] border border-[#d6d0c8] bg-[#fafaf8] flex items-center justify-center font-serif italic text-[22px] text-[#a8a29e] mx-auto mb-6">
                        起
                    </div>
                    <h1 className="font-serif text-[clamp(32px,5vw,48px)] font-normal tracking-[-1px] text-[#1c1917] leading-tight mb-8">
                        Mes <em className="italic text-[#78716c]">Œuvres</em>
                    </h1>
                    <Link
                        href="/producer/batches/create"
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
                ) : batches.length === 0 ? (
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
                            {batches.map((batch) => (
                                <Link
                                    key={batch.tokenId.toString()}
                                    href={`/explore/batch/${batch.tokenId}`}
                                    className="block border border-[#d6d0c8] bg-[#fafaf8] p-8 hover:bg-[#f5f3ef] transition-colors duration-200"
                                >
                                    <div className="flex justify-between items-start gap-8">
                                        <div className="flex-1">
                                            <h2 className="font-serif text-[28px] font-normal text-[#1c1917] mb-3 leading-tight">
                                                {batch.productType}
                                            </h2>
                                            <div className="space-y-1.5">
                                                <p className="text-[12px] font-light tracking-[0.06em] text-[#a8a29e]">
                                                    ŒUVRE #{batch.tokenId.toString()}
                                                </p>
                                                {batch.ipfsData?.identifier && (
                                                    <p className="text-[13px] font-light text-[#78716c]">
                                                        Identifiant: {batch.ipfsData.identifier}
                                                    </p>
                                                )}
                                                {batch.ipfsData?.origin && (
                                                    <p className="text-[13px] font-light text-[#78716c]">
                                                        Lieu: {batch.ipfsData.origin}
                                                    </p>
                                                )}
                                                {batch.ipfsData?.productionDate && (
                                                    <p className="text-[13px] font-light text-[#78716c]">
                                                        Création: {batch.ipfsData.productionDate}
                                                    </p>
                                                )}
                                                {batch.ipfsData?.certifications && batch.ipfsData.certifications.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                                        {batch.ipfsData.certifications.map((cert, index) => (
                                                            <span
                                                                key={index}
                                                                className="text-[11px] px-2 py-1 bg-[#ede9e3] text-[#1c1917] border border-[#d6d0c8] font-medium tracking-[0.06em]"
                                                            >
                                                                {cert}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                                Exemplaires restants
                                            </p>
                                            <p className="font-serif text-[36px] font-normal text-[#1c1917] leading-none">
                                                {batch.remainingTokens.toString()}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}

                {/* Footer mark */}
                <div className="flex justify-center mt-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-px h-12 bg-[#d6d0c8]" />
                        <span className="font-serif italic text-[13px] text-[#a8a29e]">起 Kigen</span>
                    </div>
                </div>
            </div>
        </div>
    );
}