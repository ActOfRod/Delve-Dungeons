"use client";

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 26],
    [72, 26],
    [28, 50],
    [72, 50],
    [28, 74],
    [72, 74],
  ],
};

// A d20 rendered as a faceted icosahedron-ish badge; smaller dice use pips.
export function Die({
  value,
  sides = 20,
  rolling = false,
  size = 64,
}: {
  value: number;
  sides?: number;
  rolling?: boolean;
  size?: number;
}) {
  if (sides === 6 && PIPS[value]) {
    return (
      <div
        className={rolling ? "dd-roll-anim" : ""}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <rect
            x="6"
            y="6"
            width="88"
            height="88"
            rx="16"
            fill="rgba(20,17,33,0.95)"
            stroke="#d8b46a"
            strokeWidth="3"
          />
          {PIPS[value].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="7" fill="#f6894f" />
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div
      className={rolling ? "dd-roll-anim" : ""}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <polygon
          points="50,4 92,28 92,72 50,96 8,72 8,28"
          fill="url(#dieGrad)"
          stroke="#d8b46a"
          strokeWidth="3"
        />
        <polygon
          points="50,4 92,28 50,50 8,28"
          fill="rgba(255,255,255,0.06)"
        />
        <polygon points="92,28 92,72 50,50" fill="rgba(0,0,0,0.18)" />
        <text
          x="50"
          y="58"
          textAnchor="middle"
          fontSize="34"
          fontWeight="700"
          fill="#ece3cf"
          fontFamily="var(--font-cinzel), serif"
        >
          {value}
        </text>
        <defs>
          <linearGradient id="dieGrad" x1="0" y1="0" x2="100" y2="100">
            <stop stopColor="#2a2542" />
            <stop offset="1" stopColor="#15121f" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
