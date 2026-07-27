// Storefront trust strip — the credibility signals professional jewellers keep
// on-screen (Angara/Tanishq pattern). Rendered site-wide above the footer.
const ITEMS = [
    ['M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z', 'BIS Hallmarked', 'Certified pure gold'],
    ['M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21.5 7.1 24.2l.9-5.5-4-3.9L9.5 8z', 'IGI Certified', 'Every diamond graded'],
    ['M4 8h16l-1.5 11.5A2 2 0 0116.5 21h-9A2 2 0 015.5 19.5L4 8zm4 0V6a4 4 0 018 0v2', 'Insured Shipping', 'Worldwide, fully covered'],
    ['M3 12a9 9 0 1018 0 9 9 0 00-18 0zm5 0l2.5 2.5L16 9', '15-Day Returns', 'Easy & hassle-free'],
    ['M12 2v20M5 7l7-4 7 4M5 7v10l7 4 7-4V7', 'Lifetime Exchange', '98% gold value back'],
];

export default function TrustBar() {
    return (
        <section className="bg-ivory-dark/50 border-y border-gold/15" aria-label="Our assurances">
            <div className="max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-gold/10">
                {ITEMS.map(([d, title, sub], i) => (
                    <div key={title} className={`flex items-center gap-3 py-5 px-3 lg:px-4 ${i >= 3 ? 'max-md:border-t max-md:border-gold/10' : ''} ${i === 4 ? 'max-md:col-span-2 max-md:justify-center' : ''}`}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-gold shrink-0">
                            <path d={d} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="leading-tight">
                            <p className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-charcoal font-medium">{title}</p>
                            <p className="text-[10px] md:text-[11px] text-charcoal/50 mt-0.5">{sub}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
