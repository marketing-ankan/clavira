import { Link } from 'react-router-dom';

/**
 * The real Clavira wordmark — gold gradient with the diamond set in the V.
 * Transparent PNG, so the same asset works on ivory and charcoal grounds.
 */
export default function Logo({ light = false, className = '' }) {
    return (
        <Link to="/" className={`inline-flex items-center ${className}`} aria-label="Clavira home">
            <img
                src="/images/brand/clavira-wordmark.png"
                alt="CLAVIRA"
                className={light ? 'h-9 md:h-11 w-auto' : 'h-8 md:h-10 w-auto'}
                style={light ? { filter: 'brightness(1.12)' } : undefined}
            />
        </Link>
    );
}
