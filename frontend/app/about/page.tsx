"use client"

import Navbar from '@/components/shared/Navbar';

export default function AboutPage() {
    return (
        <div className="min-h-screen" style={{ background: '#07080B', color: '#F2F4F8' }}>
            <Navbar />

            <div className="max-w-4xl mx-auto px-6 py-28">

                {/* Header */}
                <div className="text-center mb-16">
                    {/* Logo mark */}
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6"
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
                    <p
                        className="text-xs tracking-[5px] uppercase mb-4"
                        style={{ color: '#C9A55A' }}
                    >
                        À propos
                    </p>
                    <h1
                        className="text-5xl font-bold mb-4"
                        style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                            letterSpacing: '-1.5px',
                            lineHeight: 1.1,
                        }}
                    >
                        L'origine, <em style={{ fontStyle: 'italic', color: '#C9A55A' }}>prouvée.</em>
                    </h1>
                    <p style={{ color: '#8C95AA', fontSize: '17px', fontWeight: 300, lineHeight: 1.75 }}>
                        Kigen redonne de la confiance entre producteurs et consommateurs,<br />
                        pour tous les produits authentiques.
                    </p>
                </div>

                {/* Main card */}
                <div
                    className="rounded-2xl p-10 mb-6"
                    style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <h2
                        className="text-2xl font-bold mb-6"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#F2F4F8' }}
                    >
                        Qu'est-ce que Kigen ?
                    </h2>
                    <div className="space-y-5" style={{ color: '#8C95AA', fontSize: '15px', lineHeight: 1.85, fontWeight: 300 }}>
                        <p>
                            <span style={{ color: '#F2F4F8', fontWeight: 500 }}>Kigen</span> est une plateforme de traçabilité qui permet à n'importe quel producteur de prouver l'origine et l'authenticité de ses produits grâce à la blockchain — sans que le consommateur n'ait besoin de comprendre comment ça fonctionne.
                        </p>
                        <p>
                            En scannant un simple QR code sur le produit, le consommateur accède instantanément à son histoire complète : origine, producteur, lot, certifications, analyses. Ces informations sont enregistrées de façon <span style={{ color: '#C9A55A' }}>infalsifiable</span> sur la blockchain Ethereum — personne, pas même Kigen, ne peut les modifier après publication.
                        </p>
                        <p>
                            Un second QR code, placé sous le couvercle ou l'opercule, permet aux vrais acheteurs de laisser un avis vérifié par preuve cryptographique. Fini les faux avis.
                        </p>
                    </div>
                </div>

                {/* Two columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div
                        className="rounded-2xl p-8"
                        style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5"
                            style={{ background: 'rgba(201,165,90,0.07)', border: '1px solid rgba(201,165,90,0.15)' }}
                        >
                            🏭
                        </div>
                        <h3 className="text-lg font-bold mb-3" style={{ color: '#F2F4F8' }}>Pour les producteurs</h3>
                        <p style={{ color: '#8C95AA', fontSize: '14px', lineHeight: 1.75, fontWeight: 300 }}>
                            Créez un lot en 2 minutes, téléchargez vos QR codes prêts à imprimer, et donnez à vos clients une preuve tangible de votre sérieux. Valorisez votre travail, différenciez-vous de la concurrence, collectez des avis que vous méritez vraiment.
                        </p>
                    </div>
                    <div
                        className="rounded-2xl p-8"
                        style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5"
                            style={{ background: 'rgba(201,165,90,0.07)', border: '1px solid rgba(201,165,90,0.15)' }}
                        >
                            🛒
                        </div>
                        <h3 className="text-lg font-bold mb-3" style={{ color: '#F2F4F8' }}>Pour les consommateurs</h3>
                        <p style={{ color: '#8C95AA', fontSize: '14px', lineHeight: 1.75, fontWeight: 300 }}>
                            Scannez, connectez-vous avec votre email — pas besoin de wallet ni de crypto. Explorez l'histoire complète de votre produit, vérifiez les certifications, et laissez un avis authentique que la communauté peut vraiment faire confiance.
                        </p>
                    </div>
                </div>

                {/* Sectors */}
                <div
                    className="rounded-2xl p-8 mb-6"
                    style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <h3 className="text-lg font-bold mb-5" style={{ color: '#F2F4F8' }}>Secteurs couverts</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { ico: '🍯', label: 'Apiculture' },
                            { ico: '🫒', label: 'Huile d\'olive' },
                            { ico: '🍷', label: 'Vins & Spiritueux' },
                            { ico: '🧀', label: 'Fromagerie' },
                            { ico: '💄', label: 'Cosmétiques' },
                            { ico: '👗', label: 'Textile' },
                            { ico: '🌿', label: 'Herboristerie' },
                            { ico: '✦', label: 'Et bien d\'autres…' },
                        ].map(({ ico, label }) => (
                            <div
                                key={label}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                <span className="text-lg">{ico}</span>
                                <span style={{ color: '#8C95AA', fontSize: '13px' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tech stack */}
                <div
                    className="rounded-2xl p-8 mb-10"
                    style={{ background: '#0F1219', border: '1px solid rgba(201,165,90,0.12)' }}
                >
                    <h3 className="text-lg font-bold mb-2" style={{ color: '#F2F4F8' }}>Technologie</h3>
                    <p className="mb-5" style={{ color: '#8C95AA', fontSize: '14px', lineHeight: 1.7, fontWeight: 300 }}>
                        Kigen est construit sur des standards ouverts et des technologies éprouvées.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {['Ethereum', 'Solidity', 'IPFS', 'Merkle Tree', 'ERC-1155', 'Next.js', 'Privy', 'Wagmi'].map(tech => (
                            <span
                                key={tech}
                                className="text-xs px-3 py-1.5 rounded-full font-mono"
                                style={{
                                    background: 'rgba(201,165,90,0.07)',
                                    color: '#C9A55A',
                                    border: '1px solid rgba(201,165,90,0.15)',
                                }}
                            >
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Back link */}
                <div className="text-center">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:border-white/15 hover:text-white/90"
                        style={{
                            color: '#8C95AA',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'transparent',
                        }}
    
                    >
                        ← Retour à l'accueil
                    </a>
                </div>
            </div>
        </div>
    );
}