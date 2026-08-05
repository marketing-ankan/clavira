import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { POLICIES } from '../policies';
import Reveal from '../components/Reveal';

export default function PolicyPage() {
    const { slug } = useParams();
    const policy = POLICIES[slug];

    useEffect(() => window.scrollTo(0, 0), [slug]);

    if (!policy) return <Navigate to="/" replace />;

    return (
        <main>
            <section className="bg-charcoal text-white text-center py-20 px-4">
                <p className="eyebrow text-gold-light mb-4">Clavira</p>
                <h1 className="font-display text-4xl md:text-5xl">{policy.title}</h1>
                <p className="text-white/60 mt-4 max-w-xl mx-auto">{policy.intro}</p>
            </section>

            <section className="max-w-3xl mx-auto px-4 lg:px-8 py-16">
                <div className="space-y-10">
                    {policy.sections.map(([heading, body], i) => (
                        <Reveal key={heading} delay={i * 0.05}>
                            <h2 className="font-display text-2xl text-charcoal">{heading}</h2>
                            <p className="text-charcoal/70 leading-relaxed mt-3">{body}</p>
                        </Reveal>
                    ))}
                </div>
                <p className="text-[11px] text-charcoal/60 mt-16 pt-8 border-t border-gold/20 leading-relaxed">
                    This policy is provided for guidance and may be updated. For any query, please write to
                    care@clavira.in or reach us through the Contact page.
                </p>
            </section>
        </main>
    );
}
