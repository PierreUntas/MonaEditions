export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#f5f3ef] flex flex-col">
            <div className="max-w-2xl mx-auto px-6 pt-28 pb-20 flex-1">

                <div className="text-center mb-12">
                    <img 
                        src="/logo-mona.svg" 
                        alt="Mona Editions Logo" 
                        className="w-[100px] h-[100px] object-contain mx-auto mb-6"
                    />
                    <h1 className=" text-[clamp(32px,5vw,48px)] font-normal tracking-[-1px] text-[#1c1917] leading-tight">
                        Politique de <em className="italic text-[#78716c]">confidentialité</em>
                    </h1>
                    <p className="text-[12px] font-light text-[#a8a29e] mt-3">
                        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                <div className="border border-[#d6d0c8] bg-[#fafaf8] p-8 space-y-8">

                    <Section title="1. Responsable du traitement">
                        <p>Pierre Untas, 88 rue Lagrange, 33000 Bordeaux, joignable à <a href="mailto:pierre.untas@gmail.com" className="text-[#4a5240] underline underline-offset-2">pierre.untas@gmail.com</a>, est responsable du traitement des données personnelles collectées sur la plateforme Mona Editions.</p>
                    </Section>

                    <Section title="2. Données collectées">
                        <p>Lors de l'utilisation de la plateforme, nous collectons les données suivantes :</p>
                        <ul className="mt-2 space-y-1.5 pl-4 border-l-2 border-[#d6d0c8]">
                            <li><strong>Adresse email</strong> — lors de la création de compte via Privy</li>
                            <li><strong>Adresse de wallet Ethereum</strong> — générée ou connectée lors de l'authentification</li>
                            <li><strong>Métadonnées des œuvres</strong> — publiées volontairement par les artistes (nom, bio, photos, descriptions)</li>
                            <li><strong>Données de navigation</strong> — logs techniques, adresse IP (durée limitée)</li>
                        </ul>
                    </Section>

                    <Section title="3. Finalités du traitement">
                        <p>Vos données sont utilisées pour :</p>
                        <ul className="mt-2 space-y-1.5 pl-4 border-l-2 border-[#d6d0c8]">
                            <li>Créer et gérer votre compte utilisateur</li>
                            <li>Permettre la certification et la réclamation de certificats</li>
                            <li>Assurer la sécurité et le bon fonctionnement de la plateforme</li>
                            <li>Répondre à vos demandes de support</li>
                        </ul>
                    </Section>

                    <Section title="4. Données sur la blockchain">
                        <p>Les données enregistrées sur la blockchain Ethereum (adresse de wallet, identifiants de tokens, CID IPFS) sont <strong>publiques et permanentes</strong> par nature. Il n'est pas possible de les supprimer une fois inscrites. Nous vous invitons à en tenir compte avant toute certification.</p>
                    </Section>

                    <Section title="5. Partage des données">
                        <p>Vos données ne sont pas vendues à des tiers. Elles peuvent être partagées avec :</p>
                        <ul className="mt-2 space-y-1.5 pl-4 border-l-2 border-[#d6d0c8]">
                            <li><strong>Privy</strong> — prestataire d'authentification</li>
                            <li><strong>Pinata / IPFS</strong> — hébergement décentralisé des métadonnées</li>
                            <li>Les autorités compétentes, sur demande légale</li>
                        </ul>
                    </Section>

                    <Section title="6. Durée de conservation">
                        <p>Les données de compte sont conservées pendant toute la durée d'activité du compte, puis supprimées dans un délai de 3 ans après la dernière connexion. Les données blockchain sont permanentes et non supprimables.</p>
                    </Section>

                    <Section title="7. Vos droits (RGPD)">
                        <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
                        <ul className="mt-2 space-y-1.5 pl-4 border-l-2 border-[#d6d0c8]">
                            <li><strong>Droit d'accès</strong> — consulter les données vous concernant</li>
                            <li><strong>Droit de rectification</strong> — corriger des données inexactes</li>
                            <li><strong>Droit à l'effacement</strong> — sous réserve des contraintes techniques blockchain</li>
                            <li><strong>Droit d'opposition</strong> — vous opposer à certains traitements</li>
                            <li><strong>Droit à la portabilité</strong> — récupérer vos données dans un format lisible</li>
                        </ul>
                        <p className="mt-3">Pour exercer ces droits, contactez-nous à <a href="mailto:pierre.untas@gmail.com" className="text-[#4a5240] underline underline-offset-2">pierre.untas@gmail.com</a>. En cas de litige, vous pouvez saisir la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#4a5240] underline underline-offset-2">CNIL</a>.</p>
                    </Section>

                    <Section title="8. Cookies">
                        <p>La plateforme utilise des cookies techniques strictement nécessaires au fonctionnement (session, authentification). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.</p>
                    </Section>

                    <Section title="9. Contact DPO">
                        <p>Pour toute question relative à la protection de vos données : <a href="mailto:pierre.untas@gmail.com" className="text-[#4a5240] underline underline-offset-2">pierre.untas@gmail.com</a></p>
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
