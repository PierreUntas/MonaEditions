'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PRODUCT_TRACE_STORAGE_ADDRESS, PRODUCT_TRACE_STORAGE_ABI, PRODUCT_TOKENIZATION_ADDRESS, PRODUCT_TOKENIZATION_ABI } from '@/config/contracts';
import { getFromIPFSGateway, getIPFSUrl } from '@/app/utils/ipfs';
import Navbar from '@/components/shared/Navbar';
import Image from 'next/image';
import Link from 'next/link';
import { publicClient } from '@/lib/client';

interface BatchDetails {
    tokenId: bigint;
    producer: string;
    productType: string;
    metadata: string;
    merkleRoot: string;
    remainingTokens: bigint;
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

interface Comment {
    consumer: string;
    productBatchId: bigint;
    rating: number;
    metadata: string;
}

export default function BatchDetailsPage() {
    const params = useParams();
    const batchId = params.id as string;

    const [batch, setBatch] = useState<BatchDetails | null>(null);
    const [batchIPFSData, setBatchIPFSData] = useState<BatchIPFSData | null>(null);
    const [producer, setProducer] = useState<ProducerInfo | null>(null);
    const [producerIPFSData, setProducerIPFSData] = useState<ProducerIPFSData | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingIPFS, setIsLoadingIPFS] = useState(false);
    const [labelImageError, setLabelImageError] = useState(false);

    useEffect(() => {
        const fetchBatchDetails = async () => {
            if (!publicClient || !batchId) {
                setIsLoading(false);
                return;
            }

            try {
                const tokenId = BigInt(batchId);

                const batchInfo = await publicClient.readContract({
                    address: PRODUCT_TRACE_STORAGE_ADDRESS,
                    abi: PRODUCT_TRACE_STORAGE_ABI,
                    functionName: 'getProductBatch',
                    args: [tokenId]
                }) as any;

                const producerAddress = await publicClient.readContract({
                    address: PRODUCT_TOKENIZATION_ADDRESS,
                    abi: PRODUCT_TOKENIZATION_ABI,
                    functionName: 'tokenProducer',
                    args: [tokenId]
                }) as `0x${string}`;

                const balance = await publicClient.readContract({
                    address: PRODUCT_TOKENIZATION_ADDRESS,
                    abi: PRODUCT_TOKENIZATION_ABI,
                    functionName: 'balanceOf',
                    args: [producerAddress, tokenId]
                }) as bigint;

                const batchData = {
                    tokenId,
                    producer: producerAddress,
                    productType: batchInfo.productType,
                    metadata: batchInfo.metadata,
                    merkleRoot: batchInfo.merkleRoot,
                    remainingTokens: balance
                };

                setBatch(batchData);

                if (batchInfo.metadata && batchInfo.metadata.trim() !== '') {
                    setIsLoadingIPFS(true);
                    try {
                        const ipfsData = await getFromIPFSGateway(batchInfo.metadata);
                        setBatchIPFSData(ipfsData);
                    } catch (error) {
                        console.error('Error loading batch IPFS data:', error);
                    } finally {
                        setIsLoadingIPFS(false);
                    }
                }

                const producerData = await publicClient.readContract({
                    address: PRODUCT_TRACE_STORAGE_ADDRESS,
                    abi: PRODUCT_TRACE_STORAGE_ABI,
                    functionName: 'getProducer',
                    args: [producerAddress]
                }) as any;

                const producerInfo = {
                    name: producerData.name,
                    location: producerData.location,
                    companyRegisterNumber: producerData.companyRegisterNumber,
                    metadata: producerData.metadata
                };

                setProducer(producerInfo);

                if (producerData.metadata && producerData.metadata.trim() !== '') {
                    try {
                        const producerIpfsData = await getFromIPFSGateway(producerData.metadata);
                        setProducerIPFSData(producerIpfsData);
                    } catch (error) {
                        console.error('Error loading producer IPFS data:', error);
                    }
                }

                const commentsCount = await publicClient.readContract({
                    address: PRODUCT_TRACE_STORAGE_ADDRESS,
                    abi: PRODUCT_TRACE_STORAGE_ABI,
                    functionName: 'getProductBatchCommentsCount',
                    args: [tokenId]
                }) as bigint;

                if (commentsCount > 0n) {
                    const commentsData = await publicClient.readContract({
                        address: PRODUCT_TRACE_STORAGE_ADDRESS,
                        abi: PRODUCT_TRACE_STORAGE_ABI,
                        functionName: 'getProductBatchComments',
                        args: [tokenId, 0n, 10n]
                    }) as any[];

                    setComments(commentsData);
                }

            } catch (error) {
                console.error('Error loading batch details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBatchDetails();
    }, [batchId]);

    const calculateAverageRating = () => {
        if (comments.length === 0) return 0;
        const sum = comments.reduce((acc, comment) => acc + comment.rating, 0);
        return (sum / comments.length).toFixed(1);
    };

    const isImageFile = (url: string): boolean => {
        const lowerUrl = url.toLowerCase();
        return lowerUrl.endsWith('.png') ||
            lowerUrl.endsWith('.jpg') ||
            lowerUrl.endsWith('.jpeg') ||
            lowerUrl.endsWith('.gif') ||
            lowerUrl.endsWith('.webp') ||
            !lowerUrl.endsWith('.pdf');
    };

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
                        <p style={{ color: '#8C95AA', fontSize: '15px' }}>Chargement des détails du lot...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!batch || !producer) {
        return (
            <div className="min-h-screen" style={{ background: '#07080B' }}>
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                    <p style={{ color: '#8C95AA', fontSize: '15px' }}>
                        Lot introuvable
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: '#07080B', color: '#F2F4F8' }}>
            <Navbar />
            <div className="container mx-auto p-6 max-w-4xl pt-28">
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
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 
                                className="text-4xl font-bold mb-2"
                                style={{
                                    fontFamily: "'Playfair Display', Georgia, serif",
                                    color: '#F2F4F8'
                                }}
                            >
                                {batch.productType}
                            </h1>
                            <p style={{ fontSize: '14px', color: '#8C95AA' }}>
                                Lot #{batch.tokenId.toString()}
                            </p>
                            {batchIPFSData?.identifier && (
                                <p style={{ fontSize: '14px', color: '#8C95AA' }}>
                                    Identifiant: {batchIPFSData.identifier}
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                Tokens disponibles
                            </p>
                            <p 
                                className="text-4xl font-bold"
                                style={{
                                    fontFamily: "'Playfair Display', Georgia, serif",
                                    color: '#C9A55A'
                                }}
                            >
                                {batch.remainingTokens.toString()}
                            </p>
                        </div>
                    </div>

                    {comments.length > 0 && (
                        <div 
                            className="flex items-center gap-2 pt-3"
                            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                        >
                            <span 
                                className="text-2xl font-bold"
                                style={{
                                    fontFamily: "'Playfair Display', Georgia, serif",
                                    color: '#C9A55A'
                                }}
                            >
                                {calculateAverageRating()}
                            </span>
                            <span style={{ color: '#C9A55A' }}>★★★★★</span>
                            <span style={{ fontSize: '14px', color: '#8C95AA' }}>
                                ({comments.length} avis)
                            </span>
                        </div>
                    )}
                </div>

                {/* Label section */}
                {batchIPFSData?.labelUri && (
                    <div 
                        className="rounded-2xl p-8 mb-8"
                        style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <h2 
                            className="text-2xl font-bold mb-5"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#F2F4F8' }}
                        >
                            Étiquette
                        </h2>
                        <div className="flex justify-center">
                            {isImageFile(batchIPFSData.labelUri) && !labelImageError ? (
                                <div className="relative">
                                    <img
                                        src={getIPFSUrl(batchIPFSData.labelUri)}
                                        alt="Étiquette du produit"
                                        className="max-w-full max-h-96 rounded-xl shadow-lg"
                                        onError={() => setLabelImageError(true)}
                                    />
                                </div>
                            ) : (
                                <a
                                    href={getIPFSUrl(batchIPFSData.labelUri)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-3 rounded-xl transition-colors"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                >
                                    <span className="text-2xl">📄</span>
                                    <span style={{ color: '#F2F4F8' }}>
                                        Voir l'étiquette (PDF)
                                    </span>
                                </a>
                            )}
                        </div>
                        <p className="font-mono text-center break-all mt-3" style={{ fontSize: '12px', color: '#8C95AA' }}>
                            {batchIPFSData.labelUri}
                        </p>
                    </div>
                )}

                <div 
                    className="rounded-2xl p-8 mb-8"
                    style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <h2 
                        className="text-2xl font-bold mb-5"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#F2F4F8' }}
                    >
                        Informations du produit
                    </h2>
                    <div className="space-y-4">
                        {batchIPFSData?.description && (
                            <div>
                                <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                    Description
                                </p>
                                <p style={{ fontSize: '15px', color: '#F2F4F8', lineHeight: 1.75 }}>
                                    {batchIPFSData.description}
                                </p>
                            </div>
                        )}
                        {batchIPFSData?.origin && (
                            <div>
                                <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                    Origine
                                </p>
                                <p style={{ fontSize: '15px', color: '#F2F4F8' }}>
                                    {batchIPFSData.origin}
                                </p>
                            </div>
                        )}
                        {batchIPFSData?.productionDate && (
                            <div>
                                <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                    Date de production
                                </p>
                                <p style={{ fontSize: '15px', color: '#F2F4F8' }}>
                                    {new Date(batchIPFSData.productionDate).toLocaleDateString('fr-FR')}
                                </p>
                            </div>
                        )}
                        {batchIPFSData?.certifications && batchIPFSData.certifications.length > 0 && (
                            <div>
                                <p className="mb-2" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                    Certifications
                                </p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {batchIPFSData.certifications.map((cert, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1.5 text-xs font-mono rounded-full"
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
                            </div>
                        )}
                        <div>
                            <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                CID Metadata (IPFS)
                            </p>
                            <p className="text-xs font-mono break-all" style={{ color: '#8C95AA' }}>
                                {batch.metadata}
                            </p>
                        </div>
                        <div>
                            <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                Merkle Root
                            </p>
                            <p className="text-xs font-mono break-all" style={{ color: '#8C95AA' }}>
                                {batch.merkleRoot}
                            </p>
                        </div>
                    </div>
                </div>

                <div 
                    className="rounded-2xl p-8 mb-8"
                    style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <div className="flex items-start gap-6 mb-4">
                        <div className="flex-1">
                            <h2 
                                className="text-2xl font-bold"
                                style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#F2F4F8' }}
                            >
                                Producteur
                            </h2>
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

                    <div className="space-y-4">
                        <div>
                            <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                Nom
                            </p>
                            <p style={{ fontSize: '15px', color: '#F2F4F8' }}>
                                {producer.name}
                            </p>
                        </div>
                        <div>
                            <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                Localisation
                            </p>
                            <p style={{ fontSize: '15px', color: '#F2F4F8' }}>
                                {producer.location}
                            </p>
                        </div>
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
                                    Contact
                                </p>
                                <p style={{ fontSize: '15px', color: '#F2F4F8' }}>
                                    {producerIPFSData.contact.email}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="mb-1" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                Adresse
                            </p>
                            <p className="text-xs font-mono break-all" style={{ color: '#8C95AA' }}>
                                {batch.producer}
                            </p>
                        </div>
                    </div>

                    <Link
                        href={`/explore/producer/${batch.producer}`}
                        className="text-right block mt-4 transition-colors"
                        style={{ fontSize: '13px', color: '#C9A55A' }}
                    >
                        Voir tous ses lots →
                    </Link>
                </div>

                {comments.length > 0 && (
                    <div 
                        className="rounded-2xl p-8 mb-8"
                        style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <h2 
                            className="text-2xl font-bold mb-5"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#F2F4F8' }}
                        >
                            Avis des consommateurs
                        </h2>
                        <div className="space-y-4">
                            {comments.map((comment, index) => (
                                <div 
                                    key={index} 
                                    className="pb-4 last:border-0"
                                    style={{ borderBottom: index < comments.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span style={{ color: '#C9A55A' }}>
                                            {'★'.repeat(comment.rating)}
                                        </span>
                                        <span className="font-mono" style={{ fontSize: '12px', color: '#8C95AA' }}>
                                            {comment.consumer.slice(0, 6)}...{comment.consumer.slice(-4)}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '14px', color: '#F2F4F8' }}>
                                        {comment.metadata}
                                    </p>
                                </div>
                            ))}
                        </div>
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
