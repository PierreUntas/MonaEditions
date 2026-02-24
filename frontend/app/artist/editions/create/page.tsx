'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { ARTWORK_REGISTRY_ADDRESS, ARTWORK_REGISTRY_ABI, ARTWORK_TOKENIZATION_ADDRESS, ARTWORK_TOKENIZATION_ABI } from '@/config/contracts';
import { uploadToIPFS, uploadFileToIPFS } from '@/app/utils/ipfs';
import Navbar from '@/components/shared/Navbar';
import { MerkleTree } from 'merkletreejs';
import { keccak256, encodeFunctionData, decodeEventLog, createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { useSendTransaction } from '@privy-io/react-auth';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';

export default function CreateEditionPage() {
    const { address } = useAccount();
    const [amount, setAmount] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isCheckingAuthorization, setIsCheckingAuthorization] = useState(true);
    const [isApproved, setIsApproved] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);
    const [secretKeys, setSecretKeys] = useState<string[]>([]);
    const [merkleRoot, setMerkleRoot] = useState<string>('');
    const [merkleTree, setMerkleTree] = useState<MerkleTree | null>(null);
    const [createdEditionId, setCreatedEditionId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [hasDownloadedKeys, setHasDownloadedKeys] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const { sendTransaction } = useSendTransaction();

    const CATEGORIES = [
        'Painting', 'Drawing', 'Sculpture', 'Photography', 'Digital Art',
        'Print', 'Textile', 'Ceramics', 'Mixed Media', 'Installation', 'Video', 'Other'
    ];

    const [editionData, setEditionData] = useState({
        title: '',
        year: new Date().getFullYear(),
        description: '',
        technique: '',
        dimensions: '',
        images: [] as string[],
        editionSize: 0,
        category: ''
    });

    const { data: artistData, isLoading: isLoadingArtist } = useReadContract({
        address: ARTWORK_REGISTRY_ADDRESS,
        abi: ARTWORK_REGISTRY_ABI,
        functionName: 'getArtist',
        args: address ? [address] : undefined,
    });

    const { data: approvalStatus, refetch: refetchApproval } = useReadContract({
        address: ARTWORK_TOKENIZATION_ADDRESS,
        abi: ARTWORK_TOKENIZATION_ABI,
        functionName: 'isApprovedForAll',
        args: address ? [address, ARTWORK_REGISTRY_ADDRESS] : undefined,
    });

    useEffect(() => {
        if (artistData) {
            const artist = artistData as any;
            setIsAuthorized(artist.authorized);
            setIsCheckingAuthorization(false);
        } else if (!isLoadingArtist && artistData !== undefined) {
            setIsCheckingAuthorization(false);
        }
    }, [artistData, isLoadingArtist]);

    useEffect(() => {
        if (approvalStatus !== undefined) {
            setIsApproved(approvalStatus as boolean);
            if (approvalStatus && isApproving) {
                setIsApproving(false);
                alert('✅ Approbation confirmée ! Vous pouvez maintenant créer des œuvres.');
            }
        }
    }, [approvalStatus, isApproving]);

    // Avertir l'utilisateur s'il essaie de quitter sans avoir téléchargé les clés
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (createdEditionId && secretKeys.length > 0 && !hasDownloadedKeys) {
                e.preventDefault();
                e.returnValue = '⚠️ ATTENTION : Vous n\'avez pas téléchargé les clés secrètes ! Si vous quittez maintenant, vous les perdrez définitivement.';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [createdEditionId, secretKeys, hasDownloadedKeys]);

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
                setEditionData(prev => ({ ...prev, editionSize: count }));

                const leaves = keys.map(key => keccak256(`0x${Buffer.from(key).toString('hex')}`));
                const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
                setMerkleTree(tree);
                setMerkleRoot(tree.getHexRoot());
            }
        } else {
            setSecretKeys([]);
            setMerkleRoot('');
            setMerkleTree(null);
            setEditionData(prev => ({ ...prev, editionSize: 0 }));
        }
    };

    // Upload one or several images to IPFS and add their CIDs to editionData.images
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setIsUploadingImage(true);
        try {
            const newCids: string[] = [];
            for (const file of files) {
                const cid = await uploadFileToIPFS(file);
                newCids.push(`ipfs://${cid}`);
            }
            setEditionData(prev => ({ ...prev, images: [...prev.images, ...newCids] }));
            alert(`✅ ${newCids.length} image${newCids.length > 1 ? 's uploadées' : ' uploadée'} sur IPFS !`);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('❌ Erreur lors de l\'upload de l\'image');
        } finally {
            setIsUploadingImage(false);
            // Reset input so the same file can be re-selected if needed
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        setEditionData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    };

    const generateQRCodeImage = async (text: string): Promise<string> => {
        return QRCode.toDataURL(text, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
        });
    };

    const downloadEditionPageQRCode = async () => {
        if (!createdEditionId || createdEditionId === 'pending' || createdEditionId === 'confirmed') return;
        setIsGeneratingQR(true);
        try {
            const editionPageUrl = `https://www.beeblock.fr/explore/edition/${createdEditionId}`;
            const qrCodeDataUrl = await QRCode.toDataURL(editionPageUrl, {
                width: 1000, margin: 4,
                color: { dark: '#000000', light: '#FFFFFF' },
                errorCorrectionLevel: 'H'
            });
            const base64Data = qrCodeDataUrl.split(',')[1];
            const blob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], { type: 'image/png' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `QR_Edition_Page_${createdEditionId}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setHasDownloadedKeys(true); // Marquer comme téléchargé
            alert(`✅ QR Code de la page du lot téléchargé avec succès !`);
        } catch (error) {
            console.error('Error generating edition page QR code:', error);
            alert('❌ Erreur lors de la génération du QR code de la page');
        } finally {
            setIsGeneratingQR(false);
        }
    };

    const downloadExcelWithQRCodes = async () => {
        if (secretKeys.length === 0 || !merkleTree || !createdEditionId) return;
        setIsGeneratingQR(true);
        try {
            const excelData = [];
            for (let index = 0; index < secretKeys.length; index++) {
                const key = secretKeys[index];
                const leaf = keccak256(Buffer.from(key));
                const proof = merkleTree.getHexProof(leaf);
                const merkleProofParam = proof.join(',');
                const claimUrl = `https://www.beeblock.fr/collector/claim?editionId=${createdEditionId}&secretKey=${key}&merkleProof=${merkleProofParam}`;
                const qrCodeDataUrl = await generateQRCodeImage(claimUrl);
                excelData.push({
                    'Index': index + 1,
                    'Secret Key': key,
                    'Merkle Proof': merkleProofParam,
                    'Claim URL': claimUrl,
                    'QR Code': qrCodeDataUrl
                });
                if ((index + 1) % 10 === 0 || index === secretKeys.length - 1) {
                    console.log(`Génération des QR codes: ${index + 1}/${secretKeys.length}`);
                }
            }
            const ws = XLSX.utils.json_to_sheet(excelData);
            ws['!cols'] = [{ wch: 8 }, { wch: 65 }, { wch: 50 }, { wch: 80 }, { wch: 40 }];
            const rowHeights = [{ hpx: 20 }];
            for (let i = 0; i < excelData.length; i++) rowHeights.push({ hpx: 150 });
            ws['!rows'] = rowHeights;
            if (!ws['!images']) ws['!images'] = [];
            for (let i = 0; i < excelData.length; i++) {
                const qrCodeBase64 = excelData[i]['QR Code'].split(',')[1];
                ws['!images'].push({
                    name: `qr_${i + 1}.png`,
                    data: qrCodeBase64,
                    opts: { positioning: { type: 'oneCellAnchor', from: { col: 4, row: i + 1 } } }
                });
            }
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Secret Keys');
            XLSX.writeFile(wb, `secret-keys-edition-${createdEditionId}-${Date.now()}.xlsx`);
            setHasDownloadedKeys(true); // Marquer comme téléchargé
            alert(`✅ Fichier Excel avec ${secretKeys.length} QR codes généré avec succès !`);
        } catch (error) {
            console.error('Error generating Excel with QR codes:', error);
            alert('❌ Erreur lors de la génération du fichier Excel avec QR codes');
        } finally {
            setIsGeneratingQR(false);
        }
    };

    const downloadQRCodesZip = async () => {
        if (secretKeys.length === 0 || !merkleTree || !createdEditionId) return;
        setIsGeneratingQR(true);
        try {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            for (let index = 0; index < secretKeys.length; index++) {
                const key = secretKeys[index];
                const leaf = keccak256(Buffer.from(key));
                const proof = merkleTree.getHexProof(leaf);
                const merkleProofParam = proof.join(',');
                const claimUrl = `https://www.beeblock.fr/collector/claim?editionId=${createdEditionId}&secretKey=${key}&merkleProof=${merkleProofParam}`;
                const qrCodeDataUrl = await generateQRCodeImage(claimUrl);
                const base64Data = qrCodeDataUrl.split(',')[1];
                zip.file(`QR_Claim_${createdEditionId}_${(index + 1).toString().padStart(5, '0')}.png`, base64Data, { base64: true });
                if ((index + 1) % 10 === 0 || index === secretKeys.length - 1) {
                    console.log(`Génération des QR codes: ${index + 1}/${secretKeys.length}`);
                }
            }
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qr-codes-claim-edition-${createdEditionId}-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setHasDownloadedKeys(true); // Marquer comme téléchargé
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
                abi: ARTWORK_TOKENIZATION_ABI,
                functionName: 'setApprovalForAll',
                args: [ARTWORK_REGISTRY_ADDRESS, true]
            });
            await sendTransaction({ to: ARTWORK_TOKENIZATION_ADDRESS, data }, { sponsor: true });
            alert('⏳ Approbation en cours... La transaction doit être confirmée sur la blockchain (~12 sec). Attendez la confirmation avant de créer votre lot.');
            const checkApproval = setInterval(async () => {
                const result = await refetchApproval();
                if (result.data === true) {
                    clearInterval(checkApproval);
                    setIsApproving(false);
                    setIsApproved(true);
                }
            }, 3000);
            setTimeout(() => { clearInterval(checkApproval); setIsApproving(false); }, 60000);
        } catch (error) {
            console.error('Error during approval:', error);
            alert('❌ Erreur lors de l\'approbation. Veuillez réessayer.');
            setIsApproving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editionData.title || !amount || !merkleRoot) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }
        if (!isApproved) {
            alert('⚠️ Vous devez d\'abord approuver le contrat');
            return;
        }

        setIsUploading(true);
        try {
            // IPFS object matching the target structure
            const artworkMetadata: {
                title: string;
                year: number;
                description: string;
                technique: string;
                dimensions: string;
                images: string[];
                editionSize: number;
                category: string;
            } = {
                title: editionData.title,
                year: editionData.year,
                description: editionData.description,
                technique: editionData.technique,
                dimensions: editionData.dimensions,
                images: editionData.images,
                editionSize: parseInt(amount),
                category: editionData.category,
            };

            const cid = await uploadToIPFS(artworkMetadata);

            setIsUploading(false);
            setIsCreating(true);

            const data = encodeFunctionData({
                abi: ARTWORK_REGISTRY_ABI,
                functionName: 'createArtworkEdition',
                args: [cid, BigInt(amount), merkleRoot as `0x${string}`]
            });

            const txHash = await sendTransaction(
                { to: ARTWORK_REGISTRY_ADDRESS, data },
                { sponsor: true }
            );

            alert('⏳ Transaction envoyée ! En attente de confirmation...');

            const publicClientInstance = createPublicClient({
                chain: sepolia,
                transport: http(process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA),
            });

            const receipt = await publicClientInstance.waitForTransactionReceipt({
                hash: txHash.hash as `0x${string}`,
            });

            const editionCreatedEvent = receipt.logs.find(log => {
                try {
                    const decoded = decodeEventLog({ abi: ARTWORK_REGISTRY_ABI, data: log.data, topics: log.topics });
                    return decoded.eventName === 'NewArtworkEdition';
                } catch { return false; }
            });

            if (editionCreatedEvent) {
                const decoded = decodeEventLog({
                    abi: ARTWORK_REGISTRY_ABI,
                    data: editionCreatedEvent.data,
                    topics: editionCreatedEvent.topics,
                }) as any;
                const editionId = decoded.args.editionId?.toString();
                setCreatedEditionId(editionId);
                alert(`✅ Œuvre créée avec succès ! ID : ${editionId}`);
            } else {
                console.error('❌ NewArtworkEdition event not found in logs');
                alert('⚠️ Transaction confirmée mais impossible de récupérer l\'ID de l\'œuvre. Vérifiez la console.');
                setCreatedEditionId('confirmed');
            }
        } catch (error) {
            console.error('Error creating artwork:', error);
            alert('❌ Erreur lors de la création de l\'œuvre');
        } finally {
            setIsUploading(false);
            setIsCreating(false);
        }
    };

    if (isCheckingAuthorization || isLoadingArtist) {
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
                    <p className="font-serif italic text-[22px] text-[#a8a29e]">Veuillez connecter votre wallet</p>
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
                                <p className="text-[13px] font-light text-[#78716c]">Vous devez approuver le contrat avant de créer des œuvres.</p>
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

                {createdEditionId && (
                    <div className="border border-[#d6d0c8] bg-[#ede9e3] p-6 mb-px">
                        <p className="text-[14px] font-medium text-[#1c1917] mb-1">✅ Œuvre créée avec succès !</p>
                        <p className="text-[13px] font-light text-[#78716c]">ID de l'œuvre : <span className="font-mono">{createdEditionId}</span></p>
                        {!hasDownloadedKeys && (
                            <p className="text-[14px] font-medium text-[#dc2626] mt-3 leading-[1.7]">
                                ⚠️ IMPORTANT : Vous devez télécharger les clés secrètes maintenant. Une fois cette page fermée, vous ne pourrez plus les récupérer !
                            </p>
                        )}
                        {hasDownloadedKeys && (
                            <p className="text-[13px] font-light text-[#16a34a] mt-2">
                                ✅ Clés secrètes téléchargées avec succès
                            </p>
                        )}
                    </div>
                )}

                <div className="text-center mb-12">
                    <img 
                        src="/logo-kigen.png" 
                        alt="Kigen Logo" 
                        className="w-[52px] h-[52px] object-contain mx-auto mb-6"
                    />
                    <h1 className="font-serif text-[clamp(32px,5vw,48px)] font-normal tracking-[-1px] text-[#1c1917] leading-tight">
                        Créer une nouvelle <em className="italic text-[#78716c]">œuvre</em>
                    </h1>
                </div>

                <div className="border border-[#d6d0c8] bg-[#fafaf8] p-8 mb-px">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Titre */}
                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Titre de l'œuvre *
                            </label>
                            <input
                                type="text"
                                value={editionData.title}
                                onChange={(e) => setEditionData({ ...editionData, title: e.target.value })}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                                placeholder="Ex: Sakura Dreams"
                                required
                            />
                        </div>

                        {/* Année */}
                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Année de création *
                            </label>
                            <input
                                type="number"
                                value={editionData.year}
                                onChange={(e) => setEditionData({ ...editionData, year: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                                min="1900"
                                max={new Date().getFullYear()}
                                required
                            />
                        </div>

                        {/* Catégorie */}
                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Catégorie
                            </label>
                            <select
                                value={editionData.category}
                                onChange={(e) => setEditionData({ ...editionData, category: e.target.value })}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] focus:outline-none focus:border-[#1c1917] transition-colors"
                            >
                                <option value="">Sélectionner une catégorie</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Technique */}
                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Technique
                            </label>
                            <input
                                type="text"
                                value={editionData.technique}
                                onChange={(e) => setEditionData({ ...editionData, technique: e.target.value })}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                                placeholder="Ex: Oil on canvas, Watercolour, Bronze..."
                            />
                        </div>

                        {/* Dimensions */}
                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Dimensions
                            </label>
                            <input
                                type="text"
                                value={editionData.dimensions}
                                onChange={(e) => setEditionData({ ...editionData, dimensions: e.target.value })}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                                placeholder="Ex: 100x150 cm"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Description
                            </label>
                            <textarea
                                value={editionData.description}
                                onChange={(e) => setEditionData({ ...editionData, description: e.target.value })}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors min-h-[120px]"
                                placeholder="Décrivez votre œuvre, la technique utilisée, les matériaux, l'inspiration..."
                            />
                        </div>

                        {/* Images */}
                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Images de l'œuvre
                            </label>
                            <input
                                type="file"
                                ref={imageInputRef}
                                onChange={handleImageUpload}
                                accept=".png,.jpg,.jpeg,.webp,.gif"
                                multiple
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                disabled={isUploadingImage}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] hover:bg-[#e7e3dc] transition-colors disabled:opacity-50 text-left"
                            >
                                {isUploadingImage ? '📤 Upload en cours…' : '🖼️ Ajouter des images (upload IPFS)'}
                            </button>
                            {editionData.images.length > 0 && (
                                <ul className="mt-3 space-y-1">
                                    {editionData.images.map((img, i) => (
                                        <li key={i} className="flex items-center justify-between gap-2 bg-[#f5f3ef] border border-[#d6d0c8] px-3 py-2">
                                            <span className="text-[11px] font-mono text-[#a8a29e] truncate">{img}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeImage(i)}
                                                className="text-[#a8a29e] hover:text-[#1c1917] transition-colors text-xs flex-shrink-0"
                                            >
                                                ×
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Nombre d'exemplaires */}
                        <div>
                            <label className="block text-[12px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-2">
                                Taille de l'édition (nombre d'exemplaires) *
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                className="w-full px-4 py-3 bg-[#f5f3ef] border border-[#d6d0c8] text-[13px] text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-colors"
                                placeholder="Ex: 50"
                                min="1"
                                max="100000"
                                required
                            />
                        </div>

                        {merkleRoot && (
                            <div className="border border-[#d6d0c8] bg-[#ede9e3] p-4">
                                <p className="text-[13px] font-medium text-[#1c1917] mb-2">✅ Merkle Root généré</p>
                                <p className="text-[11px] font-mono text-[#78716c] break-all">{merkleRoot}</p>
                                <p className="text-[12px] font-light text-[#78716c] mt-2">
                                    {secretKeys.length} clé{secretKeys.length > 1 ? 's' : ''} secrète{secretKeys.length > 1 ? 's' : ''} générée{secretKeys.length > 1 ? 's' : ''}
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

                {/* Post-création : QR codes */}
                {createdEditionId && secretKeys.length > 0 && merkleTree && (
                    <div className="space-y-px">
                        {!hasDownloadedKeys && (
                            <div className="border-2 border-[#dc2626] bg-[#fef2f2] p-6 mb-px">
                                <p className="text-[16px] font-bold text-[#dc2626] mb-3">
                                    🚨 ACTION REQUISE - TÉLÉCHARGEMENT OBLIGATOIRE
                                </p>
                                <p className="text-[14px] font-medium text-[#991b1b] mb-2 leading-[1.7]">
                                    Les clés secrètes ne sont disponibles que maintenant. Si vous quittez cette page sans les télécharger, 
                                    vos collectionneurs ne pourront JAMAIS réclamer leurs certificats.
                                </p>
                                <p className="text-[13px] font-medium text-[#991b1b] leading-[1.7]">
                                    ⚠️ Téléchargez au moins un des formats ci-dessous avant de quitter !
                                </p>
                            </div>
                        )}
                        {createdEditionId !== 'pending' && createdEditionId !== 'confirmed' && (
                            <div className="border border-[#d6d0c8] bg-[#ede9e3] p-6">
                                <p className="text-[14px] font-medium text-[#1c1917] mb-2">
                                    🏷️ QR Code pour l'étiquette de l'œuvre
                                </p>
                                <p className="text-[13px] font-light text-[#78716c] mb-4 leading-[1.7]">
                                    Ce QR code pointe vers la page de l'œuvre et peut être apposé au dos.
                                </p>
                                <button
                                    onClick={downloadEditionPageQRCode}
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
                        <span className="font-serif italic text-[13px] text-[#a8a29e]">Kigen</span>
                    </div>
                </div>
            </div>
        </div>
    );
}