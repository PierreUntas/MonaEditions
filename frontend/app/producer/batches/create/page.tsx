'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { HONEY_TRACE_STORAGE_ADDRESS, HONEY_TRACE_STORAGE_ABI, HONEY_TOKENIZATION_ADDRESS, HONEY_TOKENIZATION_ABI } from '@/config/contracts';
import { uploadToIPFS, uploadFileToIPFS } from '@/app/utils/ipfs';
import Navbar from '@/components/shared/Navbar';
import Image from 'next/image';
import { MerkleTree } from 'merkletreejs';
import { keccak256, encodeFunctionData, decodeEventLog, createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { useSendTransaction } from '@privy-io/react-auth';

export default function CreateBatchPage() {
    const { address } = useAccount();
    const [honeyType, setHoneyType] = useState('');
    const [amount, setAmount] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isCheckingAuthorization, setIsCheckingAuthorization] = useState(true);
    const [isApproved, setIsApproved] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingLabel, setIsUploadingLabel] = useState(false);
    const [secretKeys, setSecretKeys] = useState<string[]>([]);
    const [merkleRoot, setMerkleRoot] = useState<string>('');
    const [merkleTree, setMerkleTree] = useState<MerkleTree | null>(null);
    const [labelFileName, setLabelFileName] = useState<string>('');
    const [createdBatchId, setCreatedBatchId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const labelInputRef = useRef<HTMLInputElement>(null);

    const { sendTransaction } = useSendTransaction();

    const [batchData, setBatchData] = useState({
        identifiant: '',
        typeMiel: '',
        periodeRecolte: '',
        dateMiseEnPot: '',
        lieuMiseEnPot: '',
        certifications: [] as string[],
        composition: '',
        formatPot: '',
        etiquetage: ''
    });

    const { data: producerData, isLoading: isLoadingProducer } = useReadContract({
        address: HONEY_TRACE_STORAGE_ADDRESS,
        abi: HONEY_TRACE_STORAGE_ABI,
        functionName: 'getProducer',
        args: address ? [address] : undefined,
    });

    const { data: approvalStatus, refetch: refetchApproval } = useReadContract({
        address: HONEY_TOKENIZATION_ADDRESS,
        abi: HONEY_TOKENIZATION_ABI,
        functionName: 'isApprovedForAll',
        args: address ? [address, HONEY_TRACE_STORAGE_ADDRESS] : undefined,
    });

    useEffect(() => {
        if (producerData) {
            const producer = producerData as any;
            setIsAuthorized(producer.authorized);
            setIsCheckingAuthorization(false);
        } else if (!isLoadingProducer && producerData !== undefined) {
            setIsCheckingAuthorization(false);
        }
    }, [producerData, isLoadingProducer]);

    useEffect(() => {
        if (approvalStatus !== undefined) {
            setIsApproved(approvalStatus as boolean);
            if (approvalStatus && isApproving) {
                setIsApproving(false);
                alert('✅ Approbation confirmée ! Vous pouvez maintenant créer des lots.');
            }
        }
    }, [approvalStatus, isApproving]);

    const generateSecretKeys = (count: number) => {
        const keys: string[] = [];
        for (let i = 0; i < count; i++) {
            const randomKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            keys.push(randomKey);
        }
        return keys;
    };

    const handleAmountChange = (value: string) => {
        setAmount(value);
        if (value) {
            const count = parseInt(value);
            if (count > 0 && count <= 100000) {
                const keys = generateSecretKeys(count);
                setSecretKeys(keys);

                const leaves = keys.map(key => keccak256(`0x${Buffer.from(key).toString('hex')}`));
                const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
                const root = tree.getHexRoot();

                setMerkleTree(tree);
                setMerkleRoot(root);
            }
        } else {
            setSecretKeys([]);
            setMerkleRoot('');
            setMerkleTree(null);
        }
    };

    const handleLabelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingLabel(true);
        setLabelFileName(file.name);

        try {
            const cid = await uploadFileToIPFS(file);
            setBatchData({ ...batchData, etiquetage: `ipfs://${cid}` });
            alert('✅ Étiquette uploadée sur IPFS !');
        } catch (error) {
            console.error('Error uploading label:', error);
            alert('❌ Erreur lors de l\'upload de l\'étiquette');
            setLabelFileName('');
        } finally {
            setIsUploadingLabel(false);
        }
    };

    const downloadSecretKeys = () => {
        if (secretKeys.length === 0 || !merkleTree) return;

        const batchId = createdBatchId || 'BATCH_ID';

        const data = secretKeys.map((key, index) => {
            const leaf = keccak256(Buffer.from(key));
            const proof = merkleTree.getHexProof(leaf);
            const merkleProofParam = proof.join(',');

            const claimUrl = `https://bee-block.vercel.app/consumer/claim?batchId=${batchId}&secretKey=${key}&merkleProof=${merkleProofParam}`;

            return {
                index: index + 1,
                secretKey: key,
                merkleProof: merkleProofParam,
                claimUrl: claimUrl
            };
        });

        const content = data.map(item =>
            `${item.index},"${item.secretKey}","${item.merkleProof}","${item.claimUrl}"`
        ).join('\n');

        const blob = new Blob(
            [`Index,SecretKey,MerkleProof,ClaimURL\n${content}`],
            { type: 'text/csv' }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `secret-keys-batch-${batchId}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleApprove = async () => {
        try {
            setIsApproving(true);
            
            const data = encodeFunctionData({
                abi: HONEY_TOKENIZATION_ABI,
                functionName: 'setApprovalForAll',
                args: [HONEY_TRACE_STORAGE_ADDRESS, true]
            });

            const txHash = await sendTransaction(
                {
                    to: HONEY_TOKENIZATION_ADDRESS,
                    data: data,
                },
                {
                    sponsor: true,
                }
            );

            // Approval transaction hash (internal): txHash
            alert('⏳ Approbation en cours... La transaction doit être confirmée sur la blockchain (~12 sec). Attendez la confirmation avant de créer votre lot.');

            const checkApproval = setInterval(async () => {
                const result = await refetchApproval();
                if (result.data === true) {
                    clearInterval(checkApproval);
                    setIsApproving(false);
                    setIsApproved(true);
                }
            }, 3000);

            setTimeout(() => {
                clearInterval(checkApproval);
                setIsApproving(false);
            }, 60000);

        } catch (error) {
            console.error('Error during approval:', error);
            alert('❌ Erreur lors de l\'approbation. Veuillez réessayer.');
            setIsApproving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);

        if (!honeyType || !amount || !merkleRoot) {
            alert('Veuillez remplir tous les champs obligatoires');
            setIsUploading(false);
            return;
        }

        if (!isApproved) {
            alert('⚠️ Vous devez d\'abord approuver le contrat HoneyTraceStorage');
            setIsUploading(false);
            return;
        }

        try {
            const completeData = {
                identifiant: batchData.identifiant,
                typeMiel: honeyType,
                periodeRecolte: batchData.periodeRecolte,
                dateMiseEnPot: batchData.dateMiseEnPot,
                lieuMiseEnPot: batchData.lieuMiseEnPot,
                certifications: batchData.certifications,
                composition: batchData.composition,
                formatPot: batchData.formatPot,
                etiquetage: batchData.etiquetage
            };

            const cid = await uploadToIPFS(completeData);
            // IPFS CID for batch (internal): cid

            setIsUploading(false);
            setIsCreating(true);

            const data = encodeFunctionData({
                abi: HONEY_TRACE_STORAGE_ABI,
                functionName: 'addHoneyBatch',
                args: [honeyType, cid, BigInt(amount), merkleRoot as `0x${string}`]
            });

            const txHash = await sendTransaction(
                {
                    to: HONEY_TRACE_STORAGE_ADDRESS,
                    data: data,
                },
                {
                    sponsor: true,
                }
            );

            // Batch creation transaction hash (internal): txHash
            alert('⏳ Transaction envoyée ! En attente de confirmation...');

            // Create a public client to read the blockchain
            const publicClient = createPublicClient({
                chain: sepolia,
                transport: http(process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA),
            });

            // Wait for the transaction receipt
            const receipt = await publicClient.waitForTransactionReceipt({
                hash: txHash.hash as `0x${string}`,
            });

            // Receipt received (internal): receipt
            // Number of logs (internal): receipt.logs.length

            // Find the NewHoneyBatch event in the logs
            const batchCreatedEvent = receipt.logs.find(log => {
                try {
                    const decoded = decodeEventLog({
                        abi: HONEY_TRACE_STORAGE_ABI,
                        data: log.data,
                        topics: log.topics,
                    });
                    // Decoded event (internal): decoded.eventName, decoded
                    return decoded.eventName === 'NewHoneyBatch';
                } catch (e) {
                    // Error decoding log (internal): e
                    return false;
                }
            });

            // NewHoneyBatch event found (internal): batchCreatedEvent

            if (batchCreatedEvent) {
                const decoded = decodeEventLog({
                    abi: HONEY_TRACE_STORAGE_ABI,
                    data: batchCreatedEvent.data,
                    topics: batchCreatedEvent.topics,
                }) as any;

                // Decoded args (internal): decoded.args
                const batchId = decoded.args.honeyBatchId?.toString();
                // Extracted batchId (internal): batchId
                setCreatedBatchId(batchId);
                alert(`✅ Lot créé avec succès ! ID du lot: ${batchId}`);
            } else {
                console.error('❌ NewHoneyBatch event not found in logs');
                alert('⚠️ Transaction confirmée mais impossible de récupérer l\'ID du lot. Vérifiez la console.');
                setCreatedBatchId('confirmed');
            }
        } catch (error) {
            console.error('Error creating batch:', error);
            alert('❌ Erreur lors de la création du lot');
        } finally {
            setIsUploading(false);
            setIsCreating(false);
        }
    };

    // Loading state while checking permissions
    if (isCheckingAuthorization || isLoadingProducer) {
        return (
            <div className="min-h-screen bg-yellow-bee">
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black/70 mb-4"></div>
                        <p className="text-[#000000] font-[Olney_Light] text-xl opacity-70">Vérification des permissions...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!address) {
        return (
            <div className="min-h-screen bg-yellow-bee">
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                    <p className="text-center text-[#000000] font-[Olney_Light] text-xl opacity-70">
                        Veuillez connecter votre wallet
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-yellow-bee">
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                    <p className="text-center text-[#000000] font-[Olney_Light] text-xl opacity-70">
                        Accès refusé : vous n'êtes pas autorisé comme producteur
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-yellow-bee pt-14">
            <Navbar />
            <div className="container mx-auto p-6 max-w-2xl">
                {isAuthorized && !isApproved && (
                    <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-6 rounded">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold">⚠️ Action requise</p>
                                <p className="text-sm">Vous devez approuver le contrat HoneyTraceStorage avant de créer des lots.</p>
                            </div>
                            <button
                                onClick={handleApprove}
                                disabled={isApproving}
                                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                            >
                                {isApproving ? '⏳ En cours...' : '✅ Approuver maintenant'}
                            </button>
                        </div>
                    </div>
                )}

                {createdBatchId && (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded">
                        <p className="font-bold">✅ Lot créé avec succès !</p>
                        <p className="text-sm">ID du lot: <span className="font-mono">{createdBatchId}</span></p>
                        <p className="text-sm mt-2">Vous pouvez maintenant télécharger les clés avec les URLs de claim.</p>
                    </div>
                )}

                <h1 className="text-4xl font-[Carbon_Phyber] text-[#000000] mb-6">
                    Créer un nouveau lot de miel
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Identifiant du lot *
                        </label>
                        <input
                            type="text"
                            value={batchData.identifiant}
                            onChange={(e) => setBatchData({...batchData, identifiant: e.target.value})}
                            className="w-full px-4 py-2 border border-[#000000] rounded-lg focus:ring-2 focus:ring-[#666666] font-[Olney_Light]"
                            placeholder="LOT20251118-001"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Type de miel *
                        </label>
                        <input
                            type="text"
                            value={honeyType}
                            onChange={(e) => {
                                setHoneyType(e.target.value);
                                setBatchData({...batchData, typeMiel: e.target.value});
                            }}
                            className="w-full px-4 py-2 border border-[#000000] rounded-lg focus:ring-2 focus:ring-[#666666] font-[Olney_Light]"
                            placeholder="Ex: Acacia, Lavande..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Période de récolte
                        </label>
                        <input
                            type="text"
                            value={batchData.periodeRecolte}
                            onChange={(e) => setBatchData({...batchData, periodeRecolte: e.target.value})}
                            className="w-full px-4 py-2 border border-[#000000] rounded-lg focus:ring-2 focus:ring-[#666666] font-[Olney_Light]"
                            placeholder="Mai-Juin 2025"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Date de mise en pot
                        </label>
                        <input
                            type="date"
                            value={batchData.dateMiseEnPot}
                            onChange={(e) => setBatchData({...batchData, dateMiseEnPot: e.target.value})}
                            className="w-full px-4 py-2 border border-[#000000] rounded-lg focus:ring-2 focus:ring-[#666666] font-[Olney_Light]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Lieu de mise en pot
                        </label>
                        <input
                            type="text"
                            value={batchData.lieuMiseEnPot}
                            onChange={(e) => setBatchData({...batchData, lieuMiseEnPot: e.target.value})}
                            className="w-full px-4 py-2 border border-[#000000] rounded-lg focus:ring-2 focus:ring-[#666666] font-[Olney_Light]"
                            placeholder="Bordeaux, Nouvelle-Aquitaine, France"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Composition
                        </label>
                        <textarea
                            value={batchData.composition}
                            onChange={(e) => setBatchData({...batchData, composition: e.target.value})}
                            className="w-full px-4 py-2 border border-[#000000] rounded-lg focus:ring-2 focus:ring-[#666666] font-[Olney_Light]"
                            placeholder="Miel 100% Acacia issu de ruchers locaux"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Format du pot
                        </label>
                        <input
                            type="text"
                            value={batchData.formatPot}
                            onChange={(e) => setBatchData({...batchData, formatPot: e.target.value})}
                            className="w-full px-4 py-2 border border-[#000000] rounded-lg focus:ring-2 focus:ring-[#666666] font-[Olney_Light]"
                            placeholder="250g"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Étiquette (PDF, Image)
                        </label>
                        <input
                            type="file"
                            ref={labelInputRef}
                            onChange={handleLabelUpload}
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="hidden"
                        />
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => labelInputRef.current?.click()}
                                disabled={isUploadingLabel}
                                className="flex-1 px-4 py-2 border border-[#000000] rounded-lg font-[Olney_Light] hover:bg-gray-100 transition-all duration-300 disabled:opacity-50 cursor-pointer"
                            >
                                {isUploadingLabel ? '📤 Upload en cours...' : '📎 Choisir un fichier'}
                            </button>
                        </div>
                        {labelFileName && (
                            <p className="text-xs font-[Olney_Light] text-green-600 mt-2">
                                ✅ {labelFileName}
                            </p>
                        )}
                        {batchData.etiquetage && (
                            <p className="text-xs font-mono text-gray-500 mt-1 break-all">
                                {batchData.etiquetage}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Quantité de tokens *
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            className="w-full px-4 py-2 border border-[#000000] rounded-lg focus:ring-2 focus:ring-[#666666] font-[Olney_Light]"
                            placeholder="Ex: 100"
                            min="1"
                            max="100000"
                            required
                        />
                    </div>

                    {merkleRoot && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm font-[Olney_Light] text-green-800 mb-2">
                                ✅ Merkle Root généré
                            </p>
                            <p className="text-xs font-mono text-green-600 break-all">
                                {merkleRoot}
                            </p>
                            <p className="text-xs font-[Olney_Light] text-green-600 mt-2">
                                {secretKeys.length} clés secrètes générées
                            </p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={downloadSecretKeys}
                            disabled={!merkleRoot || !createdBatchId || createdBatchId === 'pending' || createdBatchId === 'confirmed'}
                            className="flex-1 bg-blue-500 text-white font-[Olney_Light] py-3 rounded-lg hover:bg-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            📥 Télécharger les clés
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || isUploading || !merkleRoot || !isApproved}
                            className="flex-1 bg-[#666666] text-white font-[Olney_Light] py-3 rounded-lg hover:bg-[#555555] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isUploading
                                ? '📤 Upload IPFS...'
                                : isCreating
                                    ? '⏳ Création en cours...'
                                    : '✨ Créer le lot'}
                        </button>
                    </div>
                </form>

                <div className="flex justify-center mt-8 mb-6">
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