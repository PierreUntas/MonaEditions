"use client";

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useReadContract } from 'wagmi';
import { useEffect, useState } from 'react';
import { ARTWORK_REGISTRY_ADDRESS, ARTWORK_REGISTRY_ABI } from '@/config/contracts';

const Footer = () => {
    const { authenticated } = usePrivy();
    const { address } = useAccount();
    const [isArtist, setIsArtist] = useState(false);

    const { data: producerData } = useReadContract({
        address: ARTWORK_REGISTRY_ADDRESS,
        abi: ARTWORK_REGISTRY_ABI,
        functionName: 'getArtist',
        args: address ? [address] : undefined,
    });

    useEffect(() => {
        if (producerData) setIsArtist((producerData as any).authorized === true);
    }, [producerData]);

    const colCount = 2 + (authenticated ? 1 : 0) + (isArtist ? 1 : 0);
    const gridClass = {
        2: 'md:grid-cols-2',
        3: 'md:grid-cols-3',
        4: 'md:grid-cols-4',
    }[colCount] ?? 'md:grid-cols-2';

    return (
        <footer className="bg-[#f5f3ef] border-t border-[#d6d0c8] mt-auto">
            <div className="max-w-6xl mx-auto px-6 py-16">

                {/* Top row — sections conditionnelles */}
                <div className={`grid grid-cols-1 ${gridClass} gap-12 pb-12 border-b border-[#d6d0c8]`}>

                    {/* Brand */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 border border-[#d6d0c8] bg-[#fafaf8] flex items-center justify-center font-serif italic text-[15px] text-[#a8a29e]">
                                起
                            </div>
                            <span className="font-serif text-[18px] font-normal text-[#1c1917] tracking-[-0.3px]">
                                Kigen
                            </span>
                        </div>
                        <p className="text-[13px] font-light text-[#78716c] leading-[1.7] max-w-[220px]">
                            Certification d'œuvres d'art sur la blockchain. Authenticité permanente, vérifiable par tous.
                        </p>
                    </div>

                    {/* Explorer — toujours visible */}
                    <div className="flex flex-col gap-4">
                        <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-[#a8a29e]">
                            Explorer
                        </p>
                        <nav className="flex flex-col gap-2.5">
                            <FooterLink href="/explore/batches">Galerie d'œuvres</FooterLink>
                            <FooterLink href="/explore/producers">Artistes</FooterLink>
                            <FooterLink href="/about">À propos</FooterLink>
                        </nav>
                    </div>

                    {/* Collectionneur — connecté uniquement */}
                    {authenticated && (
                        <div className="flex flex-col gap-4">
                            <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-[#a8a29e]">
                                Collectionneur
                            </p>
                            <nav className="flex flex-col gap-2.5">
                                <FooterLink href="/consumer">Mes certificats</FooterLink>
                                <FooterLink href="/consumer/claim">Réclamer un certificat</FooterLink>
                            </nav>
                        </div>
                    )}

                    {/* Espace artiste — artiste autorisé uniquement */}
                    {isArtist && (
                        <div className="flex flex-col gap-4">
                            <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-[#a8a29e]">
                                Espace artiste
                            </p>
                            <nav className="flex flex-col gap-2.5">
                                <FooterLink href="/producer">Dashboard</FooterLink>
                                <FooterLink href="/producer/batches">Mes œuvres</FooterLink>
                                <FooterLink href="/producer/batches/create">Certifier une œuvre</FooterLink>
                            </nav>
                        </div>
                    )}
                </div>

                {/* Contact + Légal — ligne unique */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-6 border-b border-[#d6d0c8]">
                    <a href="mailto:contact@kigen.art" className="text-[12px] font-light text-[#78716c] hover:text-[#1c1917] transition-colors no-underline">contact@kigen.art</a>
                    <span className="text-[#d6d0c8]">·</span>
                    <FooterLink href="/contact">Nous contacter</FooterLink>
                    <span className="text-[#d6d0c8]">·</span>
                    <FooterLink href="/faq">FAQ</FooterLink>
                    <span className="text-[#d6d0c8]">·</span>
                    <FooterLink href="/legal/mentions">Mentions légales</FooterLink>
                    <span className="text-[#d6d0c8]">·</span>
                    <FooterLink href="/legal/cgu">CGU</FooterLink>
                    <span className="text-[#d6d0c8]">·</span>
                    <FooterLink href="/legal/confidentialite">Confidentialité</FooterLink>
                </div>

                {/* Copyright */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8">
                    <div className="flex items-center gap-3">
                        <div className="w-px h-4 bg-[#d6d0c8]" />
                        <span className="font-serif italic text-[13px] text-[#a8a29e]">起 Kigen</span>
                    </div>
                    <p className="text-[12px] font-light text-[#a8a29e] tracking-[0.04em]">
                        &copy; Kigen {new Date().getFullYear()} — Tous droits réservés
                    </p>
                </div>
            </div>
        </footer>
    );
};

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link href={href} className="text-[13px] font-light text-[#78716c] hover:text-[#1c1917] transition-colors no-underline">
            {children}
        </Link>
    );
}

export default Footer;