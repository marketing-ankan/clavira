import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../format';

// Old-gold exchange estimator. Values are computed against the published rate of
// the day and are explicitly indicative — real value is struck after purity and
// weight verification, exactly as the exchange policy states.
//
// The two outcomes restate promises that already exist on the site
// (policies.js `exchange`): zero making-charge deduction when exchanging toward
// a new Clavira piece, and up to 98% of gold value on buy-back. Nothing new is
// promised here.

const PURITIES = [
    [22, '22kt', 'rate_22k'],
    [18, '18kt', 'rate_18k'],
    [24, '24kt', 'rate_24k'],
    [14, '14kt', 'rate_14k'],
];

const BUYBACK_SHARE = 0.98;

export default function ExchangeCalculator({ rate, className = '' }) {
    const [weight, setWeight] = useState('');
    const [purity, setPurity] = useState(22);

    const perGram = useMemo(() => {
        if (!rate) return null;
        const key = PURITIES.find(([k]) => k === purity)?.[2];
        return key ? rate[key] : null;
    }, [rate, purity]);

    const grams = parseFloat(weight);
    const valid = Number.isFinite(grams) && grams > 0 && perGram > 0;
    const goldValue = valid ? grams * perGram : 0;

    return (
        <div className={`border border-gold/25 bg-ivory ${className}`}>
            <div className="p-7 lg:p-9">
                <p className="eyebrow text-gold mb-3">Old Gold Exchange</p>
                <h3 className="font-display text-2xl md:text-3xl leading-tight">
                    What is your old gold worth today?
                </h3>
                <p className="text-sm text-charcoal/60 mt-3 leading-relaxed max-w-md">
                    Enter the weight and purity of your existing jewellery for an instant estimate
                    at today&rsquo;s published rate.
                </p>

                <div className="grid sm:grid-cols-2 gap-4 mt-7">
                    <label className="block">
                        <span className="block text-[11px] uppercase tracking-[0.18em] text-charcoal/60 mb-2">
                            Weight in grams
                        </span>
                        <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="e.g. 24.5"
                            className="w-full border border-gold/30 focus:border-gold px-4 py-3 bg-white"
                        />
                    </label>
                    <label className="block">
                        <span className="block text-[11px] uppercase tracking-[0.18em] text-charcoal/60 mb-2">
                            Purity
                        </span>
                        <select
                            value={purity}
                            onChange={(e) => setPurity(Number(e.target.value))}
                            className="w-full border border-gold/30 focus:border-gold px-4 py-3 bg-white"
                        >
                            {PURITIES.map(([k, label]) => (
                                <option key={k} value={k}>{label}</option>
                            ))}
                        </select>
                    </label>
                </div>

                {perGram > 0 && (
                    <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/45 mt-4">
                        Today&rsquo;s {PURITIES.find(([k]) => k === purity)?.[1]} rate ·{' '}
                        <span className="text-gold">{formatPrice(perGram)}/g</span>
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-px bg-gold/20 border-t border-gold/20">
                <div className="bg-white text-center py-7 px-4">
                    <p className="font-display text-2xl md:text-3xl text-gold">
                        {valid ? formatPrice(goldValue) : '—'}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-charcoal/55 mt-2">
                        Exchange value
                    </p>
                    <p className="text-[11px] text-charcoal/45 mt-1.5">Zero making-charge deduction</p>
                </div>
                <div className="bg-white text-center py-7 px-4">
                    <p className="font-display text-2xl md:text-3xl text-charcoal">
                        {valid ? formatPrice(goldValue * BUYBACK_SHARE) : '—'}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-charcoal/55 mt-2">
                        Buy-back value
                    </p>
                    <p className="text-[11px] text-charcoal/45 mt-1.5">Up to 98% of gold value</p>
                </div>
            </div>

            <div className="px-7 lg:px-9 py-6 border-t border-gold/15">
                <p className="text-[11px] text-charcoal/45 leading-relaxed">
                    Indicative only. Final value is confirmed after purity and weight verification,
                    and references your BIS hallmark and the published rate of the day.
                </p>
                <Link to="/policies/exchange" className="btn-outline !py-2.5 !px-5 mt-5 inline-block">
                    How exchange works
                </Link>
            </div>
        </div>
    );
}
