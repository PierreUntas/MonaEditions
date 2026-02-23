'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ARTWORK_REGISTRY_ADDRESS, ARTWORK_REGISTRY_ABI, ARTWORK_TOKENIZATION_ADDRESS, ARTWORK_TOKENIZATION_ABI } from '@/config/contracts';
import { getFromIPFSGateway, getIPFSUrl } from '@/app/utils/ipfs';
import Navbar from '@/components/shared/Navbar';
import Link from 'next/link';
import { publicClient } from '@/lib/client';

interface BatchDetails {
    tokenId: bigint;
    producer: string;
    title: string;
    metadata: string;
    merkleRoot: string;
    remainingTokens: bigint;
}

// New artwork IPFS structure
interface BatchIPFSData {
    title: string;
    year: number;
    description: string;
    technique: string;
    dimensions: string;
    images: string[];
    editionSize: number;
    category: string;
}

interface ProducerInfo {
    name: string;
    location: string;
    metadata: string;
}

// New artist IPFS structure
interface ProducerIPFSData {
    name: string;
    location: string;
    website: string;
    bio: string;
    logo?: string;
    portfolio: string[];
    exhibitions: string[];
    socialMedia: {
        instagram: string;
        twitter: string;
        facebook: string;
    };
}

interface Comment {
    consumer: string;
    productBatchId: bigint;
    rating: number;
    metadata: string;
}

const ipfsToHttp = (url: string) =>
    url?.startsWith('ipfs://')
        ? `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`
        : url;

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
    const [selectedImage, setSelectedImage] = useState<number>(0);

    useEffect(() => {
        const fetchBatchDetails = async () => {
            if (!publicClient || !batchId) { setIsLoading(false); return; }

            try {
                const tokenId = BigInt(batchId);

                const batchInfo = await publicClient.readContract({
                    address: ARTWORK_REGISTRY_ADDRESS,
                    abi: ARTWORK_REGISTRY_ABI,
                    functionName: 'getArtworkEdition',
                    args: [tokenId]
                }) as any;

                const producerAddress = await publicClient.readContract({
                    address: ARTWORK_TOKENIZATION_ADDRESS,
                    abi: ARTWORK_TOKENIZATION_ABI,
                    functionName: 'tokenArtist',
                    args: [tokenId]
                }) as `0x${string}`;

                const balance = await publicClient.readContract({
                    address: ARTWORK_TOKENIZATION_ADDRESS,
                    abi: ARTWORK_TOKENIZATION_ABI,
                    functionName: 'balanceOf',
                    args: [producerAddress, tokenId]
                }) as bigint;

                let artworkTitle = 'Œuvre sans titre';
                if (batchInfo.metadata?.trim()) {
                    setIsLoadingIPFS(true);
                    try {
                        const ipfsData = await getFromIPFSGateway(batchInfo.metadata) as BatchIPFSData;
                        setBatchIPFSData(ipfsData);
                        artworkTitle = ipfsData.title || 'Œuvre sans titre';
                    } catch (error) {
                        console.error('Error loading batch IPFS data:', error);
                    } finally {
                        setIsLoadingIPFS(false);
                    }
                }

                setBatch({ tokenId, producer: producerAddress, title: artworkTitle, metadata: batchInfo.metadata, merkleRoot: batchInfo.merkleRoot, remainingTokens: balance });

                const artistData = await publicClient.readContract({
                    address: ARTWORK_REGISTRY_ADDRESS,
                    abi: ARTWORK_REGISTRY_ABI,
                    functionName: 'getArtist',
                    args: [producerAddress]
                }) as any;

                let artistName = 'Artiste anonyme';
                let artistLocation = '';
                if (artistData.metadata?.trim()) {
                    try {
                        const artistIpfsData = await getFromIPFSGateway(artistData.metadata) as ProducerIPFSData;
                        setProducerIPFSData(artistIpfsData);
                        artistName = artistIpfsData.name || 'Artiste anonyme';
                        artistLocation = artistIpfsData.location || '';
                    } catch (error) {
                        console.error('Error loading artist IPFS data:', error);
                    }
                }

                setProducer({ name: artistName, location: artistLocation, metadata: artistData.metadata });

                const commentsCount = await publicClient.readContract({
                    address: ARTWORK_REGISTRY_ADDRESS,
                    abi: ARTWORK_REGISTRY_ABI,
                    functionName: 'getEditionReviewsCount',
                    args: [tokenId]
                }) as bigint;

                if (commentsCount > 0n) {
                    const commentsData = await publicClient.readContract({
                        address: ARTWORK_REGISTRY_ADDRESS,
                        abi: ARTWORK_REGISTRY_ABI,
                        functionName: 'getEditionReviews',
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
        return (comments.reduce((acc, c) => acc + c.rating, 0) / comments.length).toFixed(1);
    };

    if (isLoading) return (
        <div className="min-h-screen bg-[#f5f3ef]">
            <Navbar />
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-4">
                <div className="w-8 h-8 border border-[#d6d0c8] border-t-[#1c1917] rounded-full animate-spin" />
                <p className="text-[13px] font-light text-[#a8a29e] tracking-[0.06em]">Chargement des détails de l'œuvre…</p>
            </div>
        </div>
    );

    if (!batch || !producer) return (
        <div className="min-h-screen bg-[#f5f3ef]">
            <Navbar />
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                <p className="font-serif italic text-[22px] text-[#a8a29e]">Œuvre introuvable</p>
            </div>
        </div>
    );

    const images = batchIPFSData?.images ?? [];

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

                {/* Header */}
                <div className="border border-[#d6d0c8] bg-[#fafaf8] mb-px p-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            {batchIPFSData?.category && (
                                <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-[#a8a29e] border border-[#d6d0c8] px-2 py-0.5 mb-3 inline-block">
                                    {batchIPFSData.category}
                                </span>
                            )}
                            <h1 className="font-serif text-[clamp(32px,5vw,42px)] font-normal tracking-[-1px] text-[#1c1917] leading-tight mb-1">
                                {batch.title}
                            </h1>
                            <p className="text-[14px] text-[#78716c]">Œuvre #{batch.tokenId.toString()}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-6">
                            <p className="mb-1 text-[12px] text-[#a8a29e]">Exemplaires</p>
                            <p className="font-serif text-4xl font-normal text-[#1c1917]">
                                {batch.remainingTokens.toString()}
                            </p>
                            {batchIPFSData?.editionSize && (
                                <p className="text-[11px] text-[#a8a29e]">/ {batchIPFSData.editionSize}</p>
                            )}
                        </div>
                    </div>
                    {comments.length > 0 && (
                        <div className="flex items-center gap-2 pt-3 border-t border-[#e7e3dc]">
                            <span className="font-serif text-2xl font-normal text-[#1c1917]">{calculateAverageRating()}</span>
                            <span className="text-[#1c1917]">★★★★★</span>
                            <span className="text-[14px] text-[#78716c]">({comments.length} avis)</span>
                        </div>
                    )}
                </div>

                {/* Image gallery */}
                {images.length > 0 && (
                    <div className="border border-[#d6d0c8] bg-[#fafaf8] mb-px p-8">
                        <h2 className="font-serif text-[22px] font-normal text-[#1c1917] mb-5">
                            Images de l'<em className="italic text-[#78716c]">œuvre</em>
                        </h2>
                        {/* Main image */}
                        <div className="w-full aspect-[4/3] overflow-hidden bg-[#e7e3dc] border border-[#d6d0c8] mb-3">
                            <img
                                src={ipfsToHttp(images[selectedImage])}
                                alt={`${batch.title} — image ${selectedImage + 1}`}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-2 flex-wrap">
                                {images.map((img, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setSelectedImage(i)}
                                        className={`w-16 h-16 overflow-hidden border transition-all duration-200 ${
                                            selectedImage === i
                                                ? 'border-[#1c1917]'
                                                : 'border-[#d6d0c8] opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <img src={ipfsToHttp(img)} alt={`Miniature ${i + 1}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Artwork details */}
                <div className="border border-[#d6d0c8] bg-[#fafaf8] mb-px p-8">
                    <h2 className="font-serif text-[22px] font-normal text-[#1c1917] mb-5">
                        Informations de l'<em className="italic text-[#78716c]">œuvre</em>
                    </h2>
                    <div className="space-y-4">
                        {batchIPFSData?.description && (
                            <InfoBlock label="Description">
                                <p className="text-[15px] text-[#1c1917] leading-[1.75]">{batchIPFSData.description}</p>
                            </InfoBlock>
                        )}
                        {batchIPFSData?.year && (
                            <InfoBlock label="Année">
                                <p className="text-[15px] text-[#1c1917]">{batchIPFSData.year}</p>
                            </InfoBlock>
                        )}
                        {batchIPFSData?.technique && (
                            <InfoBlock label="Technique">
                                <p className="text-[15px] text-[#1c1917]">{batchIPFSData.technique}</p>
                            </InfoBlock>
                        )}
                        {batchIPFSData?.dimensions && (
                            <InfoBlock label="Dimensions">
                                <p className="text-[15px] text-[#1c1917]">{batchIPFSData.dimensions}</p>
                            </InfoBlock>
                        )}
                        {batchIPFSData?.editionSize && (
                            <InfoBlock label="Taille de l'édition">
                                <p className="text-[15px] text-[#1c1917]">{batchIPFSData.editionSize} exemplaires</p>
                            </InfoBlock>
                        )}
                        <InfoBlock label="CID Metadata (IPFS)" noBorder>
                            <p className="text-[11px] font-mono break-all text-[#a8a29e]">{batch.metadata}</p>
                        </InfoBlock>
                        <div>
                            <p className="mb-1 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">Merkle Root</p>
                            <p className="text-[11px] font-mono break-all text-[#a8a29e]">{batch.merkleRoot}</p>
                        </div>
                    </div>
                </div>

                {/* Artist section */}
                <div className="border border-[#d6d0c8] bg-[#fafaf8] mb-px p-8">
                    <div className="flex items-start gap-6 mb-6 pb-6 border-b border-[#e7e3dc]">
                        <h2 className="font-serif text-[22px] font-normal text-[#1c1917] flex-1">
                            L'<em className="italic text-[#78716c]">artiste</em>
                        </h2>
                        {producerIPFSData?.logo && (
                            <img
                                src={ipfsToHttp(producerIPFSData.logo)}
                                alt={`Logo ${producer.name}`}
                                className="w-20 h-20 object-contain flex-shrink-0 border border-[#d6d0c8] bg-[#f5f3ef]"
                            />
                        )}
                    </div>

                    <div className="space-y-4">
                        <InfoBlock label="Nom">
                            <p className="text-[15px] text-[#1c1917]">{producer.name}</p>
                        </InfoBlock>
                        <InfoBlock label="Localisation">
                            <p className="text-[15px] text-[#1c1917]">{producer.location}</p>
                        </InfoBlock>
                        {producerIPFSData?.bio && (
                            <InfoBlock label="Biographie">
                                <p className="text-[15px] text-[#1c1917] leading-[1.75]">{producerIPFSData.bio}</p>
                            </InfoBlock>
                        )}
                        {producerIPFSData?.website && (
                            <InfoBlock label="Site web">
                                <a
                                    href={producerIPFSData.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[14px] text-[#4a5240] underline underline-offset-2 hover:opacity-70 transition-opacity"
                                >
                                    {producerIPFSData.website}
                                </a>
                            </InfoBlock>
                        )}
                        {producerIPFSData?.socialMedia && (producerIPFSData.socialMedia.instagram || producerIPFSData.socialMedia.twitter || producerIPFSData.socialMedia.facebook) && (
                            <InfoBlock label="Réseaux sociaux">
                                <div className="flex flex-col gap-1">
                                    {producerIPFSData.socialMedia.instagram && (
                                        <a href={`https://instagram.com/${producerIPFSData.socialMedia.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[#4a5240] underline underline-offset-2 hover:opacity-70 transition-opacity">
                                            Instagram · {producerIPFSData.socialMedia.instagram}
                                        </a>
                                    )}
                                    {producerIPFSData.socialMedia.twitter && (
                                        <a href={`https://x.com/${producerIPFSData.socialMedia.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[#4a5240] underline underline-offset-2 hover:opacity-70 transition-opacity">
                                            Twitter / X · {producerIPFSData.socialMedia.twitter}
                                        </a>
                                    )}
                                    {producerIPFSData.socialMedia.facebook && (
                                        <a href={producerIPFSData.socialMedia.facebook.startsWith('http') ? producerIPFSData.socialMedia.facebook : `https://facebook.com/${producerIPFSData.socialMedia.facebook.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[#4a5240] underline underline-offset-2 hover:opacity-70 transition-opacity">
                                            Facebook · {producerIPFSData.socialMedia.facebook}
                                        </a>
                                    )}
                                </div>
                            </InfoBlock>
                        )}
                        <div>
                            <p className="mb-1 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">Adresse Ethereum</p>
                            <p className="text-[11px] font-mono break-all text-[#a8a29e]">{batch.producer}</p>
                        </div>
                    </div>

                    <Link
                        href={`/explore/producer/${batch.producer}`}
                        className="text-right block mt-6 text-[13px] text-[#4a5240] hover:text-[#1c1917] underline underline-offset-2 transition-colors"
                    >
                        Voir toutes ses œuvres →
                    </Link>
                </div>

                {/* Reviews */}
                {comments.length > 0 && (
                    <div className="border border-[#d6d0c8] bg-[#fafaf8] mb-px p-8">
                        <h2 className="font-serif text-[22px] font-normal text-[#1c1917] mb-5">
                            Avis des <em className="italic text-[#78716c]">collectionneurs</em>
                        </h2>
                        <div className="space-y-4">
                            {comments.map((comment, index) => (
                                <div
                                    key={index}
                                    className={index < comments.length - 1 ? 'pb-4 border-b border-[#e7e3dc]' : 'pb-4'}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[#1c1917]">{'★'.repeat(comment.rating)}</span>
                                        <span className="font-mono text-[12px] text-[#a8a29e]">
                                            {comment.consumer.slice(0, 6)}…{comment.consumer.slice(-4)}
                                        </span>
                                    </div>
                                    <p className="text-[14px] text-[#1c1917] leading-[1.75]">{comment.metadata}</p>
                                </div>
                            ))}
                        </div>
                    </div>
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

function InfoBlock({ label, children, noBorder }: { label: string; children: React.ReactNode; noBorder?: boolean }) {
    return (
        <div className={noBorder ? '' : 'pb-4 border-b border-[#e7e3dc]'}>
            <p className="mb-1 text-[12px] text-[#a8a29e] uppercase tracking-[0.12em]">{label}</p>
            {children}
        </div>
    );
}