import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

/** Counts from 0 to `value` when scrolled into view. `suffix` renders after the number. */
export default function Counter({ value, suffix = '', duration = 1.8, className = '' }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-60px' });
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (!inView) return;
        let raf;
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min((now - start) / (duration * 1000), 1);
            const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
            setDisplay(Math.round(eased * value));
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [inView, value, duration]);

    return (
        <span ref={ref} className={className}>
            {display}{suffix}
        </span>
    );
}
