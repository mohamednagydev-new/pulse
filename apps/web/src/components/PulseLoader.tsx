/** Branded ECG/heartbeat loader — a scanning pulse line (self-contained SVG). */
export default function PulseLoader({ className = '', size = 120 }: { className?: string; size?: number }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg width={size} height={size * 0.4} viewBox="0 0 120 48" fill="none" aria-label="Loading">
        <path
          d="M2 24 H34 L42 24 L48 8 L58 42 L66 24 L74 24 L80 16 L86 24 H118"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={100}
          strokeDasharray="26 100"
        >
          <animate attributeName="stroke-dashoffset" from="126" to="0" dur="1.3s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
}
