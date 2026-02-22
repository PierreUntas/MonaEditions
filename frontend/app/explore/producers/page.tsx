'use client';

import { useState, useEffect } from 'react';
import { PRODUCT_TRACE_STORAGE_ADDRESS, PRODUCT_TRACE_STORAGE_ABI } from '@/config/contracts';
import { getFromIPFSGateway } from '@/app/utils/ipfs';
import Navbar from '@/components/shared/Navbar';
import Image from 'next/image';
import Link from 'next/link';
import { parseAbiItem } from 'viem';
import { publicClient } from '@/lib/client';

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

interface ProducerInfo {
    address: string;
    name: string;
    location: string;
    companyRegisterNumber: string;
    metadata: string;
    ipfsData?: ProducerIPFSData;
    batchCount: number;
}

export default function ProducersPage() {
    const [producers, setProducers] = useState<ProducerInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingIPFS, setIsLoadingIPFS] = useState(false);
    const [filterProducer, setFilterProducer] = useState<string>('all');

    useEffect(() => {
        const fetchAllProducers = async () => {
            if (!publicClient) {
                setIsLoading(false);
                return;
            }

            try {
                // Récupérer tous les événements ProducerInfoUpdated
                const logs = await publicClient.getLogs({
                    address: PRODUCT_TRACE_STORAGE_ADDRESS,
                    event: parseAbiItem('event ProducerInfoUpdated(address indexed producer)'),
                    fromBlock: 9753823n,
                    toBlock: 'latest'
                });

                // Extraire les adresses uniques
                const uniqueAddresses = Array.from(new Set(logs.map(log => log.args.producer as string)));

                // Récupérer toutes les données des producteurs en parallèle
                const producersPromises = uniqueAddresses.map(async (producerAddress) => {
                    const [producerData, batchLogs] = await Promise.all([
                        publicClient.readContract({
                            address: PRODUCT_TRACE_STORAGE_ADDRESS,
                            abi: PRODUCT_TRACE_STORAGE_ABI,
                            functionName: 'getProducer',
                            args: [producerAddress as `0x${string}`]
                        }) as Promise<any>,
                        publicClient.getLogs({
                            address: PRODUCT_TRACE_STORAGE_ADDRESS,
                            event: parseAbiItem('event NewProductBatch(address indexed producer, uint indexed productBatchId)'),
                            args: {
                                producer: producerAddress as `0x${string}`
                            },
                            fromBlock: 9753823n,
                            toBlock: 'latest'
                        })
                    ]);

                    return {
                        address: producerAddress,
                        name: producerData.name || 'Producteur anonyme',
                        location: producerData.location || 'Non spécifié',
                        companyRegisterNumber: producerData.companyRegisterNumber || '',
                        metadata: producerData.metadata || '',
                        batchCount: batchLogs.length
                    };
                });

                const producersData = await Promise.all(producersPromises);

                // Filtrer les producteurs qui ont un nom
                const validProducers = producersData.filter(p => p.name && p.name !== 'Producteur anonyme');

                // Trier par nom (alphabétique)
                validProducers.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

                setProducers(validProducers);
                setIsLoading(false);

                // Charger les données IPFS en parallèle
                setIsLoadingIPFS(true);
                const ipfsPromises = validProducers.map(async (producer) => {
                    if (!producer.metadata || producer.metadata.trim() === '') return null;

                    try {
                        const ipfsData = await getFromIPFSGateway(producer.metadata);
                        return { address: producer.address, ipfsData };
                    } catch (error) {
                        console.error(`Error loading IPFS data for producer ${producer.address}:`, error);
                        return null;
                    }
                });

                const ipfsResults = await Promise.all(ipfsPromises);

                // Mettre à jour les producteurs avec leurs données IPFS
                setProducers(prev => {
                    const updated = [...prev];
                    ipfsResults.forEach(result => {
                        if (result) {
                            const index = updated.findIndex(p => p.address === result.address);
                            if (index !== -1) {
                                updated[index] = { ...updated[index], ipfsData: result.ipfsData };
                            }
                        }
                    });
                    return updated;
                });

                setIsLoadingIPFS(false);

            } catch (error) {
                console.error('Error loading producers:', error);
                setIsLoading(false);
            }
        };

        fetchAllProducers();
    }, []);

    const filteredProducers = filterProducer === 'all'
        ? producers
        : producers.filter(p => p.name === filterProducer);

    return (
        <div className="min-h-screen" style={{ background: '#07080B', color: '#F2F4F8' }}>
            <Navbar />
            <div className="container mx-auto p-6 max-w-6xl pt-28">
                {/* Header */}
                <div className="text-center mb-12">
                    <p
                        className="text-xs tracking-[5px] uppercase mb-4"
                        style={{ color: '#C9A55A' }}
                    >
                        Explorer
                    </p>
                    <h1
                        className="text-5xl font-bold mb-4"
                        style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                            letterSpacing: '-1.5px',
                            lineHeight: 1.1,
                            color: '#F2F4F8'
                        }}
                    >
                        Les <em style={{ fontStyle: 'italic', color: '#C9A55A' }}>Producteurs</em>
                    </h1>
                    <p style={{ color: '#8C95AA', fontSize: '17px', fontWeight: 300, lineHeight: 1.75 }}>
                        Découvrez tous les producteurs traçables sur la blockchain
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-8 flex gap-2 flex-wrap justify-center">
                    <button
                        onClick={() => setFilterProducer('all')}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                        style={
                            filterProducer === 'all'
                                ? {
                                    background: 'rgba(201,165,90,0.15)',
                                    color: '#C9A55A',
                                    border: '1px solid rgba(201,165,90,0.3)',
                                }
                                : {
                                    background: 'transparent',
                                    color: '#8C95AA',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                }
                        }
                    >
                        Tous ({producers.length})
                    </button>
                    {producers.map(producer => (
                        <button
                            key={producer.address}
                            onClick={() => setFilterProducer(producer.name)}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                            style={
                                filterProducer === producer.name
                                    ? {
                                        background: 'rgba(201,165,90,0.15)',
                                        color: '#C9A55A',
                                        border: '1px solid rgba(201,165,90,0.3)',
                                    }
                                    : {
                                        background: 'transparent',
                                        color: '#8C95AA',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                    }
                            }
                        >
                            {producer.name}
                        </button>
                    ))}
                </div>

                {isLoadingIPFS && (
                    <div className="text-center mb-6" style={{ color: '#8C95AA', fontSize: '14px' }}>
                        Chargement des données IPFS...
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div 
                                className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4"
                                style={{ borderColor: '#C9A55A' }}
                            ></div>
                            <p style={{ color: '#8C95AA', fontSize: '15px' }}>Chargement des producteurs...</p>
                        </div>
                    </div>
                ) : filteredProducers.length === 0 ? (
                    <div
                        className="rounded-2xl p-10 text-center"
                        style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <p style={{ color: '#8C95AA', fontSize: '15px' }}>
                            Aucun producteur trouvé
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredProducers.map((producer) => (
                            <Link
                                key={producer.address}
                                href={`/explore/producer/${producer.address}`}
                                className="rounded-2xl p-6 transition-all duration-200 hover:border-white/15"
                                style={{ 
                                    background: '#0F1219', 
                                    border: '1px solid rgba(255,255,255,0.06)' 
                                }}
                            >
                                {/* En-tête avec logo */}
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="flex-1">
                                        <h3 
                                            className="text-2xl font-bold mb-1"
                                            style={{ 
                                                fontFamily: "'Playfair Display', Georgia, serif",
                                                color: '#F2F4F8' 
                                            }}
                                        >
                                            {producer.name}
                                        </h3>
                                        <p className="mb-2" style={{ fontSize: '14px', color: '#8C95AA' }}>
                                            📍 {producer.location}
                                        </p>
                                        {producer.companyRegisterNumber && (
                                            <p style={{ fontSize: '12px', color: '#8C95AA' }}>
                                                N° {producer.companyRegisterNumber}
                                            </p>
                                        )}
                                    </div>
                                    {producer.ipfsData?.logo && (
                                        <div className="flex-shrink-0">
                                            <img
                                                src={producer.ipfsData.logo.startsWith('ipfs://')
                                                    ? `https://ipfs.io/ipfs/${producer.ipfsData.logo.replace('ipfs://', '')}`
                                                    : producer.ipfsData.logo}
                                                alt={`Logo ${producer.name}`}
                                                className="w-20 h-20 object-contain rounded-xl"
                                                style={{ 
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    background: '#07080B'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Photo principale si disponible */}
                                {producer.ipfsData?.photos && producer.ipfsData.photos.length > 0 && (
                                    <div className="mb-4 rounded-xl overflow-hidden">
                                        <img
                                            src={producer.ipfsData.photos[0].startsWith('ipfs://')
                                                ? `https://ipfs.io/ipfs/${producer.ipfsData.photos[0].replace('ipfs://', '')}`
                                                : producer.ipfsData.photos[0]}
                                            alt={`Photo ${producer.name}`}
                                            className="w-full h-48 object-cover"
                                        />
                                    </div>
                                )}

                                {/* Description */}
                                {producer.ipfsData?.description && (
                                    <p className="mb-3 line-clamp-3" style={{ fontSize: '14px', color: '#8C95AA', lineHeight: 1.75 }}>
                                        {producer.ipfsData.description}
                                    </p>
                                )}

                                {/* Informations supplémentaires */}
                                <div className="space-y-2 mb-3">
                                    {producer.ipfsData?.anneeCreation && (
                                        <p style={{ fontSize: '14px', color: '#8C95AA' }}>
                                            📅 Créé en {producer.ipfsData.anneeCreation}
                                        </p>
                                    )}
                                    
                                    {producer.ipfsData?.contact?.email && (
                                        <p style={{ fontSize: '14px', color: '#8C95AA' }}>
                                            ✉️ {producer.ipfsData.contact.email}
                                        </p>
                                    )}
                                    
                                    {producer.ipfsData?.contact?.telephone && (
                                        <p style={{ fontSize: '14px', color: '#8C95AA' }}>
                                            📞 {producer.ipfsData.contact.telephone}
                                        </p>
                                    )}

                                    {producer.ipfsData?.siteWeb && (
                                        <p style={{ fontSize: '14px', color: '#8C95AA' }}>
                                            🌐 {new URL(producer.ipfsData.siteWeb).hostname}
                                        </p>
                                    )}
                                </div>

                                {/* Labels et certifications */}
                                {producer.ipfsData?.labelsCertifications && producer.ipfsData.labelsCertifications.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {producer.ipfsData.labelsCertifications.slice(0, 4).map((cert, index) => (
                                            <span
                                                key={index}
                                                className="text-xs px-2.5 py-1 rounded-full font-mono"
                                                style={{
                                                    background: 'rgba(201,165,90,0.07)',
                                                    color: '#C9A55A',
                                                    border: '1px solid rgba(201,165,90,0.15)',
                                                }}
                                            >
                                                {cert}
                                            </span>
                                        ))}
                                        {producer.ipfsData.labelsCertifications.length > 4 && (
                                            <span
                                                className="text-xs px-2.5 py-1 rounded-full"
                                                style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    color: '#8C95AA',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                }}
                                            >
                                                +{producer.ipfsData.labelsCertifications.length - 4}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Pied de carte */}
                                <div 
                                    className="pt-3 mt-3"
                                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                                >
                                    <div className="flex justify-between items-center">
                                        <p style={{ fontSize: '14px', color: '#F2F4F8' }}>
                                            📦 {producer.batchCount} lot{producer.batchCount > 1 ? 's' : ''} de produits
                                        </p>
                                        {producer.ipfsData?.photos && producer.ipfsData.photos.length > 1 && (
                                            <p style={{ fontSize: '12px', color: '#8C95AA' }}>
                                                📷 {producer.ipfsData.photos.length} photo{producer.ipfsData.photos.length > 1 ? 's' : ''}
                                            </p>
                                        )}
                                    </div>
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