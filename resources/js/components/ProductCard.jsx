import { Link } from 'react-router-dom';
import { formatPrice, diamondLabel } from '../format';
import WishlistButton from './WishlistButton';

export default function ProductCard({ product }) {
    return (
        <div className="group block relative">
            <WishlistButton productId={product.id} floating />
            <Link to={`/product/${product.slug}`} className="block">
                <div className="img-zoom aspect-square bg-ivory-dark relative">
                    {product.image && (
                        <img
                            src={`/${product.image}`}
                            alt={product.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                        />
                    )}
                    {product.is_jadau && (
                        <span className="absolute top-3 left-3 bg-maroon text-white text-[10px] uppercase tracking-[0.2em] px-3 py-1">
                            Jadau
                        </span>
                    )}
                    {product.igi_certified && (
                        <span className="absolute bottom-3 left-3 bg-white/90 text-charcoal text-[10px] uppercase tracking-[0.15em] px-2.5 py-1">
                            IGI
                        </span>
                    )}
                </div>
                <div className="pt-4 text-center">
                    <h3 className="font-display text-lg leading-snug group-hover:text-gold transition-colors">
                        {product.name}
                    </h3>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-charcoal/50 mt-1">
                        {diamondLabel[product.diamond_type]}
                    </p>
                    <p className="text-sm font-medium text-gold mt-2">{formatPrice(product.price)}</p>
                </div>
            </Link>
        </div>
    );
}
