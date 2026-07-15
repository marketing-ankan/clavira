import { Link } from 'react-router-dom';

export default function Logo({ light = false, className = '' }) {
    return (
        <Link to="/" className={`inline-flex flex-col items-center gap-1 ${className}`} aria-label="Clavira home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2 L20 9 L12 22 L4 9 Z" stroke="#b08d57" strokeWidth="1.4" fill="none" />
                <path d="M4 9 H20 M12 2 L8.5 9 L12 22 L15.5 9 Z" stroke="#b08d57" strokeWidth="0.9" fill="none" />
            </svg>
            <span
                className={`font-display text-2xl md:text-3xl tracking-[0.35em] font-medium ${light ? 'text-white' : 'text-charcoal'}`}
                style={{ marginRight: '-0.35em' }}
            >
                CLAVIRA
            </span>
        </Link>
    );
}
