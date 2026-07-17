import { useEffect, useState } from 'react';

/**
 * Palette preview pill (design-review tool — remove once a palette is chosen).
 * Swaps the CSS variable theme on <html data-palette="...">; persists locally.
 */
const PALETTES = [
    { key: '', label: 'Champagne Ivory', dot: '#b08d57', dark: '#1a1714' },
    { key: 'emerald', label: 'Emerald Regale', dot: '#ab8d52', dark: '#0f231c' },
    { key: 'bordeaux', label: 'Bordeaux Maison', dot: '#b98a5e', dark: '#2c1216' },
];

export default function PaletteSwitcher() {
    const [active, setActive] = useState(() => localStorage.getItem('clv-palette') || '');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (active) document.documentElement.dataset.palette = active;
        else delete document.documentElement.dataset.palette;
        localStorage.setItem('clv-palette', active);
    }, [active]);

    const current = PALETTES.find((p) => p.key === active) ?? PALETTES[0];

    return (
        <div className="fixed bottom-5 left-5 z-[80] text-left" aria-label="Palette preview">
            {open && (
                <div className="mb-2 bg-white/95 backdrop-blur border border-gold/30 shadow-xl p-2 space-y-1 w-52">
                    {PALETTES.map((p) => (
                        <button
                            key={p.key}
                            onClick={() => { setActive(p.key); setOpen(false); }}
                            className={`flex items-center gap-3 w-full px-3 py-2 text-left text-[11px] uppercase tracking-[0.14em] transition-colors ${
                                p.key === active ? 'bg-gold/15 text-charcoal' : 'text-charcoal/70 hover:bg-gold/10'
                            }`}
                        >
                            <span className="flex -space-x-1">
                                <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ background: p.dark }} />
                                <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ background: p.dot }} />
                            </span>
                            {p.label}
                        </button>
                    ))}
                </div>
            )}
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 bg-charcoal/90 backdrop-blur text-white/90 pl-3 pr-4 py-2.5 shadow-lg border border-gold/40 text-[10px] uppercase tracking-[0.18em] hover:border-gold transition-colors"
                aria-expanded={open}
            >
                <span className="flex -space-x-1">
                    <span className="w-3 h-3 rounded-full border border-charcoal" style={{ background: current.dark }} />
                    <span className="w-3 h-3 rounded-full border border-charcoal" style={{ background: current.dot }} />
                </span>
                Palette · {current.label}
            </button>
        </div>
    );
}
