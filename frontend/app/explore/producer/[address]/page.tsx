'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PRODUCT_TRACE_STORAGE_ADDRESS, PRODUCT_TRACE_STORAGE_ABI, PRODUCT_TOKENIZATION_ADDRESS, PRODUCT_TOKENIZATION_ABI } from '@/config/contracts';
import { getFromIPFSGateway, getIPFSUrl } from '@/app/utils/ipfs';
import Navbar from '@/components/shared/Navbar';
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
    contact: { email: string; telephone: string; adresseCourrier: string; };
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

const ipfsToHttp = (url: string) =>
    url?.startsWith('ipfs://')
        ? `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`
        : url;

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
            if (!publicClient || !producerAddress) { setIsLoading(false); return; }
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

                if (producerData.metadata?.trim()) {
                    setIsLoadingIPFS(true);
                    try {
                        setProducerIPFSData(await getFromIPFSGateway(producerData.metadata));
                    } catch (e) {
                        console.error('Error loading producer IPFS data:', e);
                    } finally {
                        setIsLoadingIPFS(false);
                    }
                }

                const logs = await publicClient.getLogs({
                    address: PRODUCT_TRACE_STORAGE_ADDRESS,
                    event: parseAbiItem('event NewProductBatch(address indexed producer, uint indexed productBatchId)'),
                    args: { producer: producerAddress as `0x${string}` },
                    fromBlock: 9753823n,
                    toBlock: 'latest'
                });

                const batchesData: BatchInfo[] = [];
                for (const log of logs) {
                    const tokenId = log.args.productBatchId as bigint;
                    const [batchInfo, balance] = await Promise.all([
                        publicClient.readContract({ address: PRODUCT_TRACE_STORAGE_ADDRESS, abi: PRODUCT_TRACE_STORAGE_ABI, functionName: 'getProductBatch', args: [tokenId] }) as Promise<any>,
                        publicClient.readContract({ address: PRODUCT_TOKENIZATION_ADDRESS, abi: PRODUCT_TOKENIZATION_ABI, functionName: 'balanceOf', args: [producerAddress as `0x${string}`, tokenId] }) as Promise<bigint>
                    ]);
                    batchesData.push({ tokenId, productType: batchInfo.productType, metadata: batchInfo.metadata, remainingTokens: balance });
                }

                batchesData.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
                setBatches(batchesData);

                for (const batch of batchesData) {
                    const count = await publicClient.readContract({ address: PRODUCT_TRACE_STORAGE_ADDRESS, abi: PRODUCT_TRACE_STORAGE_ABI, functionName: 'getProductBatchCommentsCount', args: [batch.tokenId] }) as bigint;
                    let avgRating = 0;
                    if (count > 0n) {
                        const comments = await publicClient.readContract({ address: PRODUCT_TRACE_STORAGE_ADDRESS, abi: PRODUCT_TRACE_STORAGE_ABI, functionName: 'getProductBatchComments', args: [batch.tokenId, 0n, count] }) as any[];
                        avgRating = comments.reduce((a: number, c: any) => a + Number(c.rating), 0) / comments.length;
                    }
                    if (batch.metadata?.trim()) {
                        try {
                            const ipfs = await getFromIPFSGateway(batch.metadata);
                            setBatches(prev => prev.map(b => b.tokenId === batch.tokenId ? { ...b, ipfsData: ipfs, averageRating: avgRating, commentsCount: Number(count) } : b));
                        } catch {
                            setBatches(prev => prev.map(b => b.tokenId === batch.tokenId ? { ...b, averageRating: avgRating, commentsCount: Number(count) } : b));
                        }
                    } else {
                        setBatches(prev => prev.map(b => b.tokenId === batch.tokenId ? { ...b, averageRating: avgRating, commentsCount: Number(count) } : b));
                    }
                }
            } catch (e) {
                console.error('Error loading producer details:', e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducerDetails();
    }, [producerAddress]);

    // Loading state
    if (isLoading) return (
        <div className="min-h-screen bg-[#f5f3ef]">
            <Navbar />
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-4">
                <div className="w-8 h-8 border border-[#d6d0c8] border-t-[#1c1917] rounded-full animate-spin" />
                <p className="text-[13px] font-light text-[#a8a29e] tracking-[0.06em]">Chargement du profil…</p>
            </div>
        </div>
    );

    // Not found state
    if (!producer) return (
        <div className="min-h-screen bg-[#f5f3ef]">
            <Navbar />
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                <p className="font-serif italic text-[22px] text-[#a8a29e]">Artiste introuvable</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f5f3ef]">
            <Navbar />
            <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">

                {/* Back */}
                <Link
                    href="/explore/producers"
                    className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.06em] text-[#78716c]
                        border border-[#d6d0c8] px-4 py-2 mb-12 no-underline
                        hover:border-[#1c1917] hover:text-[#1c1917] transition-all duration-200"
                >
                    ← Retour aux artistes
                </Link>

                {isLoadingIPFS && (
                    <p className="text-[12px] font-light text-[#a8a29e] tracking-[0.06em] mb-6">
                        Chargement des données IPFS…
                    </p>
                )}

                {/* Artist header */}
                <div className="border border-[#d6d0c8] bg-[#fafaf8] mb-px">

                    {/* Hero photo */}
                    {producerIPFSData?.photos?.[0] && (
                        <div className="w-full aspect-[21/9] overflow-hidden bg-[#e7e3dc]">
                            <img
                                src={ipfsToHttp(producerIPFSData.photos[0])}
                                alt={producer.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <div className="p-8">
                        {/* Name + logo */}
                        <div className="flex items-start justify-between gap-6 mb-8 pb-8 border-b border-[#e7e3dc]">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-6 h-px bg-[#d6d0c8]" />
                                    <span className="text-[11px] font-medium tracking-[0.15em] uppercase text-[#a8a29e]">
                                        Artiste certifié
                                    </span>
                                </div>
                                <h1 className="font-serif text-[clamp(32px,5vw,52px)] font-normal tracking-[-1px] text-[#1c1917] leading-tight mb-2">
                                    {producer.name}
                                </h1>
                                <p className="text-[14px] font-light text-[#78716c]">{producer.location}</p>
                            </div>
                            {producerIPFSData?.logo && (
                                <img
                                    src={ipfsToHttp(producerIPFSData.logo)}
                                    alt={`Logo ${producer.name}`}
                                    className="w-20 h-20 object-contain flex-shrink-0 border border-[#e7e3dc] bg-[#f5f3ef]"
                                />
                            )}
                        </div>

                        {/* Info grid */}
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Left */}
                            <div className="flex flex-col gap-5">
                                {producerIPFSData?.description && (
                                    <div>
                                        <Label>À propos</Label>
                                        <p className="text-[14px] font-light text-[#1c1917] leading-[1.8]">
                                            {producerIPFSData.description}
                                        </p>
                                    </div>
                                )}
                                {producerIPFSData?.labelsCertifications && producerIPFSData.labelsCertifications.length > 0 && (
                                    <div>
                                        <Label>Certifications</Label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {producerIPFSData.labelsCertifications.map((c, i) => (
                                                <span key={i} className="text-[10px] font-mono text-[#78716c] border border-[#d6d0c8] px-2 py-0.5 bg-[#f5f3ef]">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right */}
                            <div className="flex flex-col gap-4">
                                <InfoRow label="Localisation" value={producer.location} />
                                {producer.companyRegisterNumber && (
                                    <InfoRow label="N° d'immatriculation" value={producer.companyRegisterNumber} />
                                )}
                                {producerIPFSData?.anneeCreation && (
                                    <InfoRow label="Actif depuis" value={`${producerIPFSData.anneeCreation}`} />
                                )}
                                {producerIPFSData?.contact?.email && (
                                    <InfoRow label="Email" value={producerIPFSData.contact.email} />
                                )}
                                {producerIPFSData?.contact?.telephone && (
                                    <InfoRow label="Téléphone" value={producerIPFSData.contact.telephone} />
                                )}
                                {producerIPFSData?.siteWeb && (
                                    <div>
                                        <Label>Site web</Label>
                                        <a
                                            href={producerIPFSData.siteWeb}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[13px] font-light text-[#4a5240] underline underline-offset-2 hover:opacity-70 transition-opacity"
                                        >
                                            {producerIPFSData.siteWeb}
                                        </a>
                                    </div>
                                )}
                                <div>
                                    <Label>Adresse Ethereum</Label>
                                    <p className="text-[11px] font-mono text-[#a8a29e] break-all">{producerAddress}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Photo gallery */}
                {producerIPFSData?.photos && producerIPFSData.photos.length > 1 && (
                    <div className="border border-[#d6d0c8] border-t-0 bg-[#fafaf8] p-8 mb-px">
                        <h2 className="font-serif text-[22px] font-normal text-[#1c1917] mb-6">
                            Galerie <em className="italic text-[#78716c]">photos</em>
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[#d6d0c8] border border-[#d6d0c8]">
                            {producerIPFSData.photos.slice(1).map((photo, i) => (
                                <div key={i} className="aspect-square overflow-hidden bg-[#e7e3dc]">
                                    <img
                                        src={ipfsToHttp(photo)}
                                        alt={`Photo ${i + 2} — ${producer.name}`}
                                        className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Works section */}
                <div className="mt-16 mb-8">
                    <div className="flex items-end justify-between border-b border-[#d6d0c8] pb-6 mb-0">
                        <h2 className="font-serif text-[clamp(24px,3vw,36px)] font-normal tracking-[-0.5px] text-[#1c1917]">
                            Œuvres <em className="italic text-[#78716c]">certifiées</em>
                        </h2>
                        <span className="font-serif italic text-[36px] text-[#e7e3dc] leading-none">
                            {batches.length}
                        </span>
                    </div>
                </div>

                {batches.length === 0 ? (
                    <div className="border border-[#d6d0c8] bg-[#fafaf8] p-12 text-center">
                        <p className="font-serif italic text-[18px] text-[#a8a29e]">
                            Cet artiste n'a pas encore certifié d'œuvre.
                        </p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#d6d0c8] border border-[#d6d0c8]">
                        {batches.map((batch) => (
                            <Link
                                key={batch.tokenId.toString()}
                                href={`/explore/batch/${batch.tokenId}`}
                                className="bg-[#fafaf8] p-5 flex flex-col gap-3 hover:bg-[#f5f3ef] transition-colors duration-200 no-underline group"
                            >
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
                                        <span className="font-serif italic text-[36px] text-[#d6d0c8]">起</span>
                                    </div>
                                )}

                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        {batch.ipfsData?.identifier && (
                                            <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-[#a8a29e] mb-1">
                                                {batch.ipfsData.identifier}
                                            </p>
                                        )}
                                        <h3 className="font-serif text-[17px] font-normal text-[#1c1917] leading-tight">
                                            {batch.productType}
                                        </h3>
                                    </div>
                                    <span className="text-[9px] font-medium tracking-[0.1em] uppercase text-[#4a5240] border border-[#4a5240] px-1.5 py-0.5 flex-shrink-0 mt-1">
                                        Certifié
                                    </span>
                                </div>

                                {batch.ipfsData?.origin && (
                                    <p className="text-[12px] font-light text-[#78716c]">{batch.ipfsData.origin}</p>
                                )}

                                {batch.ipfsData?.productionDate && (
                                    <p className="text-[11px] font-light text-[#a8a29e]">
                                        {new Date(batch.ipfsData.productionDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
                                    </p>
                                )}

                                {batch.ipfsData?.certifications && batch.ipfsData.certifications.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {batch.ipfsData.certifications.map((c, i) => (
                                            <span key={i} className="text-[10px] font-mono text-[#78716c] border border-[#d6d0c8] px-1.5 py-0.5 bg-[#f5f3ef]">
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {batch.commentsCount !== undefined && batch.commentsCount > 0 && (
                                    <p className="text-[12px] font-light text-[#78716c]">
                                        {batch.averageRating?.toFixed(1)} · {batch.commentsCount} avis vérifié{batch.commentsCount > 1 ? 's' : ''}
                                    </p>
                                )}

                                <div className="border-t border-[#e7e3dc] pt-3 flex items-center justify-between">
                                    <p className="text-[10px] font-mono text-[#a8a29e]">
                                        #{batch.tokenId.toString()}
                                    </p>
                                    <p className="text-[12px] font-light text-[#78716c]">
                                        {batch.remainingTokens.toString()} exemplaire{Number(batch.remainingTokens) > 1 ? 's' : ''}
                                    </p>
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

function Label({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[9px] font-medium tracking-[0.12em] uppercase text-[#a8a29e] mb-2">{children}</p>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1 pb-4 border-b border-[#f0ede8]">
            <Label>{label}</Label>
            <p className="text-[13px] font-light text-[#1c1917]">{value}</p>
        </div>
    );
}