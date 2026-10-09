import { useState } from "react";

// Read-only when `onChange` is omitted.
export default function StarRating({ value = 0, onChange, size = 24 }) {
    const [hover, setHover] = useState(0);
    const shown = hover || value;

    return (
        <div className="stars" role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= shown;
                const star = (
                    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"
                            fill={filled ? "var(--signal)" : "none"}
                            stroke={filled ? "var(--signal-dark)" : "var(--line-strong)"}
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />
                    </svg>
                );
                return onChange ? (
                    <button
                        type="button"
                        key={n}
                        className="star-btn"
                        role="radio"
                        aria-checked={value === n}
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => onChange(n)}
                    >
                        {star}
                    </button>
                ) : (
                    <span key={n}>{star}</span>
                );
            })}
        </div>
    );
}
