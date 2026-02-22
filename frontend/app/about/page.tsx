"use client"

import Navbar from '@/components/shared/Navbar';

const sectors = [
  { ico: '🎨', label: 'Peinture' },
  { ico: '📸', label: 'Photographie' },
  { ico: '🖼️', label: 'Collage & Mixte' },
  { ico: '🗿', label: 'Sculpture' },
  { ico: '✏️', label: 'Dessin & Gravure' },
  { ico: '🎞️', label: 'Art numérique' },
  { ico: '🪡', label: 'Textile & Fibre' },
  { ico: '✦', label: "Et bien d'autres…" },
];

const techs = ['Ethereum', 'Solidity', 'IPFS', 'Merkle Tree', 'ERC-1155', 'Next.js', 'Privy', 'Wagmi'];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f5f3ef] text-[#1c1917]">
      <Navbar />

      <div className="max-w-[860px] mx-auto px-6 pt-28 pb-20">

        {/* Header */}
        <div className="text-center mb-[72px]">
          <div className="w-[52px] h-[52px] border border-[#d6d0c8] bg-[#fafaf8] flex items-center justify-center font-serif italic text-[22px] text-[#a8a29e] mx-auto mb-6">
            起
          </div>
          <div className="text-[11px] font-normal tracking-[0.18em] uppercase text-[#a8a29e] mb-5 flex items-center justify-center gap-3">
            <span className="block w-8 h-px bg-[#d6d0c8]" />
            À propos
            <span className="block w-8 h-px bg-[#d6d0c8]" />
          </div>
          <h1 className="font-serif text-[clamp(40px,6vw,64px)] font-normal tracking-[-1.5px] leading-[1.1] mb-5">
            L'œuvre.<br />
            <em className="italic text-[#78716c]">Son histoire.</em>
          </h1>
          <p className="text-[15px] font-light leading-[1.8] text-[#78716c] max-w-[480px] mx-auto">
            Kigen certifie l'authenticité et la provenance de chaque œuvre d'art
            sur la blockchain — pour les artistes qui créent, et les collectionneurs qui font confiance.
          </p>
        </div>

        {/* Main card */}
        <div className="border border-[#d6d0c8] bg-[#fafaf8] mb-px p-10">
          <h2 className="font-serif text-[22px] font-normal mb-5">
            Qu'est-ce que <em className="italic text-[#78716c]">Kigen</em> ?
          </h2>
          <div className="text-[14px] font-light leading-[1.85] text-[#78716c]">
            <p>
              <strong className="font-medium text-[#1c1917]">Kigen</strong> est une plateforme de certification qui permet à tout artiste indépendant de prouver l'authenticité et la provenance de ses œuvres grâce à la blockchain — sans que l'acheteur n'ait besoin de comprendre comment ça fonctionne.
            </p>
            <p className="mt-3.5">
              En scannant un simple QR code au dos de l'œuvre, le collectionneur accède instantanément à son histoire complète : titre, médium, dimensions, année de création, déclaration de l'artiste. Ces informations sont enregistrées de façon <mark className="bg-transparent text-[#4a5240] font-normal">infalsifiable</mark> sur la blockchain Ethereum — personne, pas même Kigen, ne peut les modifier après publication.
            </p>
            <p className="mt-3.5">
              À chaque revente, le certificat de propriété se transfère avec l'œuvre. L'historique complet de ses propriétaires successifs est préservé pour toujours — une provenance vérifiable, permanente, et accessible à tous.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 my-8">
          <span className="flex-1 h-px bg-[#d6d0c8]" />
          <span className="font-serif italic text-[13px] text-[#a8a29e]">·</span>
          <span className="flex-1 h-px bg-[#d6d0c8]" />
        </div>

        {/* Two columns */}
        <div className="grid md:grid-cols-2 gap-px bg-[#d6d0c8] border border-[#d6d0c8] mb-px">
          <div className="bg-[#fafaf8] p-8">
            <div className="w-10 h-10 border border-[#d6d0c8] bg-[#f5f3ef] flex items-center justify-center text-[18px] mb-5">
              🎨
            </div>
            <h3 className="font-serif text-[17px] font-normal mb-2.5 text-[#1c1917]">
              Pour les artistes
            </h3>
            <p className="text-[13px] font-light leading-[1.75] text-[#78716c]">
              Enregistrez une œuvre en quelques minutes, générez votre QR code prêt à apposer, et donnez à vos acheteurs une preuve permanente de votre paternité. Protégez votre travail, valorisez votre signature, construisez votre catalogue certifié.
            </p>
          </div>
          <div className="bg-[#fafaf8] p-8">
            <div className="w-10 h-10 border border-[#d6d0c8] bg-[#f5f3ef] flex items-center justify-center text-[18px] mb-5">
              🖼️
            </div>
            <h3 className="font-serif text-[17px] font-normal mb-2.5 text-[#1c1917]">
              Pour les collectionneurs
            </h3>
            <p className="text-[13px] font-light leading-[1.75] text-[#78716c]">
              Scannez, connectez-vous avec votre email — pas besoin de wallet ni de crypto. Vérifiez l'authenticité de l'œuvre, consultez son histoire complète, et recevez votre certificat de propriété transférable lors de chaque revente.
            </p>
          </div>
        </div>

        {/* Manifeste */}
        <div className="border border-[#d6d0c8] bg-[#1c1917] p-10 mb-px">
          <div className="text-[10px] font-normal tracking-[0.15em] uppercase text-white/30 mb-4">
            Notre conviction
          </div>
          <div className="font-serif text-[clamp(20px,3vw,28px)] font-normal text-white leading-[1.4]">
            L'art n'a de valeur que si son histoire <em className="italic text-white/40">peut être prouvée</em>.<br />
            Kigen rend cette preuve permanente, accessible, et infalsifiable.
          </div>
          <div className="font-serif text-[64px] text-white/[0.04] leading-none mt-4">
            起
          </div>
        </div>

        {/* Sectors */}
        <div className="border border-[#d6d0c8] bg-[#fafaf8] p-10 mb-px">
          <h3 className="font-serif text-[17px] font-normal mb-5 text-[#1c1917]">
            Disciplines couvertes
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {sectors.map(({ ico, label }) => (
              <div key={label} className="flex items-center gap-2.5 py-2.5 px-3 border border-[#d6d0c8] bg-[#f5f3ef]">
                <span>{ico}</span>
                <span className="text-[12px] font-light text-[#78716c]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tech */}
        <div className="border border-[#d6d0c8] bg-[#ede9e3] p-10 mb-10">
          <h3 className="font-serif text-[17px] font-normal mb-1.5 text-[#1c1917]">
            Technologie
          </h3>
          <p className="text-[13px] font-light text-[#78716c] mb-5 leading-[1.7]">
            Kigen est construit sur des standards ouverts et des technologies éprouvées.
          </p>
          <div className="flex flex-wrap gap-2">
            {techs.map(t => (
              <span key={t} className="text-[11px] font-normal tracking-[0.06em] text-[#78716c] border border-[#d6d0c8] py-1 px-3 font-mono bg-[#fafaf8]">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Back */}
        <div className="text-center">
          <a
            href="/"
            className="text-[12px] font-normal tracking-[0.06em] text-[#78716c] no-underline border border-[#d6d0c8] py-3 px-7 inline-block transition-all duration-200 hover:border-[#1c1917] hover:text-[#1c1917]"
          >
            ← Retour à l'accueil
          </a>
        </div>

      </div>
    </div>
  );
}