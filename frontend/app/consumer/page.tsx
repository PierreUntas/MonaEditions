'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { PRODUCT_TRACE_STORAGE_ADDRESS, PRODUCT_TRACE_STORAGE_ABI, PRODUCT_TOKENIZATION_ADDRESS, PRODUCT_TOKENIZATION_ABI } from '@/config/contracts';
import Navbar from '@/components/shared/Navbar';
import Image from 'next/image';
import Link from 'next/link';
import { parseAbiItem, encodeFunctionData } from 'viem';
import { publicClient } from '@/lib/client';
import { useSendTransaction } from '@privy-io/react-auth';

interface OwnedToken {
    tokenId: bigint;
    balance: bigint;
    productType: string;
    metadata: string;
    producer: string;
    producerName: string;
}

export default function ConsumerPage() {
    const { address } = useAccount();
    const [ownedTokens, setOwnedTokens] = useState<OwnedToken[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedToken, setSelectedToken] = useState<bigint | null>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);

    const { sendTransaction } = useSendTransaction();

    useEffect(() => {
        const fetchOwnedTokens = async () => {
            if (!address || !publicClient) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // Fetch all NewProductBatch events
                const logs = await publicClient.getLogs({
                    address: PRODUCT_TRACE_STORAGE_ADDRESS,
                    event: parseAbiItem('event NewProductBatch(address indexed producer, uint indexed productBatchId)'),
                    fromBlock: 9753823n,
                    toBlock: 'latest'
                });

                const tokensData: OwnedToken[] = [];

                // For each batch, check if the user owns tokens
                for (const log of logs) {
                    const tokenId = log.args.productBatchId as bigint;
                    const producerAddress = log.args.producer as `0x${string}`;

                    // Check the user's balance
                    const balance = await publicClient.readContract({
                        address: PRODUCT_TOKENIZATION_ADDRESS,
                        abi: PRODUCT_TOKENIZATION_ABI,
                        functionName: 'balanceOf',
                        args: [address, tokenId]
                    }) as bigint;

                    if (balance > 0n) {
                        // Fetch batch info
                        const batchInfo = await publicClient.readContract({
                            address: PRODUCT_TRACE_STORAGE_ADDRESS,
                            abi: PRODUCT_TRACE_STORAGE_ABI,
                            functionName: 'getProductBatch',
                            args: [tokenId]
                        }) as any;

                        // Fetch producer info
                        const producerData = await publicClient.readContract({
                            address: PRODUCT_TRACE_STORAGE_ADDRESS,
                            abi: PRODUCT_TRACE_STORAGE_ABI,
                            functionName: 'getProducer',
                            args: [producerAddress]
                        }) as any;

                        tokensData.push({
                            tokenId,
                            balance,
                            productType: batchInfo.productType,
                            metadata: batchInfo.metadata,
                            producer: producerAddress,
                            producerName: producerData.name || 'Producteur anonyme'
                        });
                    }
                }

                // Sort by tokenId descending
                tokensData.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));

                setOwnedTokens(tokensData);
            } catch (error) {
                console.error('Error loading tokens:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOwnedTokens();
    }, [address]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedToken) return;

        // Vérifier que l'utilisateur n'est pas le producteur
        const token = ownedTokens.find(t => t.tokenId === selectedToken);
        if (token && address && token.producer.toLowerCase() === address.toLowerCase()) {
            alert('❌ Vous ne pouvez pas laisser un avis sur vos propres lots');
            return;
        }

        setIsCommenting(true);
        try {
            const data = encodeFunctionData({
                abi: PRODUCT_TRACE_STORAGE_ABI,
                functionName: 'addComment',
                args: [selectedToken, rating, comment]
            });

            const txHash = await sendTransaction(
                {
                    to: PRODUCT_TRACE_STORAGE_ADDRESS,
                    data: data,
                },
                {
                    sponsor: true,
                }
            );

            // Comment transaction hash (internal): txHash
            alert('✅ Avis envoyé avec succès !');
            setSelectedToken(null);
            setRating(5);
            setComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('❌ Erreur lors de l\'ajout du commentaire');
        } finally {
            setIsCommenting(false);
        }
    };

    // Function to check if the user is the token's producer
    const isOwnProducer = (token: OwnedToken) => {
        return address && token.producer.toLowerCase() === address.toLowerCase();
    };

    return (
        <div className="min-h-screen bg-yellow-bee pt-14">
            <Navbar />
            <div className="container mx-auto p-6 max-w-4xl">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-4xl font-[Carbon_Phyber] text-[#000000]">
                        Mes Tokens de Produits
                    </h1>
                    <Link
                        href="/consumer/claim"
                        className="bg-[#666666] text-white font-[Olney_Light] py-2 px-6 rounded-lg hover:bg-[#555555] transition-all duration-300 border border-[#000000]"
                    >
                        Réclamer un token
                    </Link>
                </div>

                {isLoading || !address ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black/70 mb-4"></div>
                            <p className="text-[#000000] font-[Olney_Light] text-xl opacity-70">Chargement de vos tokens...</p>
                        </div>
                    </div>
                ) : ownedTokens.length === 0 ? (
                    <div className="bg-yellow-bee rounded-lg p-8 opacity-70 text-center border border-[#000000]">
                        <p className="text-[#000000] font-[Olney_Light] mb-4">
                            Vous ne possédez pas encore de tokens
                        </p>
                        <Link
                            href="/consumer/claim"
                            className="inline-block bg-[#666666] text-white font-[Olney_Light] py-2 px-6 rounded-lg hover:bg-[#555555] transition-colors border border-[#000000]"
                        >
                            Réclamer mon premier token
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {ownedTokens.map((token) => (
                            <div key={token.tokenId.toString()} className="bg-yellow-bee rounded-lg p-6 opacity-70 border border-[#000000]">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-2xl font-[Carbon_bl] text-[#000000] mb-2">
                                            {token.productType}
                                        </h2>
                                        <p className="text-sm font-[Olney_Light] text-[#000000]/60">
                                            Lot #{token.tokenId.toString()}
                                        </p>
                                        <p className="text-sm font-[Olney_Light] text-[#000000]/60 mt-1">
                                            Par: {token.producerName}
                                        </p>
                                        {isOwnProducer(token) && (
                                            <p className="text-xs font-[Olney_Light] text-orange-600 mt-2 bg-orange-100 px-2 py-1 rounded inline-block">
                                                👨‍🌾 Votre production
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-[Olney_Light] text-[#000000]/60">
                                            Quantité
                                        </p>
                                        <p className="text-3xl font-[Carbon_Phyber] text-[#000000]">
                                            {token.balance.toString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Link
                                        href={`/explore/batch/${token.tokenId}`}
                                        className="flex-1 bg-[#666666] text-white font-[Olney_Light] py-2 px-4 rounded-lg hover:bg-[#555555] transition-all duration-300 border border-[#000000] text-center text-sm"
                                    >
                                        Voir les détails
                                    </Link>
                                    {!isOwnProducer(token) && (
                                        <button
                                            onClick={() => setSelectedToken(token.tokenId)}
                                            className="flex-1 bg-yellow-bee text-[#000000] font-[Olney_Light] py-2 px-4 rounded-lg hover:text-[#666666] hover:border-[#666666] transition-all duration-300 cursor-pointer border border-[#000000] text-sm"
                                        >
                                            Laisser un avis
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Comment modal */}
                {selectedToken && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-yellow-bee rounded-lg p-6 max-w-md w-full border border-[#000000]">
                            <h3 className="text-2xl font-[Carbon_bl] text-[#000000] mb-4">
                                Laisser un avis
                            </h3>
                            <form onSubmit={handleAddComment} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-[Olney_Light] mb-2 text-[#000000]">
                                        Note (0-5)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="5"
                                        value={rating}
                                        onChange={(e) => setRating(Number(e.target.value))}
                                        className="w-full p-3 rounded-lg border border-[#000000] bg-yellow-bee/50 font-[Olney_Light]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-[Olney_Light] mb-2 text-[#000000]">
                                        Commentaire (5-500 caractères)
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        minLength={5}
                                        maxLength={500}
                                        rows={4}
                                        className="w-full p-3 rounded-lg border border-[#000000] bg-yellow-bee/50 font-[Olney_Light]"
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedToken(null)}
                                        className="flex-1 bg-yellow-bee text-[#000000] font-[Olney_Light] py-2 px-4 rounded-lg hover:text-[#666666] hover:border-[#666666] transition-all duration-300 cursor-pointer border border-[#000000]"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCommenting}
                                        className="flex-1 bg-[#666666] text-white font-[Olney_Light] py-2 px-4 rounded-lg hover:bg-[#555555] transition-all duration-300 cursor-pointer border border-[#000000] disabled:opacity-50"
                                    >
                                        {isCommenting ? 'Envoi...' : 'Envoyer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="flex justify-center mt-8 mb-6">
                    <Image
                        src="/originlink-logo.png"
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