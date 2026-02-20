'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { PRODUCT_TRACE_STORAGE_ADDRESS, PRODUCT_TRACE_STORAGE_ABI, PRODUCT_TOKENIZATION_ADDRESS, PRODUCT_TOKENIZATION_ABI } from '@/config/contracts';
import { uploadToIPFS, uploadFileToIPFS } from '@/app/utils/ipfs';
import Navbar from '@/components/shared/Navbar';
import Image from 'next/image';
import { MerkleTree } from 'merkletreejs';
import { keccak256, encodeFunctionData, decodeEventLog, createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { useSendTransaction } from '@privy-io/react-auth';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';

export default function CreateBatchPage() {
    const { address } = useAccount();
    const [productType, setProductType] = useState('');
    const [amount, setAmount] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isCheckingAuthorization, setIsCheckingAuthorization] = useState(true);
    const [isApproved, setIsApproved] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingLabel, setIsUploadingLabel] = useState(false);
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);
    const [secretKeys, setSecretKeys] = useState<string[]>([]);
    const [merkleRoot, setMerkleRoot] = useState<string>('');
    const [merkleTree, setMerkleTree] = useState<MerkleTree | null>(null);
    const [labelFileName, setLabelFileName] = useState<string>('');
    const [createdBatchId, setCreatedBatchId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const labelInputRef = useRef<HTMLInputElement>(null);

    const { sendTransaction } = useSendTransaction();

    const [batchData, setBatchData] = useState({
        identifier: '',
        productType: '',
        description: '',
        origin: '',
        productionDate: '',
        certifications: [] as string[],
        labelUri: ''
    });

    const { data: producerData, isLoading: isLoadingProducer } = useReadContract({
        address: PRODUCT_TRACE_STORAGE_ADDRESS,
        abi: PRODUCT_TRACE_STORAGE_ABI,
        functionName: 'getProducer',
        args: address ? [address] : undefined,
    });

    const { data: approvalStatus, refetch: refetchApproval } = useReadContract({
        address: PRODUCT_TOKENIZATION_ADDRESS,
        abi: PRODUCT_TOKENIZATION_ABI,
        functionName: 'isApprovedForAll',
        args: address ? [address, PRODUCT_TRACE_STORAGE_ADDRESS] : undefined,
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
            setBatchData({ ...batchData, labelUri: `ipfs://${cid}` });
            alert('✅ Étiquette uploadée sur IPFS !');
        } catch (error) {
            console.error('Error uploading label:', error);
            alert('❌ Erreur lors de l\'upload de l\'étiquette');
            setLabelFileName('');
        } finally {
            setIsUploadingLabel(false);
        }
    };

    const generateQRCodeImage = async (text: string): Promise<string> => {
        try {
            const qrDataUrl = await QRCode.toDataURL(text, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            return qrDataUrl;
        } catch (error) {
            console.error('Error generating QR code:', error);
            throw error;
        }
    };

    const downloadBatchPageQRCode = async () => {
        if (!createdBatchId || createdBatchId === 'pending' || createdBatchId === 'confirmed') return;

        setIsGeneratingQR(true);

        try {
            const batchPageUrl = `https://www.beeblock.fr/explore/batch/${createdBatchId}`;
            
            // Générer un QR code haute résolution pour l'impression
            const qrCodeDataUrl = await QRCode.toDataURL(batchPageUrl, {
                width: 1000,
                margin: 4,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: 'H'
            });

            // Télécharger l'image
            const base64Data = qrCodeDataUrl.split(',')[1];
            const blob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], { type: 'image/png' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `QR_Batch_Page_${createdBatchId}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert(`✅ QR Code de la page du lot téléchargé avec succès !`);
        } catch (error) {
            console.error('Error generating batch page QR code:', error);
            alert('❌ Erreur lors de la génération du QR code de la page');
        } finally {
            setIsGeneratingQR(false);
        }
    };

    const downloadExcelWithQRCodes = async () => {
        if (secretKeys.length === 0 || !merkleTree || !createdBatchId) return;

        setIsGeneratingQR(true);

        try {
            const batchId = createdBatchId;

            // Préparer les données pour Excel
            const excelData = [];

            for (let index = 0; index < secretKeys.length; index++) {
                const key = secretKeys[index];
                const leaf = keccak256(Buffer.from(key));
                const proof = merkleTree.getHexProof(leaf);
                const merkleProofParam = proof.join(',');

                const claimUrl = `https://www.beeblock.fr/consumer/claim?batchId=${batchId}&secretKey=${key}&merkleProof=${merkleProofParam}`;

                // Générer le QR code en base64
                const qrCodeDataUrl = await generateQRCodeImage(claimUrl);

                excelData.push({
                    'Index': index + 1,
                    'Secret Key': key,
                    'Merkle Proof': merkleProofParam,
                    'Claim URL': claimUrl,
                    'QR Code': qrCodeDataUrl
                });

                // Afficher la progression
                if ((index + 1) % 10 === 0 || index === secretKeys.length - 1) {
                    console.log(`Génération des QR codes: ${index + 1}/${secretKeys.length}`);
                }
            }

            // Créer le workbook
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Ajuster la largeur des colonnes
            ws['!cols'] = [
                { wch: 8 },   // Index
                { wch: 65 },  // Secret Key
                { wch: 50 },  // Merkle Proof
                { wch: 80 },  // Claim URL
                { wch: 40 }   // QR Code
            ];

            // Ajuster la hauteur des lignes pour les QR codes
            const rowHeights = [{ hpx: 20 }]; // Header
            for (let i = 0; i < excelData.length; i++) {
                rowHeights.push({ hpx: 150 }); // Hauteur pour chaque ligne avec QR code
            }
            ws['!rows'] = rowHeights;

            // Ajouter les images QR code
            if (!ws['!images']) ws['!images'] = [];
            
            for (let i = 0; i < excelData.length; i++) {
                const qrCodeBase64 = excelData[i]['QR Code'].split(',')[1]; // Enlever le préfixe data:image/png;base64,
                
                ws['!images'].push({
                    name: `qr_${i + 1}.png`,
                    data: qrCodeBase64,
                    opts: {
                        positioning: {
                            type: 'oneCellAnchor',
                            from: { col: 4, row: i + 1 } // Colonne E (index 4), ligne i+1
                        }
                    }
                });
            }

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Secret Keys');

            // Télécharger le fichier
            XLSX.writeFile(wb, `secret-keys-batch-${batchId}-${Date.now()}.xlsx`);

            alert(`✅ Fichier Excel avec ${secretKeys.length} QR codes généré avec succès !`);
        } catch (error) {
            console.error('Error generating Excel with QR codes:', error);
            alert('❌ Erreur lors de la génération du fichier Excel avec QR codes');
        } finally {
            setIsGeneratingQR(false);
        }
    };

    const downloadQRCodesZip = async () => {
        if (secretKeys.length === 0 || !merkleTree || !createdBatchId) return;

        setIsGeneratingQR(true);

        try {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            const batchId = createdBatchId;

            for (let index = 0; index < secretKeys.length; index++) {
                const key = secretKeys[index];
                const leaf = keccak256(Buffer.from(key));
                const proof = merkleTree.getHexProof(leaf);
                const merkleProofParam = proof.join(',');

                const claimUrl = `https://www.beeblock.fr/consumer/claim?batchId=${batchId}&secretKey=${key}&merkleProof=${merkleProofParam}`;

                // Générer le QR code
                const qrCodeDataUrl = await generateQRCodeImage(claimUrl);
                const base64Data = qrCodeDataUrl.split(',')[1];

                // Ajouter au ZIP
                zip.file(`QR_Claim_${batchId}_${(index + 1).toString().padStart(5, '0')}.png`, base64Data, { base64: true });

                if ((index + 1) % 10 === 0 || index === secretKeys.length - 1) {
                    console.log(`Génération des QR codes: ${index + 1}/${secretKeys.length}`);
                }
            }

            // Générer le ZIP
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qr-codes-claim-batch-${batchId}-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert(`✅ ${secretKeys.length} QR codes téléchargés avec succès !`);
        } catch (error) {
            console.error('Error generating QR codes:', error);
            alert('❌ Erreur lors de la génération des QR codes');
        } finally {
            setIsGeneratingQR(false);
        }
    };

    const handleApprove = async () => {
        try {
            setIsApproving(true);
            
            const data = encodeFunctionData({
                abi: PRODUCT_TOKENIZATION_ABI,
                functionName: 'setApprovalForAll',
                args: [PRODUCT_TRACE_STORAGE_ADDRESS, true]
            });

            const txHash = await sendTransaction(
                {
                    to: PRODUCT_TOKENIZATION_ADDRESS,
                    data: data,
                },
                {
                    sponsor: true,
                }
            );

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

        if (!productType || !amount || !merkleRoot) {
            alert('Veuillez remplir tous les champs obligatoires');
            setIsUploading(false);
            return;
        }

        if (!isApproved) {
            alert('⚠️ Vous devez d\'abord approuver le contrat ProductTraceStorage');
            setIsUploading(false);
            return;
        }

        try {
            const completeData = {
                identifier: batchData.identifier,
                productType: productType,
                description: batchData.description,
                origin: batchData.origin,
                productionDate: batchData.productionDate,
                certifications: batchData.certifications,
                labelUri: batchData.labelUri
            };

            const cid = await uploadToIPFS(completeData);

            setIsUploading(false);
            setIsCreating(true);

            const data = encodeFunctionData({
                abi: PRODUCT_TRACE_STORAGE_ABI,
                functionName: 'addProductBatch',
                args: [productType, cid, BigInt(amount), merkleRoot as `0x${string}`]
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

            alert('⏳ Transaction envoyée ! En attente de confirmation...');

            const publicClient = createPublicClient({
                chain: sepolia,
                transport: http(process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA),
            });

            const receipt = await publicClient.waitForTransactionReceipt({
                hash: txHash.hash as `0x${string}`,
            });

            const batchCreatedEvent = receipt.logs.find(log => {
                try {
                    const decoded = decodeEventLog({
                        abi: PRODUCT_TRACE_STORAGE_ABI,
                        data: log.data,
                        topics: log.topics,
                    });
                    return decoded.eventName === 'NewProductBatch';
                } catch (e) {
                    return false;
                }
            });

            if (batchCreatedEvent) {
                const decoded = decodeEventLog({
                    abi: PRODUCT_TRACE_STORAGE_ABI,
                    data: batchCreatedEvent.data,
                    topics: batchCreatedEvent.topics,
                }) as any;

                const batchId = decoded.args.productBatchId?.toString();
                setCreatedBatchId(batchId);
                alert(`✅ Lot créé avec succès ! ID du lot: ${batchId}`);
            } else {
                console.error('❌ NewProductBatch event not found in logs');
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
                                <p className="text-sm">Vous devez approuver le contrat ProductTraceStorage avant de créer des lots.</p>
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
                        <p className="text-sm mt-2">Vous pouvez maintenant télécharger les QR codes.</p>
                    </div>
                )}

                <h1 className="text-4xl font-[Carbon_Phyber] text-[#000000] mb-6">
                    Créer un nouveau lot de produit
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Identifiant du lot *
                        </label>
                        <input
                            type="text"
                            value={batchData.identifier}
                            onChange={(e) => setBatchData({...batchData, identifier: e.target.value})}
                            className="w-full px-4 py-2 border border-[#000000] rounded-lg focus:ring-2 focus:ring-[#666666] font-[Olney_Light]"
                            placeholder="BATCH-2026-001"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Type de produit *
                        </label>
                        <input
                            type="text"
                            value={productType}
                            onChange={(e) => {
                                setProductType(e.target.value);
                                setBatchData({...batchData, productType: e.target.value});
                            }}
                            className="w-full px-4 py-2 border border-[#000000] rounded-lg focus:ring-2 focus:ring-[#666666] font-[Olney_Light]"
                            placeholder="Ex: Huile d'olive, Miel, Vin..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Description du produit
                        </label>
                        <textarea
                            value={batchData.description}
                            onChange={(e) => setBatchData({...batchData, description: e.target.value})}
                            className="w-full px-4 py-2 border border-[#000000] rounded-lg focus:ring-2 focus:ring-[#666666] font-[Olney_Light]"
                            placeholder="Décrivez votre produit, sa composition, ses caractéristiques..."
                            rows={4}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Origine / Lieu de production
                        </label>
                        <input
                            type="text"
                            value={batchData.origin}
                            onChange={(e) => setBatchData({...batchData, origin: e.target.value})}
                            className="w-full px-4 py-2 border border-[#000000] rounded-lg focus:ring-2 focus:ring-[#666666] font-[Olney_Light]"
                            placeholder="Ex: Bordeaux, France"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-[Olney_Light] text-[#000000] mb-2">
                            Date de production
                        </label>
                        <input
                            type="date"
                            value={batchData.productionDate}
                            onChange={(e) => setBatchData({...batchData, productionDate: e.target.value})}
                            className="w-full px-4 py-2 border border-[#000000] rounded-lg focus:ring-2 focus:ring-[#666666] font-[Olney_Light]"
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
                        {batchData.labelUri && (
                            <p className="text-xs font-mono text-gray-500 mt-1 break-all">
                                {batchData.labelUri}
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

                {createdBatchId && secretKeys.length > 0 && merkleTree && (
                    <div className="mt-6 space-y-4">
                        {createdBatchId !== 'pending' && createdBatchId !== 'confirmed' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-[Olney_Light] text-blue-800 mb-3">
                                    🏷️ <strong>QR Code pour l'étiquette du produit</strong>
                                </p>
                                <p className="text-xs font-[Olney_Light] text-blue-600 mb-3">
                                    Ce QR code pointe vers la page du produit et peut être collé sur votre emballage.
                                </p>
                                <button
                                    onClick={downloadBatchPageQRCode}
                                    disabled={isGeneratingQR}
                                    className="w-full bg-amber-500 text-white font-[Olney_Light] py-3 rounded-lg hover:bg-amber-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isGeneratingQR ? '🔄 Génération...' : '📥 Télécharger QR Code Étiquette'}
                                </button>
                            </div>
                        )}

                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <p className="text-sm font-[Olney_Light] text-purple-800 mb-3">
                                🎟️ <strong>QR Codes pour les consommateurs</strong>
                            </p>
                            <p className="text-xs font-[Olney_Light] text-purple-600 mb-3">
                                Ces QR codes permettent aux consommateurs de réclamer leur NFT.
                            </p>
                            <div className="space-y-2">
                                <button
                                    onClick={downloadExcelWithQRCodes}
                                    disabled={isGeneratingQR}
                                    className="w-full bg-green-600 text-white font-[Olney_Light] py-3 rounded-lg hover:bg-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isGeneratingQR ? '🔄 Génération en cours...' : '📊 Télécharger Excel avec QR codes'}
                                </button>
                                
                                <button
                                    onClick={downloadQRCodesZip}
                                    disabled={isGeneratingQR}
                                    className="w-full bg-blue-600 text-white font-[Olney_Light] py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isGeneratingQR ? '🔄 Génération en cours...' : '📦 Télécharger QR codes (ZIP)'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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