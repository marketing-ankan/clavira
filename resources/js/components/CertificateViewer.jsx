import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

// Prominent certificate assurance on the PDP with a viewer modal
// (pros surface the actual certification rather than burying it).
export default function CertificateViewer({ certificate, product }) {
    const [open, setOpen] = useState(false);
    if (!certificate) return null;

    const labName = certificate.type === 'bis' ? 'BIS Hallmark' : 'IGI';

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="mt-6 w-full flex items-center gap-4 border border-gold/30 bg-gold-pale/30 hover:bg-gold-pale/60 transition-colors px-4 py-3 text-left"
            >
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#b08d57" strokeWidth="1.2" className="shrink-0">
                    <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" /><path d="m9 12 2 2 4-4" />
                </svg>
                <div className="flex-1">
                    <p className="text-sm font-medium">{labName} Certified · {certificate.certificate_no}</p>
                    <p className="text-[11px] text-charcoal/60">Tap to view certificate details &amp; verify authenticity</p>
                </div>
                <span className="text-gold text-lg">›</span>
            </button>

            {createPortal(
                <AnimatePresence>
                    {open && (
                        <>
                            <motion.div className="fixed inset-0 bg-black/50 z-[80]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
                            <motion.div
                                className="fixed z-[90] inset-x-4 top-1/2 mx-auto max-w-md bg-ivory shadow-2xl"
                                style={{ left: '50%' }}
                                initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: '-50%', x: '-50%' }} exit={{ opacity: 0, y: 20, x: '-50%' }}
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                role="dialog" aria-modal="true" aria-label="Certificate"
                            >
                                {/* Certificate header */}
                                <div className="bg-charcoal text-white p-6 text-center relative">
                                    <button onClick={() => setOpen(false)} aria-label="Close" className="absolute top-4 right-4 text-white/60 hover:text-gold">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 6l12 12M18 6L6 18" /></svg>
                                    </button>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d4b98c" strokeWidth="1.2" className="mx-auto mb-2">
                                        <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" /><path d="m9 12 2 2 4-4" />
                                    </svg>
                                    <p className="eyebrow text-gold-light">Certificate of Authenticity</p>
                                    <h3 className="font-display text-2xl mt-1">{labName}</h3>
                                </div>
                                <div className="p-6 space-y-3 text-sm">
                                    <Detail label="Certificate No." value={certificate.certificate_no} mono />
                                    <Detail label="Certifying body" value={certificate.type === 'bis' ? 'Bureau of Indian Standards' : 'International Gemological Institute'} />
                                    {product?.name && <Detail label="Piece" value={product.name} />}
                                    {product?.diamond_quality && <Detail label="Grade" value={product.diamond_quality} />}
                                    <div className="pt-3 border-t border-gold/20">
                                        <Link to={`/verify?no=${certificate.certificate_no}`} className="btn-gold w-full !py-2.5" onClick={() => setOpen(false)}>
                                            Verify this certificate
                                        </Link>
                                        <p className="text-[11px] text-charcoal/60 text-center mt-2">Cross-check the number on our public verification page.</p>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body,
            )}
        </>
    );
}

function Detail({ label, value, mono = false }) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-charcoal/60">{label}</span>
            <span className={`text-right ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</span>
        </div>
    );
}
