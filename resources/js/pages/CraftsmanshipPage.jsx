import { useEffect } from 'react';
import Reveal from '../components/Reveal';

const PROCESS = [
    ['01', 'CAD/CAM Design & CNC Milling', 'Every design begins as a precision 3D CAD model, then CNC-milled to exact micron tolerances — ensuring perfect symmetry and repeatability.'],
    ['02', 'Laser Cutting & Welding', 'Industrial laser systems cut and weld gold with sub-millimetre accuracy, creating seamless joins and razor-sharp edges impossible by hand alone.'],
    ['03', 'Rhodium Plating & Mirror Polish', 'Automated rhodium plating and multi-stage machine polishing deliver a flawless, long-lasting mirror finish that meets international luxury standards.'],
];

const STANDARDS = [
    ['CNC Precision Engraving', 'Computer-controlled engraving replicates intricate Jadau patterns with micron-level accuracy — every groove identical, every line perfect.'],
    ['Ultrasonic Stone Setting', 'Ultrasonic and steam cleaning systems ensure every diamond and polki stone is set and secured to international grading standards.'],
    ['Automated Quality Control', 'Each piece is scanned using 3D imaging and inspected under 40x magnification — zero tolerance for imperfection before certification.'],
    ['International Plating Standards', 'Multi-layer rhodium and gold plating on Swiss-grade equipment ensures colour consistency, tarnish resistance, and lasting brilliance.'],
];

export default function CraftsmanshipPage() {
    useEffect(() => window.scrollTo(0, 0), []);

    return (
        <main>
            {/* Hero */}
            <section className="relative min-h-[70vh] flex items-center justify-center bg-charcoal overflow-hidden">
                <img src="/images/catalog/p49_00.jpg" alt="Molten gold being poured" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-charcoal/60" />
                <div className="relative text-center text-white px-4 py-24">
                    <p className="eyebrow text-gold-light mb-4">Craftsmanship</p>
                    <h1 className="font-display text-4xl md:text-6xl">From Furnace to Forever</h1>
                    <p className="text-white/70 mt-5 max-w-xl mx-auto">
                        Each piece passes through the hands of master goldsmiths before it touches yours.
                    </p>
                </div>
            </section>

            {/* Process */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
                <Reveal className="text-center mb-14">
                    <p className="eyebrow text-gold mb-3">Precision Manufacturing</p>
                    <h2 className="font-display text-3xl md:text-4xl gold-rule">Where Technology Meets Tradition</h2>
                </Reveal>
                <div className="grid md:grid-cols-3 gap-8">
                    {PROCESS.map(([num, title, desc], i) => (
                        <Reveal key={num} delay={i * 0.1} className="border border-gold/30 p-8">
                            <p className="font-display text-5xl text-gold/40">{num}</p>
                            <h3 className="font-display text-xl mt-4">{title}</h3>
                            <p className="text-sm text-charcoal/60 mt-3 leading-relaxed">{desc}</p>
                        </Reveal>
                    ))}
                </div>
                <Reveal className="text-center mt-10">
                    <p className="text-sm text-charcoal/50 italic">
                        Our manufacturing is certified to international quality standards — every piece inspected
                        under 10x magnification before leaving our atelier.
                    </p>
                </Reveal>
            </section>

            {/* Atelier gallery */}
            <section className="bg-charcoal py-20">
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                    <Reveal className="text-center mb-12 text-white">
                        <p className="eyebrow text-gold-light mb-3">Inside the Atelier</p>
                        <h2 className="font-display text-3xl md:text-4xl">The Precision of a Machine.<br />The Soul of a Karigar.</h2>
                    </Reveal>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['p51_00', 'p50_00', 'p52_03', 'p52_09'].map((img, i) => (
                            <Reveal key={img} delay={i * 0.07} className="img-zoom aspect-square">
                                <img src={`/images/catalog/${img}.jpg`} alt="Clavira atelier" loading="lazy" className="w-full h-full object-cover" />
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Standards */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
                <Reveal className="text-center mb-14">
                    <p className="eyebrow text-gold mb-3">International Finishing Standards</p>
                    <h2 className="font-display text-3xl md:text-4xl gold-rule">Engineered to Perfection. Finished to Shine.</h2>
                </Reveal>
                <div className="grid md:grid-cols-2 gap-6">
                    {STANDARDS.map(([title, desc], i) => (
                        <Reveal key={title} delay={i * 0.06} className="flex gap-5 p-6 border border-gold/20">
                            <span className="text-gold text-2xl">✦</span>
                            <div>
                                <h3 className="font-display text-xl">{title}</h3>
                                <p className="text-sm text-charcoal/60 mt-2 leading-relaxed">{desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>
        </main>
    );
}
