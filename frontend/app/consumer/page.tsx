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
        <div className="min-h-screen bg-[#f5f3ef]">
            <Navbar />
            <div className="max-w-[860px] mx-auto px-6 pt-28 pb-20">
                <div className="text-center mb-12">
                    <div className="w-[52px] h-[52px] border border-[#d6d0c8] bg-[#fafaf8] flex items-center justify-center font-serif italic text-[22px] text-[#a8a29e] mx-auto mb-6">
                        起
                    </div>
                    <h1 className="font-serif text-[clamp(32px,5vw,48px)] font-normal tracking-[-1px] text-[#1c1917] leading-tight mb-8">
                        Mes <em className="italic text-[#78716c]">Certificats</em>
                    </h1>
                    <Link
                        href="/consumer/claim"
                        className="inline-block bg-[#1c1917] text-[#fafaf8] font-medium text-[12px] tracking-[0.06em] py-3 px-8 border border-[#1c1917] hover:bg-[#292524] transition-all duration-200"
                    >
                        Réclamer un certificat
                    </Link>
                </div>

                {isLoading || !address ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="w-8 h-8 border border-[#d6d0c8] border-t-[#1c1917] rounded-full animate-spin" />
                        <p className="text-[13px] font-light text-[#a8a29e] tracking-[0.06em]">Chargement de vos certificats…</p>
                    </div>
                ) : ownedTokens.length === 0 ? (
                    <div className="border border-[#d6d0c8] bg-[#fafaf8] p-12 text-center">
                        <p className="font-serif italic text-[18px] text-[#78716c] mb-6">
                            Vous ne possédez pas encore de certificat
                        </p>
                        <Link
                            href="/consumer/claim"
                            className="inline-block bg-[#1c1917] text-[#fafaf8] font-medium text-[12px] tracking-[0.06em] py-3 px-8 border border-[#1c1917] hover:bg-[#292524] transition-all duration-200"
                        >
                            Réclamer mon premier certificat
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-px">
                        {ownedTokens.map((token) => (
                            <div key={token.tokenId.toString()} className="border border-[#d6d0c8] bg-[#fafaf8] p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="font-serif text-[28px] font-normal text-[#1c1917] mb-2 leading-tight">
                                            {token.productType}
                                        </h2>
                                        <p className="text-[12px] font-light tracking-[0.06em] text-[#a8a29e] mb-1">
                                            ŒUVRE #{token.tokenId.toString()}
                                        </p>
                                        <p className="text-[13px] font-light text-[#78716c] mb-2">
                                            Par: {token.producerName}
                                        </p>
                                        {isOwnProducer(token) && (
                                            <p className="text-[11px] font-medium text-[#1c1917] bg-[#ede9e3] px-3 py-1.5 border border-[#d6d0c8] inline-block tracking-[0.06em]">
                                                🎨 Votre création
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                            Exemplaires
                                        </p>
                                        <p className="font-serif text-[36px] font-normal text-[#1c1917] leading-none">
                                            {token.balance.toString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Link
                                        href={`/explore/batch/${token.tokenId}`}
                                        className="flex-1 bg-[#1c1917] text-[#fafaf8] font-medium text-[12px] tracking-[0.06em] py-3 px-6 border border-[#1c1917] hover:bg-[#292524] transition-all duration-200 text-center"
                                    >
                                        Voir les détails
                                    </Link>
                                    {!isOwnProducer(token) && (
                                        <button
                                            onClick={() => setSelectedToken(token.tokenId)}
                                            className="flex-1 bg-[#f5f3ef] text-[#1c1917] font-medium text-[12px] tracking-[0.06em] py-3 px-6 border border-[#d6d0c8] hover:border-[#1c1917] transition-all duration-200"
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
                    <div className="fixed inset-0 bg-[#1c1917]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="border border-[#d6d0c8] bg-[#fafaf8] p-8 max-w-md w-full">
                            <h3 className="font-serif text-[28px] font-normal text-[#1c1917] mb-6 leading-tight">
                                Laisser un avis
                            </h3>
                            <form onSubmit={handleAddComment} className="space-y-5">
                                <div>
                                    <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                        Note (0-5)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="5"
                                        value={rating}
                                        onChange={(e) => setRating(Number(e.target.value))}
                                        className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                        Commentaire (5-500 caractères)
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        minLength={5}
                                        maxLength={500}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors min-h-[100px]"
                                        required
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedToken(null)}
                                        className="flex-1 bg-[#f5f3ef] text-[#1c1917] font-medium text-[12px] tracking-[0.06em] py-3 px-6 border border-[#d6d0c8] hover:border-[#1c1917] transition-all duration-200"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCommenting}
                                        className="flex-1 bg-[#1c1917] text-[#fafaf8] font-medium text-[12px] tracking-[0.06em] py-3 px-6 border border-[#1c1917] disabled:opacity-50 hover:bg-[#292524] transition-all duration-200"
                                    >
                                        {isCommenting ? 'Envoi…' : 'Envoyer'}
                                    </button>
                                </div>
                            </form>
                        </div>
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