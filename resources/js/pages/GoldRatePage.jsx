import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Reveal from '../components/Reveal';
import GoldRateChart from '../components/GoldRateChart';
import ExchangeCalculator from '../components/ExchangeCalculator';
import { formatPrice } from '../format';

const KARATS = [
    ['rate_24k', '24kt', '999 fine'],
    ['rate_22k', '22kt', '916 hallmark'],
    ['rate_18k', '18kt', '750 hallmark'],
    ['rate_14k', '14kt', '585 hallmark'],
];

const RANGES = [7, 14, 21, 30];

export default function GoldRatePage() {
    const [data, setData] = useState(null);
    const [karat, setKarat] = useState('rate_22k');
    const [days, setDays] = useState(30);

    useEffect(() => {
        api.get('/gold-rate/history').then(({ data }) => setData(data)).catch(() => {});
        window.scrollTo(0, 0);
    }, []);

    const rate = data?.gold_rate ?? null;
    const change = data?.change ?? null;

    const series = useMemo(() => {
        const all = data?.series ?? [];
        return all.slice(Math.max(0, all.length - days));
    }, [data, days]);

    const updated = rate?.effective_at
        ? new Date(rate.effective_at).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })
        : null;

    return (
        <main>
            <section className="bg-charcoal text-white text-center py-20 px-4">
                <p className="eyebrow text-gold-light mb-4">Transparency</p>
                <h1 className="font-display text-4xl md:text-5xl">Today&rsquo;s Gold Rate</h1>
                <p className="text-white/60 mt-4 max-w-xl mx-auto leading-relaxed">
                    Every Clavira valuation — purchase, exchange or buy-back — references the
                    published rate of the day. Here it is, in full.
                </p>
                {updated && (
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mt-6">
                        Last updated {updated} IST
                    </p>
                )}
            </section>

            {/* ---------- TODAY, PER KARAT ---------- */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gold/20 border border-gold/20">
                    {KARATS.map(([key, label, sub], i) => {
                        const delta = change?.[key];
                        return (
                            <Reveal key={key} delay={i * 0.06} className="bg-ivory text-center py-9 px-4">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-charcoal/55">
                                    {label}
                                </p>
                                <p className="font-display text-3xl md:text-4xl text-gold mt-3">
                                    {rate ? formatPrice(rate[key]) : '—'}
                                </p>
                                <p className="text-[10px] uppercase tracking-[0.18em] text-charcoal/40 mt-1">
                                    per gram
                                </p>
                                {typeof delta === 'number' && delta !== 0 && (
                                    <p className={`text-xs mt-3 ${delta > 0 ? 'text-gold' : 'text-maroon'}`}>
                                        {delta > 0 ? '▲' : '▼'} {formatPrice(Math.abs(delta))}
                                    </p>
                                )}
                                <p className="text-[11px] text-charcoal/40 mt-3">{sub}</p>
                            </Reveal>
                        );
                    })}
                </div>
                {change?.since && (
                    <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45 text-center mt-5">
                        Change since {change.since}
                    </p>
                )}
            </section>

            {/* ---------- TREND ---------- */}
            <section className="bg-ivory-dark/50 py-20">
                <div className="max-w-6xl mx-auto px-4 lg:px-8">
                    <Reveal className="text-center mb-10">
                        <p className="eyebrow text-gold mb-3">Movement</p>
                        <h2 className="font-display text-3xl md:text-5xl gold-rule">How the Rate Has Moved</h2>
                    </Reveal>

                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex flex-wrap gap-2">
                            {KARATS.map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setKarat(key)}
                                    aria-pressed={karat === key}
                                    className={`text-[11px] uppercase tracking-[0.18em] px-4 py-2 border transition-colors ${
                                        karat === key
                                            ? 'border-gold bg-gold text-white'
                                            : 'border-gold/30 text-charcoal/60 hover:border-gold'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            {RANGES.map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setDays(d)}
                                    aria-pressed={days === d}
                                    className={`text-[11px] uppercase tracking-[0.18em] px-4 py-2 border transition-colors ${
                                        days === d
                                            ? 'border-gold bg-gold text-white'
                                            : 'border-gold/30 text-charcoal/60 hover:border-gold'
                                    }`}
                                >
                                    {d}d
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-ivory border border-gold/20 p-5 lg:p-8">
                        <GoldRateChart series={series} karat={karat} />
                    </div>
                </div>
            </section>

            {/* ---------- EXCHANGE CALCULATOR ---------- */}
            <section className="max-w-6xl mx-auto px-4 lg:px-8 py-20">
                <Reveal className="text-center mb-12">
                    <p className="eyebrow text-gold mb-3">Your Gold</p>
                    <h2 className="font-display text-3xl md:text-5xl gold-rule">Value It Instantly</h2>
                </Reveal>
                <Reveal variant="zoom" className="max-w-3xl mx-auto">
                    <ExchangeCalculator rate={rate} />
                </Reveal>
            </section>

            {/* ---------- HOW WE SET IT ---------- */}
            <section className="bg-charcoal text-white py-20">
                <div className="max-w-3xl mx-auto px-4 lg:px-8 text-center">
                    <Reveal>
                        <p className="eyebrow text-gold-light mb-4">Our Method</p>
                        <h2 className="font-display text-3xl md:text-4xl leading-tight">
                            One Rate. Published Daily.
                        </h2>
                        <p className="text-white/65 mt-6 leading-relaxed">
                            The same published rate governs what you pay and what you receive. It is
                            refreshed each morning and stamped with the moment it was set, so the
                            number behind every valuation is one you can see — before, during and
                            after your purchase.
                        </p>
                        <p className="text-white/45 mt-5 text-sm leading-relaxed">
                            Rates are quoted in Indian rupees per gram and exclude GST. Making
                            charges and stone value, where applicable, are itemised separately on
                            each piece.
                        </p>
                    </Reveal>
                </div>
            </section>
        </main>
    );
}
