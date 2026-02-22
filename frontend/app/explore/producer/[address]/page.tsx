'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PRODUCT_TRACE_STORAGE_ADDRESS, PRODUCT_TRACE_STORAGE_ABI, PRODUCT_TOKENIZATION_ADDRESS, PRODUCT_TOKENIZATION_ABI } from '@/config/contracts';
import { getFromIPFSGateway, getIPFSUrl } from '@/app/utils/ipfs';
import Navbar from '@/components/shared/Navbar';
import Image from 'next/image';
import Link from 'next/link';
import { parseAbiItem } from 'viem';
import { publicClient } from '@/lib/client';

interface ProducerInfo {
    name: string;
    location: string;
    companyRegisterNumber: string;
    metadata: string;
}

interface ProducerIPFSData {
    labelsCertifications: string[];
    anneeCreation: number;
    description: string;
    photos: string[];
    logo: string;
    contact: {
        email: string;
        telephone: string;
        adresseCourrier: string;
    };
    siteWeb: string;
}

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
    remainingTokens: bigint;
    ipfsData?: BatchIPFSData;
    averageRating?: number;
    commentsCount?: number;
}

export default function ProducerDetailsPage() {
    const params = useParams();
    const producerAddress = params.address as string;

    const [producer, setProducer] = useState<ProducerInfo | null>(null);
    const [producerIPFSData, setProducerIPFSData] = useState<ProducerIPFSData | null>(null);
    const [batches, setBatches] = useState<BatchInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingIPFS, setIsLoadingIPFS] = useState(false);

    useEffect(() => {
        const fetchProducerDetails = async () => {
            if (!publicClient || !producerAddress) {
                setIsLoading(false);
                return;
            }

            try {
                const producerData = await publicClient.readContract({
                    address: PRODUCT_TRACE_STORAGE_ADDRESS,
                    abi: PRODUCT_TRACE_STORAGE_ABI,
                    functionName: 'getProducer',
                    args: [producerAddress as `0x${string}`]
                }) as any;

                const producerInfo = {
                    name: producerData.name,
                    location: producerData.location,
                    companyRegisterNumber: producerData.companyRegisterNumber,
                    metadata: producerData.metadata
                };

                setProducer(producerInfo);

                if (producerData.metadata && producerData.metadata.trim() !== '') {
                    setIsLoadingIPFS(true);
                    try {
                        const ipfsData = await getFromIPFSGateway(producerData.metadata);
                        setProducerIPFSData(ipfsData);
                    } catch (error) {
                        console.error('Error loading producer IPFS data:', error);
                    } finally {
                        setIsLoadingIPFS(false);
                    }
                }

                const logs = await publicClient.getLogs({
                    address: PRODUCT_TRACE_STORAGE_ADDRESS,
                    event: parseAbiItem('event NewProductBatch(address indexed producer, uint indexed productBatchId)'),
                    args: {
                        producer: producerAddress as `0x${string}`
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
                        args: [producerAddress as `0x${string}`, tokenId]
                    }) as bigint;

                    batchesData.push({
                        tokenId,
                        productType: batchInfo.productType,
                        metadata: batchInfo.metadata,
                        remainingTokens: balance
                    });
                }

                batchesData.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
                setBatches(batchesData);

                // Load IPFS data and ratings in parallel
                for (let i = 0; i < batchesData.length; i++) {
                    const tokenId = batchesData[i].tokenId;
                    
                    // Fetch comments to compute the average rating
                    const commentsCount = await publicClient.readContract({
                        address: PRODUCT_TRACE_STORAGE_ADDRESS,
                        abi: PRODUCT_TRACE_STORAGE_ABI,
                        functionName: 'getProductBatchCommentsCount',
                        args: [tokenId]
                    }) as bigint;

                    let averageRating = 0;
                    if (commentsCount > 0n) {
                        const comments = await publicClient.readContract({
                            address: PRODUCT_TRACE_STORAGE_ADDRESS,
                            abi: PRODUCT_TRACE_STORAGE_ABI,
                            functionName: 'getProductBatchComments',
                            args: [tokenId, 0n, commentsCount]
                        }) as any[];

                        const sum = comments.reduce((acc: number, comment: any) => acc + Number(comment.rating), 0);
                        averageRating = sum / comments.length;
                    }

                    if (batchesData[i].metadata && batchesData[i].metadata.trim() !== '') {
                        try {
                            const batchIPFSData = await getFromIPFSGateway(batchesData[i].metadata);
                            setBatches(prev => prev.map(b =>
                                b.tokenId === tokenId
                                    ? { ...b, ipfsData: batchIPFSData, averageRating, commentsCount: Number(commentsCount) }
                                    : b
                            ));
                        } catch (error) {
                            console.error(`Error loading batch IPFS data ${tokenId}:`, error);
                            setBatches(prev => prev.map(b =>
                                b.tokenId === tokenId
                                    ? { ...b, averageRating, commentsCount: Number(commentsCount) }
                                    : b
                            ));
                        }
                    } else {
                        setBatches(prev => prev.map(b =>
                            b.tokenId === tokenId
                                ? { ...b, averageRating, commentsCount: Number(commentsCount) }
                                : b
                        ));
                    }
                }

            } catch (error) {
                console.error('Error loading producer details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProducerDetails();
    }, [producerAddress]);

    if (isLoading) {
        return (
            <div className="min-h-screen" style={{ background: '#07080B' }}>
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                    <div className="text-center">
                        <div 
                            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4"
                            style={{ borderColor: '#C9A55A' }}
                        ></div>
                        <p style={{ color: '#8C95AA', fontSize: '15px' }}>Chargement des détails du producteur...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!producer) {
        return (
            <div className="min-h-screen" style={{ background: '#07080B' }}>
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                    <p style={{ color: '#8C95AA', fontSize: '15px' }}>
                        Producteur introuvable
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: '#07080B', color: '#F2F4F8' }}>
            <Navbar />
            <div className="container mx-auto p-6 max-w-6xl pt-28">
                <Link
                    href="/explore/batches"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mb-8"
                    style={{
                        color: '#8C95AA',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'transparent',
                    }}
                >
                    ← Retour à l'exploration
                </Link>

                {isLoadingIPFS && (
                    <div className="text-center mb-6" style={{ color: '#8C95AA', fontSize: '14px' }}>
                        Chargement des données IPFS...
                    </div>
                )}

                <div 
                    className="rounded-2xl p-8 mb-8"
                    style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <div className="flex items-start gap-6 mb-6">
                        <div className="flex-1">
                            <h1 
                                className="text-4xl font-bold"
                                style={{
                                    fontFamily: "'Playfair Display', Georgia, serif",
                                    color: '#F2F4F8'
                                }}
                            >
                                {producer.name}
                            </h1>
                        </div>
                        {producerIPFSData?.logo && (
                            <div className="flex-shrink-0">
                                <img
                                    src={producerIPFSData.logo.startsWith('ipfs://')
                                        ? `https://ipfs.io/ipfs/${producerIPFSData.logo.replace('ipfs://', '')}`
                                        : producerIPFSData.logo}
                                    alt={`Logo ${producer.name}`}
                                    className="w-24 h-24 object-contain rounded-xl"
                                    style={{ border: '1px solid rgba(255,255,255,0.06)', background: '#07080B' }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                    Localisation
                                </p>
                                <p style={{ fontSize: '15px', color: '#F2F4F8' }}>
                                    {producer.location}
                                </p>
                            </div>
                            <div>
                                <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                    N° d'immatriculation
                                </p>
                                <p style={{ fontSize: '15px', color: '#F2F4F8' }}>
                                    {producer.companyRegisterNumber}
                                </p>
                            </div>
                            {producerIPFSData?.anneeCreation && (
                                <div>
                                    <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                        Année de création
                                    </p>
                                    <p style={{ fontSize: '15px', color: '#F2F4F8' }}>
                                        {producerIPFSData.anneeCreation}
                                    </p>
                                </div>
                            )}
                            <div>
                                <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                    Adresse Ethereum
                                </p>
                                <p className="text-xs font-mono break-all" style={{ color: '#8C95AA' }}>
                                    {producerAddress}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {producerIPFSData?.description && (
                                <div>
                                    <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                        Description
                                    </p>
                                    <p style={{ fontSize: '15px', color: '#F2F4F8', lineHeight: 1.75 }}>
                                        {producerIPFSData.description}
                                    </p>
                                </div>
                            )}
                            {producerIPFSData?.contact?.email && (
                                <div>
                                    <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                        Email
                                    </p>
                                    <p style={{ fontSize: '15px', color: '#F2F4F8' }}>
                                        {producerIPFSData.contact.email}
                                    </p>
                                </div>
                            )}
                            {producerIPFSData?.contact?.telephone && (
                                <div>
                                    <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                        Téléphone
                                    </p>
                                    <p style={{ fontSize: '15px', color: '#F2F4F8' }}>
                                        {producerIPFSData.contact.telephone}
                                    </p>
                                </div>
                            )}
                            {producerIPFSData?.siteWeb && (
                                <div>
                                    <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                        Site web
                                    </p>
                                    <a
                                        href={producerIPFSData.siteWeb}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline"
                                        style={{ fontSize: '15px', color: '#C9A55A' }}
                                    >
                                        {producerIPFSData.siteWeb}
                                    </a>
                                </div>
                            )}
                            {producerIPFSData?.labelsCertifications && producerIPFSData.labelsCertifications.length > 0 && (
                                <div>
                                    <p className="mb-2" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                        Labels et certifications
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {producerIPFSData.labelsCertifications.map((label, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1.5 text-xs font-mono rounded-full"
                                                style={{
                                                    background: 'rgba(201,165,90,0.07)',
                                                    color: '#C9A55A',
                                                    border: '1px solid rgba(201,165,90,0.15)',
                                                }}
                                            >
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {producerIPFSData?.photos && producerIPFSData.photos.length > 0 && (
                    <div 
                        className="rounded-2xl p-8 mb-8"
                        style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <h2 
                            className="text-2xl font-bold mb-5"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#F2F4F8' }}
                        >
                            Photos
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {producerIPFSData.photos.map((photo, index) => (
                                <div key={index} className="relative">
                                    <img
                                        src={photo.startsWith('ipfs://')
                                            ? `https://ipfs.io/ipfs/${photo.replace('ipfs://', '')}`
                                            : photo}
                                        alt={`Photo ${index + 1} de ${producer.name}`}
                                        className="w-full h-64 object-cover rounded-xl"
                                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <h2 
                    className="text-3xl font-bold mb-6"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#F2F4F8' }}
                >
                    Lots de produits ({batches.length})
                </h2>

                {batches.length === 0 ? (
                    <div className="text-center py-12" style={{ color: '#8C95AA', fontSize: '15px' }}>
                        Ce producteur n'a pas encore créé de lot.
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {batches.map((batch) => (
                            <Link
                                key={batch.tokenId.toString()}
                                href={`/explore/batch/${batch.tokenId}`}
                                className="rounded-2xl p-5 transition-all duration-200 hover:border-white/15"
                                style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.06)' }}
                            >
                                {batch.ipfsData?.labelUri && (
                                    <div className="mb-4 rounded-xl overflow-hidden">
                                        <img
                                            src={getIPFSUrl(batch.ipfsData.labelUri)}
                                            alt={`Étiquette ${batch.productType}`}
                                            className="w-full h-32 object-cover"
                                        />
                                    </div>
                                )}
                                
                                <h3 
                                    className="text-xl font-bold mb-2"
                                    style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#F2F4F8' }}
                                >
                                    {batch.productType}
                                </h3>
                                {batch.ipfsData?.identifier && (
                                    <p className="mb-2" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                        {batch.ipfsData.identifier}
                                    </p>
                                )}
                                {batch.ipfsData?.origin && (
                                    <p className="mb-2" style={{ fontSize: '14px', color: '#8C95AA' }}>
                                        📍 {batch.ipfsData.origin}
                                    </p>
                                )}
                                {batch.ipfsData?.productionDate && (
                                    <p className="mb-2" style={{ fontSize: '14px', color: '#8C95AA' }}>
                                        📅 {new Date(batch.ipfsData.productionDate).toLocaleDateString('fr-FR')}
                                    </p>
                                )}
                                {batch.ipfsData?.certifications && batch.ipfsData.certifications.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {batch.ipfsData.certifications.map((cert, index) => (
                                            <span
                                                key={index}
                                                className="px-2.5 py-1 text-xs font-mono rounded-full"
                                                style={{
                                                    background: 'rgba(201,165,90,0.07)',
                                                    color: '#C9A55A',
                                                    border: '1px solid rgba(201,165,90,0.15)',
                                                }}
                                            >
                                                {cert}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {batch.commentsCount !== undefined && batch.commentsCount > 0 && (
                                    <div className="flex items-center gap-2 mb-3">
                                        <span style={{ color: '#C9A55A' }}>⭐</span>
                                        <span style={{ fontSize: '14px', color: '#F2F4F8' }}>
                                            {batch.averageRating?.toFixed(1)} ({batch.commentsCount} avis)
                                        </span>
                                    </div>
                                )}
                                <div 
                                    className="flex justify-between items-center mt-3 pt-3"
                                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                                >
                                    <p style={{ fontSize: '12px', color: '#8C95AA' }}>
                                        Lot #{batch.tokenId.toString()}
                                    </p>
                                    <p style={{ fontSize: '14px', color: '#C9A55A', fontWeight: 500 }}>
                                        {batch.remainingTokens.toString()} tokens
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="flex justify-center mt-16 mb-8">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
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
                </div>
            </div>
        </div>
    );
}
