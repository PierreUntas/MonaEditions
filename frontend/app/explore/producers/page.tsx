'use client';

import { useState, useEffect } from 'react';
import { HONEY_TRACE_STORAGE_ADDRESS, HONEY_TRACE_STORAGE_ABI } from '@/config/contracts';
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
                // Récupérer tous les événements NewProducer
                const logs = await publicClient.getLogs({
                    address: HONEY_TRACE_STORAGE_ADDRESS,
                    event: parseAbiItem('event NewProducer(address indexed producer)'),
                    fromBlock: 9753823n,
                    toBlock: 'latest'
                });

                // Extraire les adresses uniques
                const uniqueAddresses = Array.from(new Set(logs.map(log => log.args.producer as string)));

                // Récupérer toutes les données des producteurs en parallèle
                const producersPromises = uniqueAddresses.map(async (producerAddress) => {
                    const [producerData, batchLogs] = await Promise.all([
                        publicClient.readContract({
                            address: HONEY_TRACE_STORAGE_ADDRESS,
                            abi: HONEY_TRACE_STORAGE_ABI,
                            functionName: 'getProducer',
                            args: [producerAddress as `0x${string}`]
                        }) as Promise<any>,
                        publicClient.getLogs({
                            address: HONEY_TRACE_STORAGE_ADDRESS,
                            event: parseAbiItem('event NewHoneyBatch(address indexed producer, uint indexed honeyBatchId)'),
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
        <div className="min-h-screen bg-yellow-bee pt-14">
            <Navbar />
            <div className="container mx-auto p-6 max-w-6xl">
                <div className="mb-8">
                    <h1 className="text-5xl font-[Carbon_Phyber] text-[#000000] mb-2">
                        Explorer les Producteurs
                    </h1>
                    <p className="text-lg font-[Olney_Light] text-[#000000] opacity-70">
                        Découvrez tous les producteurs de miel traçables sur la blockchain
                    </p>
                </div>

                <div className="mb-6 flex gap-2 flex-wrap">
                    <button
                        onClick={() => setFilterProducer('all')}
                        className={`px-4 py-2 rounded-lg font-[Olney_Light] transition-colors border border-[#000000] cursor-pointer ${
                            filterProducer === 'all'
                                ? 'bg-[#666666] text-white'
                                : 'bg-yellow-bee text-[#000000] opacity-70 hover:opacity-100'
                        }`}
                    >
                        Tous ({producers.length})
                    </button>
                    {producers.map(producer => (
                        <button
                            key={producer.address}
                            onClick={() => setFilterProducer(producer.name)}
                            className={`px-4 py-2 rounded-lg font-[Olney_Light] transition-colors border border-[#000000] cursor-pointer ${
                                filterProducer === producer.name
                                    ? 'bg-[#666666] text-white'
                                    : 'bg-yellow-bee text-[#000000] opacity-70 hover:opacity-100'
                            }`}
                        >
                            {producer.name}
                        </button>
                    ))}
                </div>

                {isLoadingIPFS && (
                    <div className="text-center text-[#000000] font-[Olney_Light] mb-4 opacity-70">
                        Chargement des données IPFS...
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black/70 mb-4"></div>
                            <p className="text-[#000000] font-[Olney_Light] text-xl opacity-70">Chargement des producteurs...</p>
                        </div>
                    </div>
                ) : filteredProducers.length === 0 ? (
                    <div className="bg-yellow-bee rounded-lg p-8 opacity-70 text-center border border-[#000000]">
                        <p className="text-[#000000] font-[Olney_Light] text-lg">
                            Aucun producteur trouvé
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredProducers.map((producer) => (
                            <Link
                                key={producer.address}
                                href={`/explore/producer/${producer.address}`}
                                className="bg-yellow-bee rounded-lg p-6 opacity-70 border border-[#000000] hover:opacity-100 transition-opacity"
                            >
                                {/* En-tête avec logo */}
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-[Carbon_bl] text-[#000000] mb-1">
                                            {producer.name}
                                        </h3>
                                        <p className="text-sm font-[Olney_Light] text-[#000000]/60 mb-2">
                                            📍 {producer.location}
                                        </p>
                                        {producer.companyRegisterNumber && (
                                            <p className="text-xs font-[Olney_Light] text-[#000000]/50">
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
                                                className="w-20 h-20 object-contain rounded-lg border border-[#000000] bg-white"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Photo principale si disponible */}
                                {producer.ipfsData?.photos && producer.ipfsData.photos.length > 0 && (
                                    <div className="mb-4 rounded-lg overflow-hidden">
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
                                    <p className="text-sm font-[Olney_Light] text-[#000000]/80 mb-3 line-clamp-3">
                                        {producer.ipfsData.description}
                                    </p>
                                )}

                                {/* Informations supplémentaires */}
                                <div className="space-y-2 mb-3">
                                    {producer.ipfsData?.anneeCreation && (
                                        <p className="text-sm font-[Olney_Light] text-[#000000]/70">
                                            📅 Créé en {producer.ipfsData.anneeCreation}
                                        </p>
                                    )}
                                    
                                    {producer.ipfsData?.contact?.email && (
                                        <p className="text-sm font-[Olney_Light] text-[#000000]/70">
                                            ✉️ {producer.ipfsData.contact.email}
                                        </p>
                                    )}
                                    
                                    {producer.ipfsData?.contact?.telephone && (
                                        <p className="text-sm font-[Olney_Light] text-[#000000]/70">
                                            📞 {producer.ipfsData.contact.telephone}
                                        </p>
                                    )}

                                    {producer.ipfsData?.siteWeb && (
                                        <p className="text-sm font-[Olney_Light] text-[#000000]/70">
                                            🌐 {new URL(producer.ipfsData.siteWeb).hostname}
                                        </p>
                                    )}
                                </div>

                                {/* Labels et certifications */}
                                {producer.ipfsData?.labelsCertifications && producer.ipfsData.labelsCertifications.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {producer.ipfsData.labelsCertifications.slice(0, 4).map((cert, index) => (
                                            <span
                                                key={index}
                                                className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded border border-green-300"
                                            >
                                                {cert}
                                            </span>
                                        ))}
                                        {producer.ipfsData.labelsCertifications.length > 4 && (
                                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                                +{producer.ipfsData.labelsCertifications.length - 4}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Pied de carte */}
                                <div className="border-t border-[#000000]/20 pt-3 mt-3">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-[Olney_Light] text-[#000000]">
                                            🍯 {producer.batchCount} lot{producer.batchCount > 1 ? 's' : ''} de miel
                                        </p>
                                        {producer.ipfsData?.photos && producer.ipfsData.photos.length > 1 && (
                                            <p className="text-xs font-[Olney_Light] text-[#000000]/60">
                                                📷 {producer.ipfsData.photos.length} photo{producer.ipfsData.photos.length > 1 ? 's' : ''}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="flex justify-center mt-12 mb-6">
                    <Image
                        src="/logo-png-noir.png"
                        alt="Logo"
                        width={120}
                        height={120}
                        className="opacity-70"
                    />
                </div>
            </div>
        </div>
    );
}