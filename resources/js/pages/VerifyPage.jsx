import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';

export default function VerifyPage() {
    const [params] = useSearchParams();
    const [no, setNo] = useState(params.get('no') ?? '');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const verify = async (value) => {
        if (!value.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const { data } = await api.post('/certificates/verify', { certificate_no: value.trim() });
            setResult(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        if (params.get('no')) verify(params.get('no'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <main>
            <section className="bg-charcoal text-white text-center py-20 px-4">
                <p className="eyebrow text-gold-light mb-4">Assurance</p>
                <h1 className="font-display text-4xl md:text-5xl">Verify Your Certificate</h1>
                <p className="text-white/60 mt-4 max-w-xl mx-auto">
                    Every Clavira piece carries independent certification. Enter your IGI or BIS report
                    number to confirm its authenticity.
                </p>
            </section>

            <section className="max-w-xl mx-auto px-4 py-16">
                <form
                    onSubmit={(e) => { e.preventDefault(); verify(no); }}
                    className="flex flex-col sm:flex-row gap-3"
                >
                    <input
                        value={no}
                        onChange={(e) => setNo(e.target.value)}
                        placeholder="e.g. IGI600100001"
                        className="flex-1 border border-gold/40 focus:border-gold px-5 py-4 bg-white font-display text-lg"
                        aria-label="Certificate number"
                    />
                    <button type="submit" className="btn-gold" disabled={loading}>
                        {loading ? 'Verifying…' : 'Verify'}
                    </button>
                </form>

                {result && !result.found && (
                    <div className="mt-10 border border-maroon/40 bg-maroon/5 p-6 text-center">
                        <p className="font-display text-xl text-maroon">Certificate not found</p>
                        <p className="text-sm text-charcoal/60 mt-2">
                            Please check the number and try again, or contact our team for assistance.
                        </p>
                    </div>
                )}

                {result?.found && (
                    <div className="mt-10 border border-gold/40 bg-white p-8">
                        <div className="flex items-center justify-between border-b border-gold/20 pb-4">
                            <div>
                                <p className="eyebrow text-gold-ink">Verified ✦ Authentic</p>
                                <h2 className="font-display text-2xl mt-1">{result.certificate.item_name}</h2>
                            </div>
                            {result.certificate.product_image && (
                                <img src={`/${result.certificate.product_image}`} alt="" className="w-20 h-20 object-cover" />
                            )}
                        </div>
                        <dl className="mt-5 space-y-3 text-sm">
                            <Row label="Certificate No." value={result.certificate.certificate_no} />
                            <Row label="Authority" value={result.certificate.type === 'IGI' ? 'International Gemological Institute' : 'Bureau of Indian Standards'} />
                            {Object.entries(result.certificate.details ?? {}).map(([k, v]) => (
                                <Row key={k} label={k.replace(/_/g, ' ')} value={v} />
                            ))}
                            {result.certificate.issued_on && <Row label="Issued" value={result.certificate.issued_on} />}
                        </dl>
                        {result.certificate.product_slug && (
                            <Link to={`/product/${result.certificate.product_slug}`} className="btn-outline w-full mt-6">
                                View This Piece
                            </Link>
                        )}
                    </div>
                )}
            </section>
        </main>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex justify-between gap-6">
            <dt className="uppercase tracking-[0.15em] text-[11px] text-charcoal/60 capitalize">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
        </div>
    );
}
