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
            <div className="min-h-screen bg-[#f5f3ef]">
                <Navbar />
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-4">
                    <div className="w-8 h-8 border border-[#d6d0c8] border-t-[#1c1917] rounded-full animate-spin" />
                    <p className="text-[13px] font-light text-[#a8a29e] tracking-[0.06em]">Vérification des permissions…</p>
                </div>
            </div>
        );
    }

    if (!address) {
        return (
            <div className="min-h-screen bg-[#f5f3ef]">
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                    <p className="font-serif italic text-[22px] text-[#a8a29e]">
                        Veuillez connecter votre wallet
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#f5f3ef]">
                <Navbar />
                <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                    <p className="font-serif italic text-[22px] text-[#a8a29e] text-center max-w-md px-6">
                        Accès refusé : vous n'êtes pas autorisé comme artiste
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f3ef]">
            <Navbar />
            <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
                {isAuthorized && !isApproved && (
                    <div className="border border-[#d6d0c8] bg-[#ede9e3] p-6 mb-px">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[14px] font-medium text-[#1c1917] mb-1">⚠️ Action requise</p>
                                <p className="text-[13px] font-light text-[#78716c]">Vous devez approuver le contrat ProductTraceStorage avant de créer des œuvres.</p>
                            </div>
                            <button
                                onClick={handleApprove}
                                disabled={isApproving}
                                className="bg-[#1c1917] text-[#fafaf8] font-medium text-[12px] tracking-[0.06em] py-3 px-6 border border-[#1c1917] disabled:opacity-50 hover:bg-[#292524] transition-all duration-200 whitespace-nowrap"
                            >
                                {isApproving ? '⏳ En cours…' : '✅ Approuver'}
                            </button>
                        </div>
                    </div>
                )}

                {createdBatchId && (
                    <div className="border border-[#d6d0c8] bg-[#ede9e3] p-6 mb-px">
                        <p className="text-[14px] font-medium text-[#1c1917] mb-1">✅ Œuvre créée avec succès !</p>
                        <p className="text-[13px] font-light text-[#78716c]">ID de l'œuvre: <span className="font-mono">{createdBatchId}</span></p>
                        <p className="text-[13px] font-light text-[#78716c] mt-2">Vous pouvez maintenant télécharger les QR codes.</p>
                    </div>
                )}

                <div className="text-center mb-12">
                    <div className="w-[52px] h-[52px] border border-[#d6d0c8] bg-[#fafaf8] flex items-center justify-center font-serif italic text-[22px] text-[#a8a29e] mx-auto mb-6">
                        起
                    </div>
                    <h1 className="font-serif text-[clamp(32px,5vw,48px)] font-normal tracking-[-1px] text-[#1c1917] leading-tight">
                        Créer une nouvelle <em className="italic text-[#78716c]">œuvre</em>
                    </h1>
                </div>

                <div className="border border-[#d6d0c8] bg-[#fafaf8] p-8 mb-px">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Identifiant de l'œuvre *
                            </label>
                            <input
                                type="text"
                                value={batchData.identifier}
                                onChange={(e) => setBatchData({...batchData, identifier: e.target.value})}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                                placeholder="OEUVRE-2026-001"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Titre de l'œuvre *
                            </label>
                            <input
                                type="text"
                                value={productType}
                                onChange={(e) => {
                                    setProductType(e.target.value);
                                    setBatchData({...batchData, productType: e.target.value});
                                }}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                                placeholder="Ex: Paysage d'automne, Portrait abstrait..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Description de l'œuvre
                            </label>
                            <textarea
                                value={batchData.description}
                                onChange={(e) => setBatchData({...batchData, description: e.target.value})}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors min-h-[120px]"
                                placeholder="Décrivez votre œuvre, la technique utilisée, les matériaux..."
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Lieu de création
                            </label>
                            <input
                                type="text"
                                value={batchData.origin}
                                onChange={(e) => setBatchData({...batchData, origin: e.target.value})}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                                placeholder="Ex: Paris, France"
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Date de création
                            </label>
                            <input
                                type="date"
                                value={batchData.productionDate}
                                onChange={(e) => setBatchData({...batchData, productionDate: e.target.value})}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Visuel de l'œuvre (PDF, Image)
                            </label>
                            <input
                                type="file"
                                ref={labelInputRef}
                                onChange={handleLabelUpload}
                                accept=".pdf,.png,.jpg,.jpeg"
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => labelInputRef.current?.click()}
                                disabled={isUploadingLabel}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] hover:bg-[#e7e3dc] transition-colors disabled:opacity-50 text-left"
                            >
                                {isUploadingLabel ? '📤 Upload en cours…' : '📎 Choisir un fichier'}
                            </button>
                            {labelFileName && (
                                <p className="text-[12px] font-light text-[#1c1917] mt-2">
                                    ✅ {labelFileName}
                                </p>
                            )}
                            {batchData.labelUri && (
                                <p className="text-[11px] font-mono text-[#a8a29e] mt-1 break-all">
                                    {batchData.labelUri}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Nombre d'exemplaires *
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                                placeholder="Ex: 100"
                                min="1"
                                max="100000"
                                required
                            />
                        </div>

                        {merkleRoot && (
                            <div className="border border-[#d6d0c8] bg-[#ede9e3] p-4">
                                <p className="text-[13px] font-medium text-[#1c1917] mb-2">
                                    ✅ Merkle Root généré
                                </p>
                                <p className="text-[11px] font-mono text-[#78716c] break-all">
                                    {merkleRoot}
                                </p>
                                <p className="text-[12px] font-light text-[#78716c] mt-2">
                                    {secretKeys.length} clés secrètes générées
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isCreating || isUploading || !merkleRoot || !isApproved}
                            className="w-full bg-[#1c1917] text-[#fafaf8] font-medium text-[12px] tracking-[0.06em] py-3.5 px-8 border border-[#1c1917] disabled:opacity-50 hover:bg-[#292524] transition-all duration-200"
                        >
                            {isUploading
                                ? '📤 Upload IPFS…'
                                : isCreating
                                    ? '⏳ Création en cours…'
                                    : '✨ Créer l\'œuvre'}
                        </button>
                    </form>
                </div>

                {createdBatchId && secretKeys.length > 0 && merkleTree && (
                    <div className="space-y-px">
                        {createdBatchId !== 'pending' && createdBatchId !== 'confirmed' && (
                            <div className="border border-[#d6d0c8] bg-[#ede9e3] p-6">
                                <p className="text-[14px] font-medium text-[#1c1917] mb-2">
                                    🏷️ QR Code pour l'étiquette de l'œuvre
                                </p>
                                <p className="text-[13px] font-light text-[#78716c] mb-4 leading-[1.7]">
                                    Ce QR code pointe vers la page de l'œuvre et peut être apposé au dos.
                                </p>
                                <button
                                    onClick={downloadBatchPageQRCode}
                                    disabled={isGeneratingQR}
                                    className="w-full bg-[#1c1917] text-[#fafaf8] font-medium text-[12px] tracking-[0.06em] py-3.5 px-8 border border-[#1c1917] disabled:opacity-50 hover:bg-[#292524] transition-all duration-200"
                                >
                                    {isGeneratingQR ? '🔄 Génération…' : '📥 Télécharger QR Code Œuvre'}
                                </button>
                            </div>
                        )}

                        <div className="border border-[#d6d0c8] bg-[#fafaf8] p-6">
                            <p className="text-[14px] font-medium text-[#1c1917] mb-2">
                                🎟️ QR Codes pour les collectionneurs
                            </p>
                            <p className="text-[13px] font-light text-[#78716c] mb-4 leading-[1.7]">
                                Ces QR codes permettent aux collectionneurs de réclamer leur certificat numérique.
                            </p>
                            <div className="space-y-2">
                                <button
                                    onClick={downloadExcelWithQRCodes}
                                    disabled={isGeneratingQR}
                                    className="w-full bg-[#1c1917] text-[#fafaf8] font-medium text-[12px] tracking-[0.06em] py-3.5 px-8 border border-[#1c1917] disabled:opacity-50 hover:bg-[#292524] transition-all duration-200"
                                >
                                    {isGeneratingQR ? '🔄 Génération en cours…' : '📊 Télécharger Excel avec QR codes'}
                                </button>
                                
                                <button
                                    onClick={downloadQRCodesZip}
                                    disabled={isGeneratingQR}
                                    className="w-full bg-[#1c1917] text-[#fafaf8] font-medium text-[12px] tracking-[0.06em] py-3.5 px-8 border border-[#1c1917] disabled:opacity-50 hover:bg-[#292524] transition-all duration-200"
                                >
                                    {isGeneratingQR ? '🔄 Génération en cours…' : '📦 Télécharger QR codes (ZIP)'}
                                </button>
                            </div>
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