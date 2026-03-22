"use client"

import { usePrivy } from '@privy-io/react-auth';

export default function Home() {
    const { login, authenticated, user } = usePrivy();

    return (
        <div className="min-h-screen bg-[#f5f3ef]">
            <div className="max-width-[860px] mx-auto px-6 pt-28 pb-20">
                {/* Header */}
                <div className="text-center mb-[72px]">
                    <div className="text-[11px] font-normal tracking-[0.18em] uppercase text-[#a8a29e] mb-5">
                        Plateforme de certification
                    </div>
                    <h1 className=" text-[clamp(40px,6vw,64px)] font-normal tracking-[-1.5px] leading-[1.1] mb-5">
                        L'authenticité<br />
                        <em className="italic text-[#78716c]">Vérifiable</em>
                    </h1>
                    <p className="text-[15px] font-light leading-[1.8] text-[#78716c] max-w-[520px] mx-auto">
                        Certifiez l'authenticité et la provenance de vos œuvres d'art sur la blockchain.
                        Pour les artistes qui créent, et les collectionneurs qui font confiance.
                    </p>
                </div>

                {/* Hero CTA */}
                <div className="border border-[#d6d0c8] bg-[#1c1917] mb-6 py-16 px-10 text-center">
                    <div className="text-[10px] font-normal tracking-[0.15em] uppercase text-white/30 mb-6">
                        Bienvenue sur Mona Editions
                    </div>
                    <div className=" text-[clamp(32px,5vw,48px)] font-normal text-white leading-[1.3] mb-5 tracking-[-1px]">
                        Donnez à vos œuvres<br />
                        une <em className="italic text-white/40">histoire permanente</em>
                    </div>
                    <div className="text-[14px] font-light text-white/50 max-w-[480px] mx-auto mb-8 leading-[1.75]">
                        Enregistrez, certifiez et tracez vos créations artistiques de manière infalsifiable.
                        Chaque œuvre devient un actif numérique vérifié, protégé par la blockchain.
                    </div>
                </div>

                {/* Authentication section */}
                {authenticated ? (
                    <>
                        <div className="border border-[#d6d0c8] bg-[#fafaf8] p-6 mb-6 text-center">
                            <div className="text-[11px] font-normal tracking-[0.12em] uppercase text-[#a8a29e] mb-3">
                                Connecté
                            </div>
                            {user?.email?.address && (
                                <div className="text-[14px] font-normal text-[#1c1917] mb-1.5">
                                    {user.email.address}
                                </div>
                            )}
                            {(() => {
                                const wallet = user?.wallet || user?.linkedAccounts?.find((account: any) => account.type === 'wallet');
                                const walletAddress = (wallet as any)?.address;
                                return walletAddress ? (
                                    <div className="text-[12px] font-mono text-[#78716c]">
                                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                                    </div>
                                ) : null;
                            })()}
                        </div>
                        <div className="mb-6 text-center">
                            <a
                                href="/explore/editions"
                                className="text-[12px] font-medium tracking-[0.06em] text-[#fafaf8] no-underline border border-[#1c1917] bg-[#1c1917] py-3.5 px-8 inline-block transition-all duration-200 cursor-pointer hover:bg-[#292524] hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(28,25,23,0.25)]"
                            >
                                Explorer les œuvres
                            </a>
                        </div>
                    </>
                ) : (
                    <div className="mb-6 text-center">
                        <button
                            onClick={login}
                            className="text-[12px] font-medium tracking-[0.06em] text-[#fafaf8] border border-[#1c1917] bg-[#1c1917] py-3.5 px-8 inline-block transition-all duration-200 cursor-pointer hover:bg-[#292524] hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(28,25,23,0.25)]"
                        >
                            Se connecter
                        </button>
                    </div>
                )}

                {/* Features */}
                <div className="grid md:grid-cols-2 gap-px bg-[#d6d0c8] border border-[#d6d0c8] mb-6">
                    <div className="bg-[#fafaf8] p-8">
                        <div className="w-10 h-10 border border-[#d6d0c8] bg-[#f5f3ef] flex items-center justify-center text-[18px] mb-5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                            <path d="M576 320C576 320.9 576 321.8 576 322.7C575.6 359.2 542.4 384 505.9 384L408 384C381.5 384 360 405.5 360 432C360 435.4 360.4 438.7 361 441.9C363.1 452.1 367.5 461.9 371.8 471.8C377.9 485.6 383.9 499.3 383.9 513.8C383.9 545.6 362.3 574.5 330.5 575.8C327 575.9 323.5 576 319.9 576C178.5 576 63.9 461.4 63.9 320C63.9 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320zM192 352C192 334.3 177.7 320 160 320C142.3 320 128 334.3 128 352C128 369.7 142.3 384 160 384C177.7 384 192 369.7 192 352zM192 256C209.7 256 224 241.7 224 224C224 206.3 209.7 192 192 192C174.3 192 160 206.3 160 224C160 241.7 174.3 256 192 256zM352 160C352 142.3 337.7 128 320 128C302.3 128 288 142.3 288 160C288 177.7 302.3 192 320 192C337.7 192 352 177.7 352 160zM448 256C465.7 256 480 241.7 480 224C480 206.3 465.7 192 448 192C430.3 192 416 206.3 416 224C416 241.7 430.3 256 448 256z"/></svg>
                        </div>
                        <h3 className=" text-[17px] font-normal mb-2.5 text-[#1c1917]">
                            Pour les artistes
                        </h3>
                        <p className="text-[13px] font-light leading-[1.75] text-[#78716c]">
                            Enregistrez vos œuvres, générez un certificat d'authenticité permanent,
                            et protégez votre paternité artistique. Votre signature devient infalsifiable.
                        </p>
                    </div>
                    <div className="bg-[#fafaf8] p-8">
                        <div className="w-10 h-10 border border-[#d6d0c8] bg-[#f5f3ef] flex items-center justify-center text-[18px] mb-5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 160C544 124.7 515.3 96 480 96L160 96zM224 176C250.5 176 272 197.5 272 224C272 250.5 250.5 272 224 272C197.5 272 176 250.5 176 224C176 197.5 197.5 176 224 176zM368 288C376.4 288 384.1 292.4 388.5 299.5L476.5 443.5C481 450.9 481.2 460.2 477 467.8C472.8 475.4 464.7 480 456 480L184 480C175.1 480 166.8 475 162.7 467.1C158.6 459.2 159.2 449.6 164.3 442.3L220.3 362.3C224.8 355.9 232.1 352.1 240 352.1C247.9 352.1 255.2 355.9 259.7 362.3L286.1 400.1L347.5 299.6C351.9 292.5 359.6 288.1 368 288.1z"/></svg>
                        </div>
                        <h3 className=" text-[17px] font-normal mb-2.5 text-[#1c1917]">
                            Pour les collectionneurs
                        </h3>
                        <p className="text-[13px] font-light leading-[1.75] text-[#78716c]">
                            Vérifiez l'authenticité d'une œuvre, consultez son histoire complète,
                            et transférez votre certificat de propriété en toute confiance.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-10">
                    <a
                        href="/about"
                        className="text-[12px] font-normal tracking-[0.06em] text-[#78716c] no-underline border border-[#d6d0c8] py-3 px-7 inline-block transition-all duration-200 hover:border-[#1c1917] hover:text-[#1c1917]"
                    >
                        En savoir plus →
                    </a>
                </div>
            </div>
        </div>
    );
}