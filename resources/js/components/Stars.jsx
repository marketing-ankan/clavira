export default function Stars({ value = 0, size = 16, className = '' }) {
    return (
        <span className={`inline-flex ${className}`} aria-label={`${value} out of 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} width={size} height={size} viewBox="0 0 24 24"
                    fill={i <= Math.round(value) ? '#b08d57' : 'none'}
                    stroke="#b08d57" strokeWidth="1.3">
                    <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.7 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
                </svg>
            ))}
        </span>
    );
}
