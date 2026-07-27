import { useMemo, useState } from 'react';
import { formatPrice } from '../format';

// Hand-rolled SVG trend line. Deliberately dependency-free: the production
// bundle is committed to git (the host has no Node), so a charting library
// would inflate every visitor's download for one page. Colour comes from
// currentColor on a text-gold parent so the ?palette= skins carry through.

const W = 900;
const H = 260;
const PAD = { top: 18, right: 16, bottom: 28, left: 16 };

export default function GoldRateChart({ series = [], karat = 'rate_22k' }) {
    const [hover, setHover] = useState(null);

    const points = useMemo(() => {
        const values = series.map((d) => d[karat]).filter((v) => typeof v === 'number');
        if (values.length < 2) return null;

        const min = Math.min(...values);
        const max = Math.max(...values);
        // Pad the band so a flat-ish series doesn't hug the edges.
        const span = max - min || Math.max(max * 0.01, 1);
        const lo = min - span * 0.25;
        const hi = max + span * 0.25;

        const innerW = W - PAD.left - PAD.right;
        const innerH = H - PAD.top - PAD.bottom;

        const xy = series.map((d, i) => ({
            ...d,
            value: d[karat],
            x: PAD.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW),
            y: PAD.top + innerH - ((d[karat] - lo) / (hi - lo)) * innerH,
        }));

        return { xy, min, max, first: values[0], last: values[values.length - 1] };
    }, [series, karat]);

    if (!points) {
        return (
            <div className="border border-gold/20 bg-ivory px-6 py-16 text-center">
                <p className="text-[11px] uppercase tracking-[0.18em] text-charcoal/50">
                    Not enough history yet
                </p>
                <p className="text-sm text-charcoal/60 mt-3 max-w-md mx-auto leading-relaxed">
                    The trend line appears once a few days of rates have been published.
                </p>
            </div>
        );
    }

    const { xy, min, max, first, last } = points;
    const line = xy.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${PAD.left},${H - PAD.bottom} ${line} ${xy[xy.length - 1].x.toFixed(1)},${H - PAD.bottom}`;
    const rising = last >= first;
    const active = hover ?? xy[xy.length - 1];

    const onMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * W;
        let nearest = xy[0];
        for (const p of xy) {
            if (Math.abs(p.x - x) < Math.abs(nearest.x - x)) nearest = p;
        }
        setHover(nearest);
    };

    return (
        <div className="text-gold">
            <div className="flex items-baseline justify-between gap-4 mb-3 px-1">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-charcoal/50">
                        {active.date}
                    </p>
                    <p className="font-display text-2xl text-gold mt-0.5">
                        {formatPrice(active.value)}
                        <span className="text-[11px] tracking-[0.14em] text-charcoal/45 ml-1.5">/g</span>
                    </p>
                </div>
                <p className={`text-xs ${rising ? 'text-gold' : 'text-maroon'}`}>
                    {rising ? '▲' : '▼'} {formatPrice(Math.abs(last - first))} over the period
                </p>
            </div>

            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-auto select-none"
                role="img"
                aria-label={`Gold rate trend, ${formatPrice(min)} to ${formatPrice(max)} per gram`}
                onMouseMove={onMove}
                onMouseLeave={() => setHover(null)}
            >
                <defs>
                    <linearGradient id="clv-rate-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {[0, 0.5, 1].map((t) => {
                    const y = PAD.top + t * (H - PAD.top - PAD.bottom);
                    return (
                        <line
                            key={t}
                            x1={PAD.left}
                            x2={W - PAD.right}
                            y1={y}
                            y2={y}
                            stroke="currentColor"
                            strokeOpacity="0.12"
                            strokeWidth="1"
                        />
                    );
                })}

                <polygon points={area} fill="url(#clv-rate-fill)" />
                <polyline
                    points={line}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                <line
                    x1={active.x}
                    x2={active.x}
                    y1={PAD.top}
                    y2={H - PAD.bottom}
                    stroke="currentColor"
                    strokeOpacity="0.35"
                    strokeWidth="1"
                />
                <circle cx={active.x} cy={active.y} r="4.5" fill="currentColor" />

                <text
                    x={PAD.left}
                    y={H - 8}
                    className="fill-current"
                    opacity="0.45"
                    fontSize="13"
                >
                    {xy[0].date}
                </text>
                <text
                    x={W - PAD.right}
                    y={H - 8}
                    textAnchor="end"
                    className="fill-current"
                    opacity="0.45"
                    fontSize="13"
                >
                    {xy[xy.length - 1].date}
                </text>
            </svg>
        </div>
    );
}
