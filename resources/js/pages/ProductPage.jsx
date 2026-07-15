import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { diamondLabel, formatPrice, metalLabel } from '../format';
import { useCart } from '../store';
import WishlistButton from '../components/WishlistButton';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';

const RING_SIZES = ['6', '8', '10', '12', '14', '16', '18'];
const METAL_SWATCH = { yellow: '#d9b36c', white: '#dcdcdc', rose: '#dda583' };

export default function ProductPage() {
    const { slug } = useParams();
    const [data, setData] = useState(null);
    const [activeImg, setActiveImg] = useState(0);
    const [metal, setMetal] = useState(null);
    const [purity, setPurity] = useState(null);
    const [diamond, setDiamond] = useState(null);
    const [size, setSize] = useState('');
    const [openSection, setOpenSection] = useState('description');
    const [adding, setAdding] = useState(false);
    const cartApi = useCart();

    useEffect(() => {
        setData(null);
        api.get(`/products/${slug}`).then(({ data }) => {
            setData(data);
            setActiveImg(0);
            setMetal(data.product.default_metal);
            setPurity(data.product.default_purity);
            setDiamond(data.product.diamond_type);
            setSize('');
        });
        window.scrollTo(0, 0);
    }, [slug]);

    const product = data?.product;
    const variants = product?.variants ?? [];

    const metals = useMemo(() => [...new Set(variants.map((v) => v.metal))], [variants]);
    const purities = useMemo(() => [...new Set(variants.map((v) => v.purity))].sort((a, b) => a - b), [variants]);
    const diamonds = useMemo(() => [...new Set(variants.map((v) => v.diamond_type))], [variants]);

    const selected = useMemo(
        () => variants.find((v) => v.metal === metal && v.purity === purity && v.diamond_type === diamond),
        [variants, metal, purity, diamond]
    );

    const price = product ? product.base_price + (selected?.price_delta ?? 0) : 0;
    const isRing = product?.category?.slug === 'rings';

    const addToCart = async () => {
        if (!product || !cartApi) return;
        setAdding(true);
        try {
            await cartApi.add(product.id, selected?.id ?? null, {
                metal: metalLabel[metal],
                purity,
                diamond: diamondLabel[diamond],
                size: size || undefined,
            });
        } finally {
            setAdding(false);
        }
    };

    if (!product) {
        return (
            <main className="max-w-7xl mx-auto px-4 py-24">
                <div className="grid lg:grid-cols-2 gap-12">
                    <div className="aspect-square bg-ivory-dark animate-pulse" />
                    <div className="space-y-4 pt-8">
                        <div className="h-8 bg-ivory-dark animate-pulse w-2/3" />
                        <div className="h-5 bg-ivory-dark animate-pulse w-1/3" />
                    </div>
                </div>
            </main>
        );
    }

    const sections = [
        ['description', 'Description', product.description],
        ['story', 'Craftsmanship & Story', product.story],
        ['certification', 'Certification & Assurance', null],
        ['shipping', 'Shipping & Exchange', null],
    ];

    return (
        <main className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
            {/* Breadcrumb */}
            <nav className="text-[11px] uppercase tracking-[0.18em] text-charcoal/50 mb-8" aria-label="Breadcrumb">
                <Link to="/" className="hover:text-gold">Home</Link>
                <span className="mx-2">/</span>
                <Link to={`/category/${product.category.slug}`} className="hover:text-gold">{product.category.name}</Link>
                <span className="mx-2">/</span>
                <span className="text-charcoal">{product.name}</span>
            </nav>

            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
                {/* Gallery */}
                <div>
                    <div className="img-zoom aspect-square bg-ivory-dark">
                        {product.images[activeImg] && (
                            <img
                                src={`/${product.images[activeImg].path}`}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>
                    {product.images.length > 1 && (
                        <div className="flex gap-3 mt-4">
                            {product.images.map((img, i) => (
                                <button
                                    key={img.id}
                                    onClick={() => setActiveImg(i)}
                                    className={`w-20 h-20 border-2 ${i === activeImg ? 'border-gold' : 'border-transparent'}`}
                                    aria-label={`View image ${i + 1}`}
                                >
                                    <img src={`/${img.path}`} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details */}
                <div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {product.bis_hallmarked && <Badge>BIS Hallmarked</Badge>}
                        {product.igi_certified && <Badge>IGI Certified</Badge>}
                        {product.diamond_quality && <Badge>{product.diamond_quality}</Badge>}
                        {product.is_jadau && <Badge dark>Jadau Kundan</Badge>}
                    </div>

                    <div className="flex items-start justify-between gap-4">
                        <h1 className="font-display text-3xl md:text-4xl leading-tight">{product.name}</h1>
                        <WishlistButton productId={product.id} className="mt-1 shrink-0 text-charcoal/60 hover:text-gold" />
                    </div>
                    <p className="text-charcoal/60 mt-3 leading-relaxed">{product.description}</p>

                    <p className="font-display text-3xl text-gold mt-6">{formatPrice(price)}</p>
                    <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/40 mt-1">
                        Inclusive of all certifications · GST additional at checkout
                    </p>

                    {/* Configurator */}
                    <div className="mt-8 space-y-6">
                        {metals.length > 1 && (
                            <Option label={`Metal — ${metalLabel[metal]}`}>
                                {metals.map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMetal(m)}
                                        aria-label={metalLabel[m]}
                                        className={`w-9 h-9 rounded-full border-2 transition-transform ${metal === m ? 'border-gold scale-110' : 'border-charcoal/20'}`}
                                        style={{ background: METAL_SWATCH[m] }}
                                    />
                                ))}
                            </Option>
                        )}

                        {purities.length > 1 && (
                            <Option label="Gold Purity">
                                {purities.map((p) => (
                                    <Pill key={p} active={purity === p} onClick={() => setPurity(p)}>{p}kt</Pill>
                                ))}
                            </Option>
                        )}

                        {diamonds.length > 1 && (
                            <Option label="Diamond">
                                {diamonds.map((d) => (
                                    <Pill key={d} active={diamond === d} onClick={() => setDiamond(d)}>
                                        {diamondLabel[d]}
                                    </Pill>
                                ))}
                            </Option>
                        )}

                        {isRing && (
                            <Option label="Ring Size (Indian)">
                                {RING_SIZES.map((s) => (
                                    <Pill key={s} active={size === s} onClick={() => setSize(s)}>{s}</Pill>
                                ))}
                            </Option>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-10">
                        <button className="btn-gold flex-1" onClick={addToCart} disabled={adding}>
                            {adding ? 'Adding…' : 'Add to Cart'}
                        </button>
                        <Link to="/contact" state={{ product: product.name }} className="btn-outline flex-1">
                            Enquire / Customise
                        </Link>
                    </div>

                    <p className="text-[11px] text-charcoal/50 mt-4 leading-relaxed">
                        ✦ Made to order · Dispatched fully insured · Diamonds can be lab-grown or natural as required
                    </p>

                    {/* Accordions */}
                    <div className="mt-10 border-t border-gold/20">
                        {sections.map(([key, title, body]) => (
                            <div key={key} className="border-b border-gold/20">
                                <button
                                    className="w-full flex justify-between items-center py-4 text-left"
                                    onClick={() => setOpenSection(openSection === key ? '' : key)}
                                    aria-expanded={openSection === key}
                                >
                                    <span className="text-[12px] uppercase tracking-[0.2em] font-medium">{title}</span>
                                    <span className="text-gold text-xl leading-none">{openSection === key ? '−' : '+'}</span>
                                </button>
                                {openSection === key && (
                                    <div className="pb-5 text-sm text-charcoal/70 leading-relaxed">
                                        {key === 'certification' ? (
                                            <ul className="space-y-2">
                                                <li>✦ BIS hallmarked gold — certified by the Bureau of Indian Standards</li>
                                                {product.igi_certified && (
                                                    <li>
                                                        ✦ IGI certificate included
                                                        {data.certificate && (
                                                            <> — <Link to={`/verify?no=${data.certificate.certificate_no}`} className="text-gold underline">
                                                                {data.certificate.certificate_no}
                                                            </Link></>
                                                        )}
                                                    </li>
                                                )}
                                                <li>✦ Every piece inspected under 40x magnification before dispatch</li>
                                            </ul>
                                        ) : key === 'shipping' ? (
                                            <ul className="space-y-2">
                                                <li>✦ Zero deductions on gold exchange · 98% gold value return</li>
                                                <li>✦ 70% diamond value return — lifetime exchange promise</li>
                                                <li>✦ Fully insured shipping across India and to 50+ countries</li>
                                            </ul>
                                        ) : (
                                            body
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Related */}
            {data.related?.length > 0 && (
                <section className="mt-24">
                    <Reveal className="text-center mb-10">
                        <h2 className="font-display text-3xl gold-rule">You May Also Admire</h2>
                    </Reveal>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                        {data.related.map((p) => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}

function Badge({ children, dark = false }) {
    return (
        <span className={`text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 ${dark ? 'bg-maroon text-white' : 'bg-gold-pale text-charcoal'}`}>
            {children}
        </span>
    );
}

function Option({ label, children }) {
    return (
        <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-charcoal/60 mb-3">{label}</p>
            <div className="flex flex-wrap gap-2">{children}</div>
        </div>
    );
}

function Pill({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`text-[12px] tracking-[0.08em] px-4 py-2 border transition-colors ${
                active ? 'border-gold bg-gold text-white' : 'border-gold/30 hover:border-gold'
            }`}
        >
            {children}
        </button>
    );
}
