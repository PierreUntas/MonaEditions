'use client';

import { useState, useEffect } from 'react';
import { PRODUCT_TRACE_STORAGE_ADDRESS, PRODUCT_TRACE_STORAGE_ABI, PRODUCT_TOKENIZATION_ADDRESS, PRODUCT_TOKENIZATION_ABI } from '@/config/contracts';
import { getFromIPFSGateway, getIPFSUrl } from '@/app/utils/ipfs';
import Navbar from '@/components/shared/Navbar';
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
    producer: string;
    productType: string;
    metadata: string;
    totalSupply: bigint;
    remainingTokens: bigint;
    ipfsData?: BatchIPFSData;
    averageRating?: number;
    commentsCount?: number;
}

interface ProducerInfo {
    name: string;
    location: string;
}

export default function ExplorePage() {
    const [batches, setBatches] = useState<BatchInfo[]>([]);
    const [producers, setProducers] = useState<Map<string, ProducerInfo>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingIPFS, setIsLoadingIPFS] = useState(false);
    const [filterType, setFilterType] = useState<string>('all');

    useEffect(() => {
        const fetchAllBatches = async () => {
            if (!publicClient) { setIsLoading(false); return; }
            try {
                const logs = await publicClient.getLogs({
                    address: PRODUCT_TRACE_STORAGE_ADDRESS,
                    event: parseAbiItem('event NewProductBatch(address indexed producer, uint indexed productBatchId)'),
                    fromBlock: 9753823n,
                    toBlock: 'latest'
                });

                const batchesPromises = logs.map(async (log) => {
                    const tokenId = log.args.productBatchId as bigint;
                    const producerAddress = log.args.producer as `0x${string}`;
                    const [batchInfo, balance, producerData] = await Promise.all([
                        publicClient.readContract({ address: PRODUCT_TRACE_STORAGE_ADDRESS, abi: PRODUCT_TRACE_STORAGE_ABI, functionName: 'getProductBatch', args: [tokenId] }) as Promise<any>,
                        publicClient.readContract({ address: PRODUCT_TOKENIZATION_ADDRESS, abi: PRODUCT_TOKENIZATION_ABI, functionName: 'balanceOf', args: [producerAddress, tokenId] }) as Promise<bigint>,
                        publicClient.readContract({ address: PRODUCT_TRACE_STORAGE_ADDRESS, abi: PRODUCT_TRACE_STORAGE_ABI, functionName: 'getProducer', args: [producerAddress] }) as Promise<any>
                    ]);
                    return {
                        batch: { tokenId, producer: producerAddress, productType: batchInfo.productType, metadata: batchInfo.metadata, totalSupply: balance, remainingTokens: balance },
                        producerInfo: { address: producerAddress, name: producerData.name || 'Artiste anonyme', location: producerData.location || 'Non spécifié' }
                    };
                });

                const results = await Promise.all(batchesPromises);
                const producersMap = new Map<string, ProducerInfo>();
                const batchesData = results.map(({ batch, producerInfo }) => {
                    if (!producersMap.has(producerInfo.address))
                        producersMap.set(producerInfo.address, { name: producerInfo.name, location: producerInfo.location });
                    return batch;
                });

                batchesData.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
                setBatches(batchesData);
                setProducers(producersMap);
                setIsLoading(false);

                setIsLoadingIPFS(true);
                const ipfsResults = await Promise.all(batchesData.map(async (batch) => {
                    if (!batch.metadata) return null;
                    try { return { tokenId: batch.tokenId, ipfsData: await getFromIPFSGateway(batch.metadata) }; }
                    catch { return null; }
                }));

                setBatches(prev => {
                    const updated = [...prev];
                    ipfsResults.forEach(r => {
                        if (r) { const i = updated.findIndex(b => b.tokenId === r.tokenId); if (i !== -1) updated[i] = { ...updated[i], ipfsData: r.ipfsData }; }
                    });
                    return updated;
                });

                const ratingsResults = await Promise.all(batchesData.map(async (batch) => {
                    try {
                        const count = await publicClient.readContract({ address: PRODUCT_TRACE_STORAGE_ADDRESS, abi: PRODUCT_TRACE_STORAGE_ABI, functionName: 'getProductBatchCommentsCount', args: [batch.tokenId] }) as bigint;
                        if (count > 0n) {
                            const comments = await publicClient.readContract({ address: PRODUCT_TRACE_STORAGE_ADDRESS, abi: PRODUCT_TRACE_STORAGE_ABI, functionName: 'getProductBatchComments', args: [batch.tokenId, 0n, count] }) as any[];
                            return { tokenId: batch.tokenId, averageRating: comments.reduce((s, c) => s + Number(c.rating), 0) / comments.length, commentsCount: Number(count) };
                        }
                        return null;
                    } catch { return null; }
                }));

                setBatches(prev => {
                    const updated = [...prev];
                    ratingsResults.forEach(r => {
                        if (r) { const i = updated.findIndex(b => b.tokenId === r.tokenId); if (i !== -1) updated[i] = { ...updated[i], averageRating: r.averageRating, commentsCount: r.commentsCount }; }
                    });
                    return updated;
                });
                setIsLoadingIPFS(false);
            } catch (e) {
                console.error('Error loading batches:', e);
                setIsLoading(false);
            }
        };
        fetchAllBatches();
    }, []);

    const filteredBatches = filterType === 'all' ? batches : batches.filter(b => b.productType.toLowerCase().includes(filterType.toLowerCase()));
    const uniqueTypes = Array.from(new Set(batches.map(b => b.productType)));

    return (
        <div className="min-h-screen bg-[#f5f3ef]">
            <Navbar />

            <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">

                {/* Header */}
                <div className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-px bg-[#d6d0c8]" />
                        <span className="text-[11px] font-medium tracking-[0.15em] uppercase text-[#a8a29e]">
                            Explorer
                        </span>
                    </div>
                    <div className="flex items-end justify-between border-b border-[#d6d0c8] pb-8">
                        <div>
                            <h1 className="font-serif text-[clamp(40px,6vw,64px)] font-normal leading-[1.05] tracking-[-1.5px] text-[#1c1917] mb-3">
                                La <em className="italic text-[#78716c]">galerie</em>
                            </h1>
                            <p className="text-[14px] font-light text-[#78716c] leading-relaxed max-w-md">
                                Découvrez toutes les œuvres certifiées sur la blockchain.
                                Chaque fiche est un certificat d'authenticité permanent.
                            </p>
                        </div>
                        <div className="text-right hidden md:block">
                            <span className="font-serif italic text-[48px] text-[#e7e3dc] leading-none">
                                {batches.length}
                            </span>
                            <span className="block text-[11px] font-light tracking-[0.08em] text-[#a8a29e] mt-1">
                                œuvres certifiées
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap mb-10">
                    <FilterBtn active={filterType === 'all'} onClick={() => setFilterType('all')}>
                        Toutes ({batches.length})
                    </FilterBtn>
                    {uniqueTypes.map(type => (
                        <FilterBtn key={type} active={filterType === type} onClick={() => setFilterType(type)}>
                            {type} ({batches.filter(b => b.productType === type).length})
                        </FilterBtn>
                    ))}
                </div>

                {/* IPFS loading hint */}
                {isLoadingIPFS && (
                    <p className="text-[12px] font-light text-[#a8a29e] tracking-[0.06em] mb-6">
                        Chargement des données IPFS…
                    </p>
                )}

                {/* States */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="w-8 h-8 border border-[#d6d0c8] border-t-[#1c1917] rounded-full animate-spin" />
                        <p className="text-[13px] font-light text-[#a8a29e] tracking-[0.06em]">
                            Chargement des œuvres…
                        </p>
                    </div>
                ) : filteredBatches.length === 0 ? (
                    <div className="border border-[#d6d0c8] bg-[#fafaf8] p-12 text-center">
                        <p className="font-serif italic text-[22px] text-[#a8a29e]">Aucune œuvre trouvée</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#d6d0c8] border border-[#d6d0c8]">
                        {filteredBatches.map((batch) => (
                            <Link
                                key={batch.tokenId.toString()}
                                href={`/explore/batch/${batch.tokenId}`}
                                className="bg-[#fafaf8] p-6 flex flex-col gap-4 hover:bg-[#f5f3ef] transition-colors duration-200 no-underline group"
                            >
                                {/* Image */}
                                {batch.ipfsData?.labelUri ? (
                                    <div className="w-full aspect-[4/3] overflow-hidden bg-[#e7e3dc]">
                                        <img
                                            src={getIPFSUrl(batch.ipfsData.labelUri)}
                                            alt={batch.productType}
                                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full aspect-[4/3] bg-[#e7e3dc] flex items-center justify-center">
                                        <span className="font-serif italic text-[40px] text-[#d6d0c8]">起</span>
                                    </div>
                                )}

                                {/* Info */}
                                <div className="flex flex-col gap-2 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-[#a8a29e] mb-1">
                                                {batch.ipfsData?.identifier || `Œuvre #${batch.tokenId.toString()}`}
                                            </p>
                                            <h3 className="font-serif text-[18px] font-normal text-[#1c1917] leading-tight">
                                                {batch.productType}
                                            </h3>
                                        </div>
                                        <span className="text-[9px] font-medium tracking-[0.1em] uppercase text-[#4a5240] border border-[#4a5240] px-1.5 py-0.5 flex-shrink-0 mt-1">
                                            Certifié
                                        </span>
                                    </div>

                                    {batch.ipfsData?.origin && (
                                        <p className="text-[12px] font-light text-[#78716c]">
                                            {batch.ipfsData.origin}
                                        </p>
                                    )}

                                    {batch.ipfsData?.productionDate && (
                                        <p className="text-[11px] font-light text-[#a8a29e]">
                                            {new Date(batch.ipfsData.productionDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
                                        </p>
                                    )}

                                    {batch.ipfsData?.certifications && batch.ipfsData.certifications.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {batch.ipfsData.certifications.map((cert, i) => (
                                                <span key={i} className="text-[10px] font-mono text-[#78716c] border border-[#d6d0c8] px-2 py-0.5 bg-[#f5f3ef]">
                                                    {cert}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {batch.commentsCount !== undefined && batch.commentsCount > 0 && (
                                        <p className="text-[12px] font-light text-[#78716c]">
                                            {batch.averageRating?.toFixed(1)} · {batch.commentsCount} avis vérifié{batch.commentsCount > 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="border-t border-[#e7e3dc] pt-4 flex items-end justify-between">
                                    <div>
                                        <p className="text-[9px] font-medium tracking-[0.1em] uppercase text-[#a8a29e] mb-0.5">
                                            Artiste
                                        </p>
                                        <p className="text-[13px] font-light text-[#1c1917]">
                                            {producers.get(batch.producer)?.name}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-medium tracking-[0.1em] uppercase text-[#a8a29e] mb-0.5">
                                            Édition
                                        </p>
                                        <p className="text-[13px] font-light text-[#78716c] font-mono">
                                            {batch.remainingTokens.toString()} / {batch.totalSupply.toString()}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
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

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`text-[11px] font-medium tracking-[0.06em] px-4 py-2 border transition-all duration-200 cursor-pointer
                ${active
                    ? 'bg-[#1c1917] text-[#f5f3ef] border-[#1c1917]'
                    : 'bg-[#fafaf8] text-[#78716c] border-[#d6d0c8] hover:border-[#1c1917] hover:text-[#1c1917]'
                }`}
        >
            {children}
        </button>
    );
}