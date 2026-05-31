export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className="drop-shadow-[0_0_8px_rgba(124,107,214,0.6)]"
      >
        <path
          d="M16 2 3 9.5v13L16 30l13-7.5v-13L16 2Z"
          stroke="url(#g)"
          strokeWidth="1.6"
          fill="rgba(124,107,214,0.12)"
        />
        <path
          d="M16 8.5 9 12.5v7l7 4 7-4v-7l-7-4Z"
          stroke="url(#g)"
          strokeWidth="1.2"
          fill="rgba(224,101,58,0.18)"
        />
        <circle cx="16" cy="16" r="2.4" fill="#f6894f" />
        <defs>
          <linearGradient id="g" x1="3" y1="2" x2="29" y2="30">
            <stop stopColor="#d8b46a" />
            <stop offset="1" stopColor="#7c6bd6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="font-display text-lg font-semibold tracking-wide text-parchment">
        Delve<span className="text-ember">Dungeons</span>
      </span>
    </span>
  );
}
