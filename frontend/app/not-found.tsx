import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/shared/Navbar';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#f5f3ef] pt-14">
            <Navbar />
            <div className="container mx-auto p-6 max-w-4xl">
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
                    <div className="mb-8">
                        <Image
                            src="/originlink-logo.png"
                            alt="Logo"
                            width={150}
                            height={150}
                            className="opacity-70"
                        />
                    </div>
                    
                    <h1 className="text-8xl font-[Carbon_Phyber] text-[#1c1917] mb-4">
                        404
                    </h1>
                    
                    <h2 className="text-4xl font-[Carbon_Phyber] text-[#1c1917] mb-4">
                        Page non trouvée
                    </h2>
                    
                    <p className="text-xl font-[Olney_Light] text-[#78716c] mb-8 max-w-md">
                        Oups ! Cette page semble avoir disparu dans la galerie.
                    </p>
                    
                    <div className="flex gap-4 flex-wrap justify-center">
                        <Link
                            href="/"
                            className="px-6 py-3 bg-[#1c1917] text-[#fafaf8] font-[Olney_Light] rounded-lg hover:bg-[#292524] transition-all duration-300 border border-[#d6d0c8] cursor-pointer"
                        >
                            🏠 Retour à l'accueil
                        </Link>
                        
                        <Link
                            href="/explore/editions"
                            className="px-6 py-3 bg-[#fafaf8] text-[#1c1917] font-[Olney_Light] rounded-lg hover:bg-[#f5f3ef] transition-all duration-300 border border-[#d6d0c8] cursor-pointer"
                        >
                            🔍 Explorer les œuvres
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
