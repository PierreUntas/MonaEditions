"use client"

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContract } from "wagmi";
import { PRODUCT_TRACE_STORAGE_ADDRESS, PRODUCT_TRACE_STORAGE_ABI } from '@/config/contracts';
import { useTheme } from '@/app/context/ThemeContext';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const { login, logout, authenticated, user } = usePrivy();
    const { address } = useAccount();
    const { theme, toggleTheme } = useTheme();

    const [isOwner, setIsOwner] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isProducer, setIsProducer] = useState(false);

    const wallet = user?.wallet || user?.linkedAccounts?.find((account: any) => account.type === 'wallet');
    const walletAddress = (wallet as any)?.address;

    const { data: ownerAddress } = useReadContract({
        address: PRODUCT_TRACE_STORAGE_ADDRESS,
        abi: PRODUCT_TRACE_STORAGE_ABI,
        functionName: 'owner',
    });

    const { data: isAdminResult } = useReadContract({
        address: PRODUCT_TRACE_STORAGE_ADDRESS,
        abi: PRODUCT_TRACE_STORAGE_ABI,
        functionName: 'isAdmin',
        args: address ? [address] : undefined,
    });

    const { data: producerData } = useReadContract({
        address: PRODUCT_TRACE_STORAGE_ADDRESS,
        abi: PRODUCT_TRACE_STORAGE_ABI,
        functionName: 'getProducer',
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
        if (producerData) setIsProducer((producerData as any).authorized === true);
    }, [producerData]);

    const copyAddress = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <>
            {/* Logo */}
            <a href="/" className="fixed top-5 left-6 z-50 flex items-center gap-3 group">
                <div
                    className="w-9 h-9 flex items-center justify-center transition-all duration-300 relative"
                    style={{
                        background: '#c0392b',
                        borderRadius: '6px',
                        boxShadow: theme === 'light' 
                            ? '0 0 12px rgba(192,57,43,0.3)' 
                            : '0 0 20px rgba(192,57,43,0.5)',
                    }}
                >
                    <div
                        className="absolute inset-0"
                        style={{
                            border: '1px solid rgba(255,107,107,0.5)',
                            borderRadius: '6px',
                            margin: '3px',
                        }}
                    />
                    <span
                        style={{
                            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', sans-serif",
                            fontSize: '20px',
                            color: 'white',
                            fontWeight: 500,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        起
                    </span>
                </div>
                <div className="flex flex-col leading-none">
                    <span
                        className="text-sm font-bold tracking-[4px] uppercase transition-colors duration-300"
                        style={{ 
                            color: theme === 'light' ? '#1a1008' : '#fdf6e3', 
                            letterSpacing: '4px' 
                        }}
                    >
                        Kigen
                    </span>
                    <span
                        className="text-[8.5px] tracking-[2.5px] uppercase font-normal opacity-70"
                        style={{ color: '#c0392b' }}
                    >
                        起源 · Origine
                    </span>
                </div>
            </a>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    style={{ background: 'rgba(26,16,8,0.5)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Menu Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed top-5 right-16 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
                style={{
                    background: theme === 'light' 
                        ? 'rgba(255,255,255,0.9)' 
                        : 'rgba(40,30,18,0.9)',
                    border: theme === 'light' ? '1px solid #c8b89a' : '1px solid #5a4a2a',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <div className="relative w-5 h-4">
                    <span
                        className="absolute left-0 block w-5 h-px transition-all duration-300"
                        style={{
                            background: '#c0392b',
                            top: isOpen ? '7px' : '0px',
                            transform: isOpen ? 'rotate(45deg)' : 'none',
                        }}
                    />
                    <span
                        className="absolute left-0 block w-5 h-px transition-all duration-300"
                        style={{
                            background: '#c0392b',
                            top: '7px',
                            opacity: isOpen ? 0 : 1,
                        }}
                    />
                    <span
                        className="absolute left-0 block w-5 h-px transition-all duration-300"
                        style={{
                            background: '#c0392b',
                            top: isOpen ? '7px' : '14px',
                            transform: isOpen ? 'rotate(-45deg)' : 'none',
                        }}
                    />
                </div>
            </button>

            {/* Theme Toggle Button */}
            <button
                onClick={toggleTheme}
                className="fixed top-5 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
                style={{
                    background: theme === 'light' 
                        ? 'rgba(255,255,255,0.9)' 
                        : 'rgba(40,30,18,0.9)',
                    border: theme === 'light' ? '1px solid #c8b89a' : '1px solid #5a4a2a',
                    backdropFilter: 'blur(12px)',
                }}
                title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
            >
                {theme === 'light' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5"/>
                        <line x1="12" y1="1" x2="12" y2="3"/>
                        <line x1="12" y1="21" x2="12" y2="23"/>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                        <line x1="1" y1="12" x2="3" y2="12"/>
                        <line x1="21" y1="12" x2="23" y2="12"/>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                )}
            </button>

            {/* Slide Menu */}
            <nav
                className={`fixed top-0 right-0 h-screen w-80 z-40 transform transition-transform duration-300 overflow-y-auto`}
                style={{
                    background: theme === 'light'
                        ? 'linear-gradient(to bottom, #fdf6e3, #f5ead0)'
                        : 'linear-gradient(to bottom, #1a1008, #281e12)',
                    backdropFilter: 'blur(24px)',
                    borderLeft: theme === 'light' ? '2px solid #c8b89a' : '2px solid #5a4a2a',
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                }}
            >
                <div className="flex flex-col min-h-full pt-24 pb-8 px-6">

                    {/* Auth section */}
                    <div className="mb-6 pb-5" style={{ 
                        borderBottom: theme === 'light' ? '1px solid #c8b89a' : '1px solid #5a4a2a' 
                    }}>
                        {authenticated ? (
                            <div className="space-y-3">
                                <div
                                    className="py-3 px-4 rounded-xl"
                                    style={{ 
                                        background: theme === 'light' 
                                            ? 'rgba(255,255,255,0.6)' 
                                            : 'rgba(40,30,18,0.6)', 
                                        border: theme === 'light' ? '1px solid #c8b89a' : '1px solid #5a4a2a' 
                                    }}
                                >
                                    <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ 
                                        color: theme === 'light' ? '#5a4a2a' : '#c8b89a' 
                                    }}>
                                        Connecté en tant que
                                    </p>
                                    {user?.email?.address && (
                                        <p className="text-sm font-medium truncate" style={{ 
                                            color: theme === 'light' ? '#1a1008' : '#fdf6e3' 
                                        }}>
                                            {user.email.address}
                                        </p>
                                    )}
                                    {walletAddress && (
                                        <button
                                            onClick={copyAddress}
                                            className="text-xs font-mono mt-1.5 flex items-center gap-2 w-full transition-colors duration-200"
                                            style={{ color: theme === 'light' ? '#5a4a2a' : '#c8b89a' }}
                                        >
                                            <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                                            <span className="text-[10px] ml-auto" style={{ color: '#c0392b' }}>
                                                {copied ? '✓ Copié' : '⧉'}
                                            </span>
                                        </button>
                                    )}
                                    {(isOwner || isAdmin || isProducer) && (
                                        <div className="mt-3 pt-2" style={{ 
                                            borderTop: theme === 'light' ? '1px solid #c8b89a' : '1px solid #5a4a2a' 
                                        }}>
                                            <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ 
                                                color: theme === 'light' ? '#5a4a2a' : '#c8b89a' 
                                            }}>
                                                Rôles
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {isOwner && (
                                                    <span className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                                                        style={{ background: 'rgba(192,57,43,0.12)', color: '#c0392b', border: '1px solid rgba(192,57,43,0.3)' }}>
                                                        Propriétaire
                                                    </span>
                                                )}
                                                {isAdmin && (
                                                    <span className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                                                        style={{ background: 'rgba(192,57,43,0.12)', color: '#c0392b', border: '1px solid rgba(192,57,43,0.3)' }}>
                                                        Administrateur
                                                    </span>
                                                )}
                                                {isProducer && (
                                                    <span className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                                                        style={{ background: 'rgba(192,57,43,0.12)', color: '#c0392b', border: '1px solid rgba(192,57,43,0.3)' }}>
                                                        Producteur
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => { logout(); setIsOpen(false); }}
                                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
                                    style={{ background: 'rgba(255,255,255,0.5)', color: '#5a4a2a', border: '1px solid #c8b89a' }}
                                >
                                    Déconnexion
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => { login(); setIsOpen(false); }}
                                className="w-full py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer"
                                style={{
                                    background: '#c0392b',
                                    color: '#fdf6e3',
                                    boxShadow: '0 4px 20px rgba(192,57,43,0.3)',
                                }}
                            >
                                Se connecter
                            </button>
                        )}
                    </div>

                    {/* Nav links */}
                    <div className="flex-1 space-y-1">
                        <NavLink href="/" onClick={() => setIsOpen(false)}>Accueil</NavLink>

                        <NavDivider label="Explorer" />
                        <NavLink href="/explore/batches" onClick={() => setIsOpen(false)}>Lots de produits</NavLink>
                        <NavLink href="/explore/producers" onClick={() => setIsOpen(false)}>Producteurs</NavLink>

                        <div className="pt-1 pb-1" style={{ borderTop: '1px solid #c8b89a' }} />
                        <NavLink href="/about" onClick={() => setIsOpen(false)}>À propos</NavLink>

                        {(isOwner || isAdmin) && (
                            <>
                                <NavDivider label="Administration" />
                                {isOwner && <NavLink href="/owner" onClick={() => setIsOpen(false)}>Propriétaire</NavLink>}
                                {isAdmin && <NavLink href="/admin" onClick={() => setIsOpen(false)}>Administrateur</NavLink>}
                            </>
                        )}

                        {authenticated && (
                            <>
                                <NavDivider label="Consommateur" />
                                <NavLink href="/consumer" onClick={() => setIsOpen(false)}>Mes Produits</NavLink>
                            </>
                        )}

                        {isProducer && (
                            <>
                                <NavDivider label="Producteur" />
                                <NavLink href="/producer" onClick={() => setIsOpen(false)}>Dashboard</NavLink>
                                <NavLink href="/producer/batches" onClick={() => setIsOpen(false)}>Mes Lots</NavLink>
                                <NavLink href="/producer/batches/create" onClick={() => setIsOpen(false)}>Créer un Lot</NavLink>
                            </>
                        )}
                    </div>
                </div>
            </nav>
        </>
    );
}

function NavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
    return (
        <a
            href={href}
            onClick={onClick}
            className="flex items-center py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 group"
            style={{ color: '#5a4a2a' }}
            onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.color = '#1a1008';
                el.style.background = 'rgba(192,57,43,0.12)';
                el.style.paddingLeft = '20px';
            }}
            onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.color = '#5a4a2a';
                el.style.background = 'transparent';
                el.style.paddingLeft = '16px';
            }}
        >
            {children}
        </a>
    );
}

function NavDivider({ label }: { label: string }) {
    return (
        <div className="pt-4 pb-2 px-4">
            <div style={{ borderTop: '1px solid #c8b89a', paddingTop: '12px' }}>
                <p className="text-[10px] tracking-[3px] uppercase font-medium" style={{ color: '#c0392b' }}>
                    {label}
                </p>
            </div>
        </div>
    );
}