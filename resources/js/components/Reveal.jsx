import { motion } from 'framer-motion';

// House scroll-reveal. Variants echo the pld.live cadence — a signature
// "zoom" (scale + rise) for cards/sections and directional slides for
// alternating content bands — at a slow, luxurious ~1s with soft easing.
const VARIANTS = {
    up: { hidden: { opacity: 0, y: 34 }, show: { opacity: 1, y: 0 } },
    zoom: { hidden: { opacity: 0, y: 34, scale: 0.94 }, show: { opacity: 1, y: 0, scale: 1 } },
    left: { hidden: { opacity: 0, x: -52 }, show: { opacity: 1, x: 0 } },
    right: { hidden: { opacity: 0, x: 52 }, show: { opacity: 1, x: 0 } },
};

export default function Reveal({ children, delay = 0, className = '', variant = 'up', duration = 1 }) {
    const v = VARIANTS[variant] ?? VARIANTS.up;
    return (
        <motion.div
            className={className}
            variants={v}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
}
