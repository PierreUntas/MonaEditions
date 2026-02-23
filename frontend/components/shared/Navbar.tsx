"use client"

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContract } from "wagmi";
import { ARTWORK_REGISTRY_ADDRESS, ARTWORK_REGISTRY_ABI } from '@/config/contracts';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { login, logout, authenticated, user } = usePrivy();
    const { address } = useAccount();

    const [isOwner, setIsOwner] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isArtist, setIsArtist] = useState(false);

    const wallet = user?.wallet || user?.linkedAccounts?.find((a: any) => a.type === 'wallet');
    const walletAddress = (wallet as any)?.address;

    const { data: ownerAddress } = useReadContract({
        address: ARTWORK_REGISTRY_ADDRESS,
        abi: ARTWORK_REGISTRY_ABI,
        functionName: 'owner',
    });
    const { data: isAdminResult } = useReadContract({
        address: ARTWORK_REGISTRY_ADDRESS,
        abi: ARTWORK_REGISTRY_ABI,
        functionName: 'isAdmin',
        args: address ? [address] : undefined,
    });
    const { data: producerData } = useReadContract({
        address: ARTWORK_REGISTRY_ADDRESS,
        abi: ARTWORK_REGISTRY_ABI,
        functionName: 'getArtist',
        args: address ? [address] : undefined,
    });

    useEffect(() => {
        if (address && ownerAddress)
            setIsOwner(address.toLowerCase() === (ownerAddress as string).toLowerCase());
    }, [address, ownerAddress]);

    useEffect(() => {
        if (isAdminResult !== undefined) setIsAdmin(isAdminResult as boolean);
    }, [isAdminResult]);

    useEffect(() => {
        if (producerData) setIsArtist((producerData as any).authorized === true);
    }, [producerData]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const copyAddress = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <>
            {/* Top bar */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-10 transition-all duration-300
                    bg-[#f5f3ef]/95 backdrop-blur-md
                    ${scrolled ? 'border-b border-[#d6d0c8] shadow-sm' : 'border-b border-transparent'}`}
            >
                {/* Logo */}
                <a href="/" className="flex items-center gap-2.5 group no-underline">
                    <img 
                        src="/logo-kigen.png" 
                        alt="Kigen Logo" 
                        className="w-[34px] h-[34px] object-contain flex-shrink-0"
                    />
                    <div className="flex flex-col leading-none">
                        <span className="font-serif text-[17px] text-[#1c1917] tracking-[0.01em]">Kigen</span>
                       
                    </div>
                </a>

                {/* Center links */}
                <nav className="hidden md:flex gap-9 absolute left-1/2 -translate-x-1/2">
                    {[
                        { href: '/explore/batches', label: 'Galerie' },
                        { href: '/explore/producers', label: 'Artistes' },
                        { href: '/about', label: 'À propos' },
                    ].map(({ href, label }) => (
                        <a key={href} href={href}
                            className="text-xs font-normal tracking-[0.06em] text-[#78716c] no-underline
                                pb-0.5 border-b border-transparent
                                hover:text-[#1c1917] hover:border-[#1c1917] transition-all duration-200">
                            {label}
                        </a>
                    ))}
                </nav>

                {/* Right */}
                <div className="flex items-center gap-2.5">
                    {authenticated ? (
                        <div
                            onClick={() => setIsOpen(!isOpen)}
                            className="w-8 h-8 border border-[#d6d0c8] bg-[#fafaf8] flex items-center justify-center
                                font-serif italic text-sm text-[#78716c] cursor-pointer
                                hover:border-[#1c1917] hover:text-[#1c1917] transition-all duration-200">
                            {user?.email?.address?.[0]?.toUpperCase() ?? '?'}
                        </div>
                    ) : (
                        <button
                            onClick={login}
                            className="text-[11px] font-medium tracking-[0.08em] text-[#1c1917] bg-transparent
                                border border-[#d6d0c8] px-[18px] py-[7px] cursor-pointer
                                hover:bg-[#1c1917] hover:text-[#f5f3ef] hover:border-[#1c1917] transition-all duration-200">
                            Connexion
                        </button>
                    )}

                    {/* Hamburger */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-8 h-8 border border-[#d6d0c8] bg-[#fafaf8] flex flex-col items-center justify-center gap-1
                            cursor-pointer hover:border-[#1c1917] transition-all duration-200 p-0"
                        aria-label="Menu"
                    >
                        <span className={`block w-3.5 h-px bg-[#78716c] transition-all duration-250
                            ${isOpen ? 'translate-y-[5px] rotate-45' : ''}`} />
                        <span className={`block w-3.5 h-px bg-[#78716c] transition-all duration-250
                            ${isOpen ? 'opacity-0' : ''}`} />
                        <span className={`block w-3.5 h-px bg-[#78716c] transition-all duration-250
                            ${isOpen ? '-translate-y-[5px] -rotate-45' : ''}`} />
                    </button>
                </div>
            </header>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-[#1c1917]/40 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Slide panel */}
            <nav className={`fixed top-0 right-0 h-screen w-[300px] z-50 bg-[#f5f3ef] border-l border-[#d6d0c8]
                flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                <div className="flex flex-col h-full pt-20">

                    {/* Auth section */}
                    <div className="px-6 pb-5 border-b border-[#d6d0c8]">
                        {authenticated ? (
                            <div className="space-y-2.5">
                                <div className="border border-[#d6d0c8] bg-[#fafaf8] p-3.5">
                                    <p className="text-[9px] font-medium tracking-[0.15em] uppercase text-[#a8a29e] mb-1.5">
                                        Connecté
                                    </p>
                                    {user?.email?.address && (
                                        <p className="text-[13px] text-[#1c1917] truncate mb-1">
                                            {user.email.address}
                                        </p>
                                    )}
                                    {walletAddress && (
                                        <button
                                            onClick={copyAddress}
                                            className="text-[11px] font-mono text-[#78716c] bg-transparent border-0 p-0
                                                cursor-pointer flex items-center gap-2 w-full">
                                            <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                                            <span className="ml-auto text-[#4a5240]">{copied ? '✓' : '⧉'}</span>
                                        </button>
                                    )}
                                    {(isOwner || isAdmin || isArtist) && (
                                        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-[#e7e3dc]">
                                            {isOwner && <RoleBadge>Propriétaire</RoleBadge>}
                                            {isAdmin && <RoleBadge>Administrateur</RoleBadge>}
                                            {isArtist && <RoleBadge>Artiste</RoleBadge>}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => { logout(); setIsOpen(false); }}
                                    className="w-full text-xs font-normal text-[#78716c] bg-transparent
                                        border border-[#d6d0c8] py-2.5 cursor-pointer
                                        hover:border-[#1c1917] hover:text-[#1c1917] transition-all duration-200">
                                    Déconnexion
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => { login(); setIsOpen(false); }}
                                className="w-full text-xs font-medium tracking-[0.06em] text-[#f5f3ef] bg-[#1c1917]
                                    border-0 py-3 cursor-pointer hover:opacity-80 transition-opacity duration-200">
                                Se connecter
                            </button>
                        )}
                    </div>

                    {/* Nav links */}
                    <div className="flex-1 px-6 py-4 overflow-y-auto space-y-0.5">
                        <PanelLink href="/" onClick={() => setIsOpen(false)}>Accueil</PanelLink>

                        <PanelDivider>Explorer</PanelDivider>
                        <PanelLink href="/explore/batches" onClick={() => setIsOpen(false)}>Galerie d'œuvres</PanelLink>
                        <PanelLink href="/explore/producers" onClick={() => setIsOpen(false)}>Artistes</PanelLink>

                        <PanelDivider>Informations</PanelDivider>
                        <PanelLink href="/about" onClick={() => setIsOpen(false)}>À propos</PanelLink>

                        {(isOwner || isAdmin) && (
                            <>
                                <PanelDivider>Administration</PanelDivider>
                                {isOwner && <PanelLink href="/owner" onClick={() => setIsOpen(false)}>Propriétaire</PanelLink>}
                                {isAdmin && <PanelLink href="/admin" onClick={() => setIsOpen(false)}>Administrateur</PanelLink>}
                            </>
                        )}

                        {authenticated && (
                            <>
                                <PanelDivider>Collectionneur</PanelDivider>
                                <PanelLink href="/consumer" onClick={() => setIsOpen(false)}>Mes œuvres</PanelLink>
                            </>
                        )}

                        {isArtist && (
                            <>
                                <PanelDivider>Artiste</PanelDivider>
                                <PanelLink href="/producer" onClick={() => setIsOpen(false)}>Mon profil</PanelLink>
                                <PanelLink href="/producer/batches" onClick={() => setIsOpen(false)}>Mes œuvres</PanelLink>
                                <PanelLink href="/producer/batches/create" onClick={() => setIsOpen(false)}>Certifier une œuvre</PanelLink>
                            </>
                        )}
                    </div>

                    {/* Panel footer */}
                    <div className="px-6 py-4 border-t border-[#d6d0c8] flex items-center justify-between">
                        <span className="font-serif italic text-[13px] text-[#a8a29e]">Kigen</span>
                        <span className="flex items-center gap-1.5 text-[10px] font-light text-[#a8a29e]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4a5240] inline-block" />
                            Sepolia · Actif
                        </span>
                    </div>
                </div>
            </nav>
        </>
    );
}

function PanelLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
    return (
        <a href={href} onClick={onClick}
            className="block text-[13px] font-light text-[#78716c] no-underline
                px-3 py-2.5 border-l border-transparent
                hover:text-[#1c1917] hover:border-l-[#1c1917] hover:pl-4 hover:bg-[#1c1917]/[0.03]
                transition-all duration-150">
            {children}
        </a>
    );
}

function PanelDivider({ children }: { children: React.ReactNode }) {
    return (
        <div className="pt-4 pb-1.5 px-3">
            <p className="text-[9px] font-medium tracking-[0.15em] uppercase text-[#a8a29e]">
                {children}
            </p>
        </div>
    );
}

function RoleBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="text-[10px] font-medium tracking-[0.06em] text-[#4a5240]
            border border-[#4a5240] px-2 py-0.5">
            {children}
        </span>
    );
}