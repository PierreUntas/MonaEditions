export default function LegalNoticePage() {
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
                        Mentions <em className="italic text-[#78716c]">légales</em>
                    </h1>
                    <p className="text-[12px] font-light text-[#a8a29e] mt-3">
                        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                <div className="border border-[#d6d0c8] bg-[#fafaf8] p-8 space-y-8">
                    <Section title="Éditeur du site">
                        <p>Le site <strong>Mona Editions</strong> (monaeditions.com) est édité par :</p>
                        <p className="mt-2 text-[#78716c]">
                            Pierre Untas<br />
                            Particulier<br />
                            88 rue Lagrange, 33000 Bordeaux<br />
                            Email : <a href="mailto:pierre.untas@gmail.com" className="text-[#4a5240] underline underline-offset-2">pierre.untas@gmail.com</a>
                        </p>
                    </Section>

                    <Section title="Directeur de la publication">
                        <p>Pierre Untas</p>
                    </Section>

                    <Section title="Hébergement">
                        <p>Le site est hébergé par :</p>
                        <p className="mt-2 text-[#78716c]">
                            Vercel Inc.<br />
                            440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
                            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-[#4a5240] underline underline-offset-2">vercel.com</a>
                        </p>
                    </Section>

                    <Section title="Propriété intellectuelle">
                        <p>L'ensemble des contenus présents sur le site Mona Editions (textes, images, logos, code) sont protégés par le droit d'auteur et sont la propriété exclusive de leurs auteurs respectifs. Toute reproduction, même partielle, est strictement interdite sans autorisation préalable écrite.</p>
                    </Section>

                    <Section title="Responsabilité">
                        <p>Mona Editions s'efforce de fournir des informations exactes et à jour. Cependant, la plateforme ne peut être tenue responsable des erreurs ou omissions dans les contenus, ni des dommages résultant de l'utilisation des informations publiées. Les certifications enregistrées sur la blockchain sont sous la responsabilité exclusive des artistes qui les émettent.</p>
                    </Section>

                    <Section title="Droit applicable">
                        <p>Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français seront compétents.</p>
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
