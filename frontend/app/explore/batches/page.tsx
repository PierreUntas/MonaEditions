'use client';

import { useState, useEffect } from 'react';
import { PRODUCT_TRACE_STORAGE_ADDRESS, PRODUCT_TRACE_STORAGE_ABI, PRODUCT_TOKENIZATION_ADDRESS, PRODUCT_TOKENIZATION_ABI } from '@/config/contracts';
import { getFromIPFSGateway, getIPFSUrl } from '@/app/utils/ipfs';
import Navbar from '@/components/shared/Navbar';
import Image from 'next/image';
import Link from 'next/link';
import { parseAbiItem } from 'viem';
import { publicClient } from '@/lib/client';
import dynamic from 'next/dynamic';
import { useTheme } from '@/app/context/ThemeContext';

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
    const { theme } = useTheme();
    const [batches, setBatches] = useState<BatchInfo[]>([]);
    const [producers, setProducers] = useState<Map<string, ProducerInfo>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingIPFS, setIsLoadingIPFS] = useState(false);
    const [filterType, setFilterType] = useState<string>('all');

    useEffect(() => {
        const fetchAllBatches = async () => {
            if (!publicClient) {
                setIsLoading(false);
                return;
            }

            try {
                const logs = await publicClient.getLogs({
                    address: PRODUCT_TRACE_STORAGE_ADDRESS,
                    event: parseAbiItem('event NewProductBatch(address indexed producer, uint indexed productBatchId)'),
                    fromBlock: 9753823n,
                    toBlock: 'latest'
                });

                // Récupérer toutes les données blockchain en parallèle
                const batchesPromises = logs.map(async (log) => {
                    const tokenId = log.args.productBatchId as bigint;
                    const producerAddress = log.args.producer as `0x${string}`;

                    // Execute the 3 calls in parallel for each batch
                    const [batchInfo, balance, producerData] = await Promise.all([
                        publicClient.readContract({
                            address: PRODUCT_TRACE_STORAGE_ADDRESS,
                            abi: PRODUCT_TRACE_STORAGE_ABI,
                            functionName: 'getProductBatch',
                            args: [tokenId]
                        }) as Promise<any>,
                        publicClient.readContract({
                            address: PRODUCT_TOKENIZATION_ADDRESS,
                            abi: PRODUCT_TOKENIZATION_ABI,
                            functionName: 'balanceOf',
                            args: [producerAddress, tokenId]
                        }) as Promise<bigint>,
                        publicClient.readContract({
                            address: PRODUCT_TRACE_STORAGE_ADDRESS,
                            abi: PRODUCT_TRACE_STORAGE_ABI,
                            functionName: 'getProducer',
                            args: [producerAddress]
                        }) as Promise<any>
                    ]);

                    return {
                        batch: {
                            tokenId,
                            producer: producerAddress,
                            productType: batchInfo.productType,
                            metadata: batchInfo.metadata,
                            totalSupply: balance,
                            remainingTokens: balance
                        },
                        producerInfo: {
                            address: producerAddress,
                            name: producerData.name || 'Producteur anonyme',
                            location: producerData.location || 'Non spécifié'
                        }
                    };
                });

                // Wait for all blockchain requests
                const results = await Promise.all(batchesPromises);

                // Build the producers map
                const producersMap = new Map<string, ProducerInfo>();
                const batchesData = results.map(({ batch, producerInfo }) => {
                    if (!producersMap.has(producerInfo.address)) {
                        producersMap.set(producerInfo.address, {
                            name: producerInfo.name,
                            location: producerInfo.location
                        });
                    }
                    return batch;
                });

                batchesData.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
                setBatches(batchesData);
                setProducers(producersMap);
                setIsLoading(false);

                // Load IPFS data in parallel
                setIsLoadingIPFS(true);
                const ipfsPromises = batchesData.map(async (batch) => {
                    if (!batch.metadata) return null;

                    try {
                        const ipfsData = await getFromIPFSGateway(batch.metadata);
                        return { tokenId: batch.tokenId, ipfsData };
                    } catch (error) {
                        console.error(`Error loading IPFS data for batch ${batch.tokenId}:`, error);
                        return null;
                    }
                });

                const ipfsResults = await Promise.all(ipfsPromises);

                // Update all batches with their IPFS data
                setBatches(prev => {
                    const updated = [...prev];
                    ipfsResults.forEach(result => {
                        if (result) {
                            const index = updated.findIndex(b => b.tokenId === result.tokenId);
                            if (index !== -1) {
                                updated[index] = { ...updated[index], ipfsData: result.ipfsData };
                            }
                        }
                    });
                    return updated;
                });

                // Load ratings and comments for each batch
                const ratingsPromises = batchesData.map(async (batch) => {
                    try {
                        const commentsCount = await publicClient.readContract({
                            address: PRODUCT_TRACE_STORAGE_ADDRESS,
                            abi: PRODUCT_TRACE_STORAGE_ABI,
                            functionName: 'getProductBatchCommentsCount',
                            args: [batch.tokenId]
                        }) as bigint;

                        if (commentsCount > 0n) {
                            const comments = await publicClient.readContract({
                                address: PRODUCT_TRACE_STORAGE_ADDRESS,
                                abi: PRODUCT_TRACE_STORAGE_ABI,
                                functionName: 'getProductBatchComments',
                                args: [batch.tokenId, 0n, commentsCount]
                            }) as any[];

                            const totalRating = comments.reduce((sum, comment) => sum + Number(comment.rating), 0);
                            const averageRating = totalRating / comments.length;

                            return {
                                tokenId: batch.tokenId,
                                averageRating,
                                commentsCount: Number(commentsCount)
                            };
                        }
                        return null;
                    } catch (error) {
                        console.error(`Error loading comments for batch ${batch.tokenId}:`, error);
                        return null;
                    }
                });

                const ratingsResults = await Promise.all(ratingsPromises);

                // Update batches with ratings
                setBatches(prev => {
                    const updated = [...prev];
                    ratingsResults.forEach(result => {
                        if (result) {
                            const index = updated.findIndex(b => b.tokenId === result.tokenId);
                            if (index !== -1) {
                                updated[index] = {
                                    ...updated[index],
                                    averageRating: result.averageRating,
                                    commentsCount: result.commentsCount
                                };
                            }
                        }
                    });
                    return updated;
                });

                setIsLoadingIPFS(false);

            } catch (error) {
                console.error('Error loading batches:', error);
                setIsLoading(false);
            }
        };

        fetchAllBatches();
    }, []);


    const filteredBatches = filterType === 'all'
        ? batches
        : batches.filter(b => b.productType.toLowerCase().includes(filterType.toLowerCase()));

    const uniqueProductTypes = Array.from(new Set(batches.map(b => b.productType)));

    return (
        <div className="min-h-screen" style={{
            background: theme === 'light'
                ? 'linear-gradient(to bottom right, #FDF6E3, #F0E6C8)'
                : 'linear-gradient(to bottom right, #0d0805, #1a1008)'
        }}>
            <Navbar />
            <div className="container mx-auto p-6 max-w-6xl pt-28">
                {/* Header */}
                <div className="text-center mb-12">
                    <p
                        className="text-xs tracking-[5px] uppercase mb-4"
                        style={{ color: '#c0392b' }}
                    >
                        Explorer
                    </p>
                    <h1
                        className="text-5xl font-bold mb-4"
                        style={{
                            fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            letterSpacing: '-2.5px',
                            lineHeight: 1,
                            color: theme === 'light' ? '#1a1008' : '#fdf6e3',
                            fontWeight: 800
                        }}
                    >
                        Les produits
                    </h1>
                    <div className="flex justify-center mb-4">
                        <svg width="240" height="8" viewBox="0 0 240 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="4" cy="4" r="3.5" fill="#c0392b" stroke="#c0392b" strokeWidth="0.5"/>
                            <line x1="12" y1="4" x2="228" y2="4" stroke={theme === 'light' ? '#c8b89a' : '#5a4a2a'} strokeWidth="1"/>
                            <circle cx="236" cy="4" r="3.5" fill="#c0392b" stroke="#c0392b" strokeWidth="0.5"/>
                        </svg>
                    </div>
                    <p style={{ 
                        color: theme === 'light' ? '#5a4a2a' : '#c8b89a', 
                        fontSize: '17px', 
                        fontWeight: 300, 
                        lineHeight: 1.75 
                    }}>
                        Découvrez tous les produits traçables sur la blockchain
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-8 flex gap-2 flex-wrap justify-center">
                    <button
                        onClick={() => setFilterType('all')}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                        style={
                            filterType === 'all'
                                ? {
                                    background: '#c0392b',
                                    color: '#fdf6e3',
                                    border: '1px solid #c0392b',
                                }
                                : {
                                    background: theme === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(40,30,18,0.5)',
                                    color: theme === 'light' ? '#5a4a2a' : '#c8b89a',
                                    border: theme === 'light' ? '1px solid #c8b89a' : '1px solid #5a4a2a',
                                }
                        }
                    >
                        Tous ({batches.length})
                    </button>
                    {uniqueProductTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                            style={
                                filterType === type
                                    ? {
                                        background: '#c0392b',
                                        color: '#fdf6e3',
                                        border: '1px solid #c0392b',
                                    }
                                    : {
                                        background: theme === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(40,30,18,0.5)',
                                        color: theme === 'light' ? '#5a4a2a' : '#c8b89a',
                                        border: theme === 'light' ? '1px solid #c8b89a' : '1px solid #5a4a2a',
                                    }
                            }
                        >
                            {type} ({batches.filter(b => b.productType === type).length})
                        </button>
                    ))}
                </div>

                {isLoadingIPFS && (
                    <div className="text-center mb-6" style={{ color: '#5a4a2a', fontSize: '14px' }}>
                        Chargement des données IPFS...
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div 
                                className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4"
                                style={{ borderColor: '#c0392b' }}
                            ></div>
                            <p style={{ 
                                color: theme === 'light' ? '#5a4a2a' : '#c8b89a', 
                                fontSize: '15px' 
                            }}>
                                Chargement des lots...
                            </p>
                        </div>
                    </div>
                ) : filteredBatches.length === 0 ? (
                    <div
                        className="rounded-2xl p-10 text-center"
                        style={{ 
                            background: theme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(40,30,18,0.6)', 
                            border: theme === 'light' ? '1px solid #c8b89a' : '1px solid #5a4a2a' 
                        }}
                    >
                        <p style={{ 
                            color: theme === 'light' ? '#5a4a2a' : '#c8b89a', 
                            fontSize: '15px' 
                        }}>
                            Aucun lot trouvé
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredBatches.map((batch) => (
                            <Link
                                key={batch.tokenId.toString()}
                                href={`/explore/batch/${batch.tokenId}`}
                                className="rounded-2xl p-5 transition-all duration-200 hover:shadow-lg"
                                style={{ 
                                    background: theme === 'light' ? '#f5ead0' : 'rgba(40,30,18,0.8)', 
                                    border: '2px solid #c0392b' 
                                }}
                            >
                                {batch.ipfsData?.labelUri && (
                                    <div className="mb-4 rounded-xl overflow-hidden" style={{ 
                                        border: theme === 'light' ? '1px solid #c8b89a' : '1px solid #5a4a2a' 
                                    }}>
                                        <img
                                            src={getIPFSUrl(batch.ipfsData.labelUri)}
                                            alt={`Étiquette ${batch.productType}`}
                                            className="w-full h-40 object-cover"
                                        />
                                    </div>
                                )}
                                
                                <div className="mb-3">
                                    <h3 
                                        className="text-2xl font-bold mb-1"
                                        style={{ 
                                            fontFamily: "'Playfair Display', Georgia, serif",
                                            color: theme === 'light' ? '#1a1008' : '#fdf6e3' 
                                        }}
                                    >
                                        {batch.productType}
                                    </h3>
                                    {batch.ipfsData?.identifier && (
                                        <p style={{ 
                                            fontSize: '12px', 
                                            color: theme === 'light' ? '#5a4a2a' : '#c8b89a' 
                                        }}>
                                            {batch.ipfsData.identifier}
                                        </p>
                                    )}
                                </div>

                                {batch.ipfsData?.origin && (
                                    <p className="mb-2" style={{ 
                                        fontSize: '14px', 
                                        color: theme === 'light' ? '#5a4a2a' : '#c8b89a' 
                                    }}>
                                        📍 {batch.ipfsData.origin}
                                    </p>
                                )}

                                {batch.ipfsData?.productionDate && (
                                    <p className="mb-2" style={{ 
                                        fontSize: '14px', 
                                        color: theme === 'light' ? '#5a4a2a' : '#c8b89a' 
                                    }}>
                                        📅 {new Date(batch.ipfsData.productionDate).toLocaleDateString('fr-FR')}
                                    </p>
                                )}

                                {batch.ipfsData?.certifications && batch.ipfsData.certifications.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {batch.ipfsData.certifications.map((cert, index) => (
                                            <span
                                                key={index}
                                                className="text-xs px-2.5 py-1 rounded-full font-mono"
                                                style={{
                                                    background: 'rgba(192,57,43,0.2)',
                                                    color: '#ff9999',
                                                    border: '1px solid rgba(192,57,43,0.5)',
                                                }}
                                            >
                                                {cert}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {batch.commentsCount !== undefined && batch.commentsCount > 0 && (
                                    <div className="flex items-center gap-2 mb-3">
                                        <span style={{ color: '#c0392b' }}>⭐</span>
                                        <span style={{ 
                                            fontSize: '14px', 
                                            color: theme === 'light' ? '#1a1008' : '#fdf6e3' 
                                        }}>
                                            {batch.averageRating?.toFixed(1)} ({batch.commentsCount} avis)
                                        </span>
                                    </div>
                                )}

                                <div 
                                    className="pt-3 mt-3"
                                    style={{ borderTop: '1px solid #c0392b' }}
                                >
                                    <p className="mb-1" style={{ 
                                        fontSize: '12px', 
                                        color: theme === 'light' ? '#5a4a2a' : '#c8b89a' 
                                    }}>
                                        Producteur
                                    </p>
                                    <p className="mb-3" style={{ 
                                        fontSize: '14px', 
                                        color: theme === 'light' ? '#1a1008' : '#fdf6e3' 
                                    }}>
                                        {producers.get(batch.producer)?.name}
                                    </p>
                                    <div className="flex justify-between items-center">
                                        <p style={{ 
                                            fontSize: '12px', 
                                            color: theme === 'light' ? '#5a4a2a' : '#c8b89a' 
                                        }}>
                                            Lot #{batch.tokenId.toString()}
                                        </p>
                                        <p style={{ fontSize: '14px', color: '#c0392b', fontWeight: 600 }}>
                                            {batch.remainingTokens.toString()} tokens
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="flex justify-center mt-16 mb-8">
                    <div
                        className="w-16 h-16 flex items-center justify-center relative"
                        style={{
                            background: '#c0392b',
                            borderRadius: '10px',
                            boxShadow: '0 0 12px rgba(192,57,43,0.3)',
                        }}
                    >
                        <div
                            className="absolute inset-0"
                            style={{
                                border: '1px solid rgba(255,107,107,0.5)',
                                borderRadius: '10px',
                                margin: '5px',
                            }}
                        />
                        <span
                            style={{
                                fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', sans-serif",
                                fontSize: '40px',
                                color: 'white',
                                fontWeight: 500,
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            起
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
