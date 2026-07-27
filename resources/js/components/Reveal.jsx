import { motion } from 'framer-motion';

// House scroll-reveal. Variants echo the pld.live cadence — a signature
// "zoom" (scale + rise) for cards/sections and directional slides for
// alternating content bands. Transforms are kept gentle so the re-trigger
// reads as a smooth settle, not a jump.
const VARIANTS = {
    up: { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0 } },
    zoom: { hidden: { opacity: 0, y: 20, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1 } },
    left: { hidden: { opacity: 0, x: -40 }, show: { opacity: 1, x: 0 } },
    right: { hidden: { opacity: 0, x: 40 }, show: { opacity: 1, x: 0 } },
};

// once=false replays the reveal each time the element re-enters the viewport
// (AOS-style, like pld.live). `amount` (not a pixel margin) is the key to a
// jitter-free re-trigger: show/hide flips only at the viewport edges — when a
// small fraction of the card is visible — instead of at a mid-screen line the
// card can hover on, which is what caused the flicker.
export default function Reveal({ children, delay = 0, className = '', variant = 'up', duration = 0.8, once = false }) {
    const v = VARIANTS[variant] ?? VARIANTS.up;
    return (
        <motion.div
            className={className}
            variants={v}
            initial="hidden"
            whileInView="show"
            viewport={{ once, amount: 0.15 }}
            transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
}
