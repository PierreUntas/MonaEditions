import Navbar from '@/components/shared/Navbar';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#f5f3ef] flex flex-col">
            <Navbar />
            <div className="max-w-2xl mx-auto px-6 pt-28 pb-20 flex-1">

                <div className="text-center mb-12">
                    <div className="w-[52px] h-[52px] border border-[#d6d0c8] bg-[#fafaf8] flex items-center justify-center font-serif italic text-[22px] text-[#a8a29e] mx-auto mb-6">
                        起
                    </div>
                    <h1 className="font-serif text-[clamp(32px,5vw,48px)] font-normal tracking-[-1px] text-[#1c1917] leading-tight">
                        Conditions générales <em className="italic text-[#78716c]">d'utilisation</em>
                    </h1>
                    <p className="text-[12px] font-light text-[#a8a29e] mt-3">
                        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                <div className="border border-[#d6d0c8] bg-[#fafaf8] p-8 space-y-8">

                    <Section title="1. Objet">
                        <p>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Kigen, accessible à l'adresse kigen.art. En utilisant la plateforme, vous acceptez sans réserve les présentes conditions.</p>
                    </Section>

                    <Section title="2. Description du service">
                        <p>Kigen est une plateforme de certification d'œuvres d'art sur la blockchain Ethereum. Elle permet aux artistes autorisés de certifier leurs œuvres sous forme de tokens numériques, et aux collectionneurs de recevoir et conserver des certificats d'authenticité.</p>
                    </Section>

                    <Section title="3. Accès à la plateforme">
                        <p>L'accès à certaines fonctionnalités (certification d'œuvres, réclamation de certificats) nécessite la création d'un compte via Privy, notre fournisseur d'authentification. L'accès au rôle artiste est soumis à validation manuelle par l'équipe Kigen.</p>
                    </Section>

                    <Section title="4. Responsabilités des artistes">
                        <p>Les artistes sont seuls responsables des contenus qu'ils publient sur la plateforme, notamment :</p>
                        <ul className="mt-2 space-y-1 list-none pl-4 border-l-2 border-[#d6d0c8]">
                            <li>L'authenticité et l'exactitude des informations renseignées</li>
                            <li>La détention des droits nécessaires sur les œuvres certifiées</li>
                            <li>Le respect des droits de tiers (droits d'auteur, droits à l'image…)</li>
                        </ul>
                        <p className="mt-3">Kigen se réserve le droit de suspendre l'accès d'un artiste en cas de manquement à ces obligations.</p>
                    </Section>

                    <Section title="5. Nature des tokens">
                        <p>Les certificats émis sur Kigen sont des tokens ERC-1155 sur la blockchain Ethereum. Ils constituent une preuve d'authenticité numérique mais ne confèrent pas automatiquement de droits de propriété intellectuelle sur l'œuvre physique ou numérique, sauf accord explicite entre l'artiste et le collectionneur.</p>
                    </Section>

                    <Section title="6. Frais et transactions">
                        <p>Certaines opérations sur la blockchain peuvent entraîner des frais de transaction (gas fees). Kigen n'est pas responsable des variations de ces frais. La plateforme peut prendre en charge certains frais via un mécanisme de sponsorisation (gasless transactions) sans garantie de disponibilité permanente.</p>
                    </Section>

                    <Section title="7. Disponibilité du service">
                        <p>Kigen s'efforce d'assurer la disponibilité de la plateforme mais ne peut garantir un accès ininterrompu. Des interruptions pour maintenance ou incidents techniques sont possibles sans préavis.</p>
                    </Section>

                    <Section title="8. Modification des CGU">
                        <p>Kigen se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications significatives. La poursuite de l'utilisation de la plateforme après modification vaut acceptation des nouvelles conditions.</p>
                    </Section>

                    <Section title="9. Droit applicable">
                        <p>Les présentes CGU sont soumises au droit français. Tout litige sera soumis à la juridiction des tribunaux compétents de Bordeaux.</p>
                    </Section>

                </div>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="pb-8 border-b border-[#e7e3dc] last:border-0 last:pb-0">
            <h2 className="text-[11px] font-medium tracking-[0.15em] uppercase text-[#a8a29e] mb-3">{title}</h2>
            <div className="text-[14px] font-light text-[#1c1917] leading-[1.8] space-y-2">{children}</div>
        </div>
    );
}
