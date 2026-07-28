import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice, diamondLabel } from '../format';
import WishlistButton from './WishlistButton';
import QuickViewModal from './QuickViewModal';

export default function ProductCard({ product }) {
    const [quickView, setQuickView] = useState(false);

    return (
        <div className="pc group relative h-full flex flex-col bg-white border border-gold/15 hover:border-gold/45 card-lift pc-tile">
            {/* The tile link wraps image + name + price. Every button on the card
                is a SIBLING of it — a <button> inside an <a> is invalid, and the
                anchor would swallow the button's accessible name. */}
            <Link to={`/product/${product.slug}`} className="flex flex-col flex-1">
                <div className="img-zoom relative aspect-square bg-ivory-dark">
                    {product.image && (
                        <img
                            src={`/${product.image}`}
                            // Empty: the <h3> below is inside this same anchor and
                            // already names the link. alt={name} announces it twice.
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                        />
                    )}
                    {product.is_jadau && (
                        <span className="absolute top-3 left-3 bg-maroon text-white text-[10px] uppercase tracking-[0.2em] px-3 py-1">
                            Jadau
                        </span>
                    )}
                    {product.igi_certified && (
                        <span className="absolute bottom-3 left-3 bg-white/90 text-charcoal text-[10px] uppercase tracking-[0.15em] px-2.5 py-1 transition-opacity duration-300 group-hover:opacity-0">
                            IGI
                        </span>
                    )}
                </div>

                <div className="px-3 pt-4 pb-3 text-center xl:px-4">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.18em] text-charcoal/65">
                        {diamondLabel[product.diamond_type]}
                    </p>
                    {/* Two lines are always reserved so the CTAs across a row sit
                        on one baseline regardless of how long the name is. */}
                    <h3 className="font-display uppercase text-[12px] sm:text-[13px] xl:text-[14px] tracking-[0.08em] sm:tracking-[0.12em] xl:tracking-[0.16em] leading-[1.3] mt-2 line-clamp-2 min-h-[2.6em] text-charcoal group-hover:text-gold transition-colors duration-500">
                        {product.name}
                    </h3>
                    <p className="font-display italic text-[15px] xl:text-[17px] text-gold-ink mt-1">
                        {formatPrice(product.price)}
                    </p>
                </div>
            </Link>

            {/* Action rail — reveal choreography lives in app.css (.pc-rail) */}
            <div className="pc-rail absolute top-3 right-3 z-20 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => setQuickView(true)}
                    aria-haspopup="dialog"
                    aria-label={`Quick view: ${product.name}`}
                    className="pc-quickview relative w-9 h-9 bg-gold text-white hover:bg-charcoal transition-colors flex items-center justify-center shadow-sm"
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
                        <path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12z" />
                        <circle cx="12" cy="12" r="3.2" />
                    </svg>
                    {/* Decorative twin of the aria-label; hidden from AT so the
                        button isn't announced as "Quick view: X Quick view". */}
                    <span
                        aria-hidden="true"
                        className="pc-tip hidden xl:block absolute right-full mr-2 whitespace-nowrap bg-charcoal text-white text-[10px] uppercase tracking-[0.14em] px-3 py-1.5"
                    >
                        Quick view
                    </span>
                </button>

                <WishlistButton productId={product.id} productName={product.name} variant="rail" />
            </div>

            {/* Every Clavira piece has variants, and natural-vs-lab-grown swings
                the price by ~85% — so this opens the configurator with the
                defaults preselected rather than silently adding a guess. */}
            <div className="px-3 pb-3 xl:px-4 xl:pb-4">
                <button
                    type="button"
                    onClick={() => setQuickView(true)}
                    aria-haspopup="dialog"
                    aria-label={`Add ${product.name} to cart`}
                    className="pc-cta w-full uppercase font-medium text-[10px] xl:text-[11px] tracking-[0.1em] xl:tracking-[0.16em] py-3"
                >
                    Add to Cart
                </button>
            </div>

            {quickView && <QuickViewModal slug={product.slug} onClose={() => setQuickView(false)} />}
        </div>
    );
}
