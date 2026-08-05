import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Drag-to-wipe image comparison, used on the PDP to put the studio shot and
 * the on-model shot in the same frame.
 *
 * Pointer events rather than separate mouse/touch handlers, so one code path
 * covers mouse, finger and stylus. Pointer capture keeps the drag alive when
 * the cursor leaves the frame — without it the handle sticks the moment you
 * overshoot the edge, which is exactly when people drag fastest.
 *
 * Keyboard operable and announced as a slider: arrow keys nudge, shift-arrow
 * jumps, Home/End go to either extreme. A drag-only control would be
 * unreachable for keyboard users and is a WCAG 2.1.1 failure.
 */
export default function CompareSlider({
    before,
    after,
    beforeAlt = '',
    afterAlt = '',
    beforeLabel = 'Studio',
    afterLabel = 'On model',
    className = '',
}) {
    const [pct, setPct] = useState(50);
    const [dragging, setDragging] = useState(false);
    const frameRef = useRef(null);

    const setFromClientX = useCallback((clientX) => {
        const rect = frameRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0) return;

        const next = ((clientX - rect.left) / rect.width) * 100;
        setPct(Math.min(100, Math.max(0, next)));
    }, []);

    const onPointerDown = (e) => {
        // Ignore right-click / middle-click drags.
        if (e.button !== undefined && e.button !== 0) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setDragging(true);
        setFromClientX(e.clientX);
    };

    const onPointerMove = (e) => {
        if (!dragging) return;
        setFromClientX(e.clientX);
    };

    const endDrag = (e) => {
        if (!dragging) return;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        setDragging(false);
    };

    const onKeyDown = (e) => {
        const step = e.shiftKey ? 10 : 2;
        const moves = {
            ArrowLeft: -step, ArrowDown: -step,
            ArrowRight: step, ArrowUp: step,
        };

        if (e.key in moves) {
            e.preventDefault();
            setPct((p) => Math.min(100, Math.max(0, p + moves[e.key])));
        } else if (e.key === 'Home') {
            e.preventDefault();
            setPct(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            setPct(100);
        }
    };

    // A drag that ends outside the window never fires our pointerup.
    useEffect(() => {
        if (!dragging) return;
        const stop = () => setDragging(false);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);

        return () => {
            window.removeEventListener('pointerup', stop);
            window.removeEventListener('pointercancel', stop);
        };
    }, [dragging]);

    if (!before || !after) return null;

    return (
        <div
            ref={frameRef}
            className={`relative aspect-square bg-ivory-dark overflow-hidden select-none touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
        >
            {/* Base layer: the "after" image fills the frame. */}
            <img src={after} alt={afterAlt} className="absolute inset-0 w-full h-full object-cover" draggable="false" />

            {/* Overlay: the "before" image, clipped to the handle position.
                clip-path keeps ONE correctly-sized image rather than scaling a
                narrowing box, so nothing distorts as the handle moves. */}
            <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
                aria-hidden="true"
            >
                <img src={before} alt="" className="absolute inset-0 w-full h-full object-cover" draggable="false" />
            </div>

            {/* The screen-reader description of what is being compared. */}
            <span className="sr-only">{beforeAlt}</span>

            <Caption side="left" show={pct > 12}>{beforeLabel}</Caption>
            <Caption side="right" show={pct < 88}>{afterLabel}</Caption>

            {/* Divider + handle */}
            <div
                className="absolute inset-y-0 w-px bg-white/90 shadow-[0_0_0_1px_rgba(26,23,20,0.15)] pointer-events-none"
                style={{ left: `${pct}%` }}
            />

            <button
                type="button"
                role="slider"
                aria-label={`Reveal ${beforeLabel} versus ${afterLabel}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct)}
                aria-valuetext={`${Math.round(pct)}% ${beforeLabel}`}
                onKeyDown={onKeyDown}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-white border border-gold/40 shadow-lg grid place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
                style={{ left: `${pct}%` }}
            >
                {/* Two chevrons: the universal "drag me sideways" affordance. */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-gold-ink" aria-hidden="true">
                    <path d="m10 8-4 4 4 4M14 8l4 4-4 4" />
                </svg>
            </button>
        </div>
    );
}

function Caption({ side, show, children }) {
    return (
        <span
            className={`absolute top-3 ${side === 'left' ? 'left-3' : 'right-3'} px-2.5 py-1 bg-charcoal/70 text-white text-[10px] uppercase tracking-[0.16em] pointer-events-none transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}
        >
            {children}
        </span>
    );
}
