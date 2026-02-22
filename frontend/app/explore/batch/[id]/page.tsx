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
            <div className="min-h-screen bg-[#f5f3ef]">
                <Navbar />
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-4">
                    <div className="w-8 h-8 border border-[#d6d0c8] border-t-[#1c1917] rounded-full animate-spin" />
                    <p className="text-[13px] font-light text-[#a8a29e] tracking-[0.06em]">Chargement des détails de l'œuvre…</p>
                </div>
            </div>
        );
    }

    if (!batch || !producer) {
        return (
            <div className="min-h-screen bg-[#f5f3ef]">
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                    <p className="font-serif italic text-[22px] text-[#a8a29e]">
                        Œuvre introuvable
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f3ef]">
            <Navbar />
            <div className="max-w-4xl mx-auto px-6 pt-28 pb-20">
                <Link
                    href="/explore/batches"
                    className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.06em] text-[#78716c]
                        border border-[#d6d0c8] px-4 py-2 mb-12 no-underline
                        hover:border-[#1c1917] hover:text-[#1c1917] transition-all duration-200"
                >
                    ← Retour à l'exploration
                </Link>

                {isLoadingIPFS && (
                    <p className="text-[12px] font-light text-[#a8a29e] tracking-[0.06em] mb-6 text-center">
                        Chargement des données IPFS…
                    </p>
                )}

                <div className="border border-[#d6d0c8] bg-[#fafaf8] mb-px p-8"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="font-serif text-[clamp(32px,5vw,42px)] font-normal tracking-[-1px] text-[#1c1917] leading-tight mb-2">
                                {batch.productType}
                            </h1>
                            <p className="text-[14px] text-[#78716c]">
                                Œuvre #{batch.tokenId.toString()}
                            </p>
                            {batchIPFSData?.identifier && (
                                <p className="text-[14px] text-[#78716c]">
                                    Identifiant: {batchIPFSData.identifier}
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="mb-1 text-[12px] text-[#a8a29e]">
                                Exemplaires disponibles
                            </p>
                            <p className="font-serif text-4xl font-normal text-[#1c1917]">
                                {batch.remainingTokens.toString()}
                            </p>
                        </div>
                    </div>

                    {comments.length > 0 && (
                        <div className="flex items-center gap-2 pt-3 border-t border-[#e7e3dc]">
                            <span className="font-serif text-2xl font-normal text-[#1c1917]">
                                {calculateAverageRating()}
                            </span>
                            <span className="text-[#1c1917]">★★★★★</span>
                            <span className="text-[14px] text-[#78716c]">
                                ({comments.length} avis)
                            </span>
                        </div>
                    )}
                </div>

                {/* Label section */}
                {batchIPFSData?.labelUri && (
                    <div className="border border-[#d6d0c8] bg-[#fafaf8] mb-px p-8">
                        <h2 className="font-serif text-[22px] font-normal text-[#1c1917] mb-5">
                            Visuel de l'<em className="italic text-[#78716c]">œuvre</em>
                        </h2>
                        <div className="flex justify-center">
                            {isImageFile(batchIPFSData.labelUri) && !labelImageError ? (
                                <div className="relative border border-[#d6d0c8] bg-[#e7e3dc] overflow-hidden">
                                    <img
                                        src={getIPFSUrl(batchIPFSData.labelUri)}
                                        alt="Visuel de l'œuvre"
                                        className="max-w-full max-h-96"
                                        onError={() => setLabelImageError(true)}
                                    />
                                </div>
                            ) : (
                                <a
                                    href={getIPFSUrl(batchIPFSData.labelUri)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-3 border border-[#d6d0c8] bg-[#f5f3ef] transition-colors hover:bg-[#e7e3dc] no-underline"
                                >
                                    <span className="text-2xl">📄</span>
                                    <span className="text-[#1c1917]">
                                        Voir le document (PDF)
                                    </span>
                                </a>
                            )}
                        </div>
                        <p className="font-mono text-center break-all mt-3 text-[12px] text-[#a8a29e]">
                            {batchIPFSData.labelUri}
                        </p>
                    </div>
                )}

                <div className="border border-[#d6d0c8] bg-[#fafaf8] mb-px p-8">
                    <h2 className="font-serif text-[22px] font-normal text-[#1c1917] mb-5">
                        Informations de l'<em className="italic text-[#78716c]">œuvre</em>
                    </h2>
                    <div className="space-y-4">
                        {batchIPFSData?.description && (
                            <div className="pb-4 border-b border-[#e7e3dc]">
                                <p className="mb-1 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">
                                    Description
                                </p>
                                <p className="text-[15px] text-[#1c1917] leading-[1.75]">
                                    {batchIPFSData.description}
                                </p>
                            </div>
                        )}
                        {batchIPFSData?.origin && (
                            <div className="pb-4 border-b border-[#e7e3dc]">
                                <p className="mb-1 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">
                                    Origine
                                </p>
                                <p className="text-[15px] text-[#1c1917]">
                                    {batchIPFSData.origin}
                                </p>
                            </div>
                        )}
                        {batchIPFSData?.productionDate && (
                            <div className="pb-4 border-b border-[#e7e3dc]">
                                <p className="mb-1 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">
                                    Date de création
                                </p>
                                <p className="text-[15px] text-[#1c1917]">
                                    {new Date(batchIPFSData.productionDate).toLocaleDateString('fr-FR')}
                                </p>
                            </div>
                        )}
                        {batchIPFSData?.certifications && batchIPFSData.certifications.length > 0 && (
                            <div className="pb-4 border-b border-[#e7e3dc]">
                                <p className="mb-2 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">
                                    Certifications
                                </p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {batchIPFSData.certifications.map((cert, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 text-[11px] font-mono border border-[#d6d0c8] bg-[#f5f3ef] text-[#78716c]"
                                        >
                                            {cert}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="pb-4 border-b border-[#e7e3dc]">
                            <p className="mb-1 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">
                                CID Metadata (IPFS)
                            </p>
                            <p className="text-[11px] font-mono break-all text-[#a8a29e]">
                                {batch.metadata}
                            </p>
                        </div>
                        <div>
                            <p className="mb-1 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">
                                Merkle Root
                            </p>
                            <p className="text-[11px] font-mono break-all text-[#a8a29e]">
                                {batch.merkleRoot}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="border border-[#d6d0c8] bg-[#fafaf8] mb-px p-8">
                    <div className="flex items-start gap-6 mb-6 pb-6 border-b border-[#e7e3dc]">
                        <div className="flex-1">
                            <h2 className="font-serif text-[22px] font-normal text-[#1c1917]">
                                L'<em className="italic text-[#78716c]">artiste</em>
                            </h2>
                        </div>
                        {producerIPFSData?.logo && (
                            <div className="flex-shrink-0">
                                <img
                                    src={producerIPFSData.logo.startsWith('ipfs://')
                                        ? `https://ipfs.io/ipfs/${producerIPFSData.logo.replace('ipfs://', '')}`
                                        : producerIPFSData.logo}
                                    alt={`Logo ${producer.name}`}
                                    className="w-24 h-24 object-contain border border-[#d6d0c8] bg-[#f5f3ef]"
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="pb-4 border-b border-[#e7e3dc]">
                            <p className="mb-1 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">
                                Nom
                            </p>
                            <p className="text-[15px] text-[#1c1917]">
                                {producer.name}
                            </p>
                        </div>
                        <div className="pb-4 border-b border-[#e7e3dc]">
                            <p className="mb-1 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">
                                Localisation
                            </p>
                            <p className="text-[15px] text-[#1c1917]">
                                {producer.location}
                            </p>
                        </div>
                        {producerIPFSData?.description && (
                            <div className="pb-4 border-b border-[#e7e3dc]">
                                <p className="mb-1 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">
                                    Description
                                </p>
                                <p className="text-[15px] text-[#1c1917] leading-[1.75]">
                                    {producerIPFSData.description}
                                </p>
                            </div>
                        )}
                        {producerIPFSData?.contact?.email && (
                            <div className="pb-4 border-b border-[#e7e3dc]">
                                <p className="mb-1 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">
                                    Contact
                                </p>
                                <p className="text-[15px] text-[#1c1917]">
                                    {producerIPFSData.contact.email}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="mb-1 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">
                                Adresse Ethereum
                            </p>
                            <p className="text-[11px] font-mono break-all text-[#a8a29e]">
                                {batch.producer}
                            </p>
                        </div>
                    </div>

                    <Link
                        href={`/explore/producer/${batch.producer}`}
                        className="text-right block mt-6 transition-colors text-[13px] text-[#4a5240] hover:text-[#1c1917] underline underline-offset-2"
                    >
                        Voir toutes ses œuvres →
                    </Link>
                </div>

                {comments.length > 0 && (
                    <div className="border border-[#d6d0c8] bg-[#fafaf8] mb-px p-8">
                        <h2 className="font-serif text-[22px] font-normal text-[#1c1917] mb-5">
                            Avis des <em className="italic text-[#78716c]">collectionneurs</em>
                        </h2>
                        <div className="space-y-4">
                            {comments.map((comment, index) => (
                                <div 
                                    key={index} 
                                    className="pb-4 last:border-0"
                                    style={{ borderBottom: index < comments.length - 1 ? '1px solid #e7e3dc' : 'none' }}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[#1c1917]">
                                            {'★'.repeat(comment.rating)}
                                        </span>
                                        <span className="font-mono text-[12px] text-[#a8a29e]">
                                            {comment.consumer.slice(0, 6)}...{comment.consumer.slice(-4)}
                                        </span>
                                    </div>
                                    <p className="text-[14px] text-[#1c1917] leading-[1.75]">
                                        {comment.metadata}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
