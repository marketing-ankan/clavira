import { formatPrice } from '../format';

export function Card({ title, action, children, className = '' }) {
    return (
        <section className={`bg-white border border-gold/20 ${className}`}>
            {(title || action) && (
                <header className="flex items-center justify-between px-5 py-3.5 border-b border-gold/15">
                    <h2 className="text-[12px] uppercase tracking-[0.18em] font-medium text-charcoal/70">{title}</h2>
                    {action}
                </header>
            )}
            <div className="p-5">{children}</div>
        </section>
    );
}

export function Stat({ label, value, accent = false }) {
    return (
        <div className="bg-white border border-gold/20 px-5 py-4">
            <p className={`font-display text-2xl md:text-3xl ${accent ? 'text-gold' : 'text-charcoal'}`}>{value}</p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-charcoal/60 mt-1">{label}</p>
        </div>
    );
}

const STATUS_STYLE = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-800',
    processing: 'bg-sky-100 text-sky-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-emerald-100 text-emerald-900',
    failed: 'bg-rose-100 text-rose-800',
    cancelled: 'bg-neutral-200 text-neutral-600',
    refunded: 'bg-violet-100 text-violet-800',
    processed: 'bg-emerald-100 text-emerald-800',
    new: 'bg-amber-100 text-amber-800',
    contacted: 'bg-sky-100 text-sky-800',
    closed: 'bg-neutral-200 text-neutral-600',
};

export function StatusBadge({ status }) {
    return (
        <span className={`inline-block text-[10px] uppercase tracking-[0.14em] font-medium px-2 py-1 rounded-sm ${STATUS_STYLE[status] ?? 'bg-neutral-100 text-neutral-600'}`}>
            {status}
        </span>
    );
}

export function Field({ label, children }) {
    return (
        <label className="block">
            <span className="text-[11px] uppercase tracking-[0.16em] text-charcoal/60">{label}</span>
            <div className="mt-1.5">{children}</div>
        </label>
    );
}

export const inputCls = 'w-full border border-gold/30 focus:border-gold px-3 py-2.5 bg-white text-sm';

export function Money({ value }) {
    return <span className="tabular-nums">{formatPrice(value)}</span>;
}

export function Pagination({ meta, onPage }) {
    if (!meta || meta.last_page <= 1) return null;
    return (
        <div className="flex gap-1.5 justify-center mt-5">
            {Array.from({ length: meta.last_page }).map((_, i) => (
                <button
                    key={i}
                    onClick={() => onPage(i + 1)}
                    className={`w-8 h-8 text-xs border ${meta.current_page === i + 1 ? 'bg-gold border-gold text-white' : 'border-gold/30 hover:border-gold'}`}
                >
                    {i + 1}
                </button>
            ))}
        </div>
    );
}
