// Decorative landing-page preview: a waveform with a playhead sweeping across it, as if a song
// were being analyzed. Bar heights are generated deterministically so server and client match.

const BARS = 72;
const WIDTH = 720;
const HEIGHT = 96;
const GAP = 4;
const BAR_W = WIDTH / BARS - GAP;

// Stable pseudo-random value in [0, 1) for bar i.
const noise = (i) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

// Loosely song-shaped: quiet intro, build, big drop, breakdown, outro.
const envelope = (t) => {
  if (t < 0.12) return 0.18 + t * 1.5; // intro
  if (t < 0.42) return 0.35 + (t - 0.12) * 1.1; // build
  if (t < 0.7) return 0.95; // drop
  if (t < 0.82) return 0.45; // breakdown
  return Math.max(0.12, 0.45 - (t - 0.82) * 2); // outro
};

const bars = Array.from({ length: BARS }, (_, i) => {
  const t = i / (BARS - 1);
  const h = Math.max(0.08, Math.min(1, envelope(t) * (0.5 + 0.5 * noise(i))));
  const barH = Math.round(h * HEIGHT * 10) / 10;
  return { x: Math.round(i * (BAR_W + GAP) * 10) / 10, y: Math.round(((HEIGHT - barH) / 2) * 10) / 10, h: barH };
});

function Bars({ fill, gradient = false }) {
  return (
    <svg className="wave-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
      {gradient && (
        <defs>
          {/* userSpaceOnUse: one gradient across the whole waveform, not a copy per bar */}
          <linearGradient id="wave-gradient" gradientUnits="userSpaceOnUse" x1="0" x2={WIDTH} y1="0" y2="0">
            <stop offset="0" stopColor="#377276" />
            <stop offset="0.55" stopColor="#8c8a68" />
            <stop offset="1" stopColor="#a08a7e" />
          </linearGradient>
        </defs>
      )}
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={BAR_W} height={b.h} rx={BAR_W / 2} fill={fill} />
      ))}
    </svg>
  );
}

export default function WaveformPreview() {
  return (
    <div className="wave-card glass" role="img" aria-label="Preview: a song's waveform being analyzed, showing F minor at 128 BPM">
      <div className="wave-head">
        <span className="wave-file">sunrise-set.wav</span>
        <span className="wave-status">
          <span className="wave-dot" />
          <span className="wave-label">
            <span className="label-analyzing">Analyzing</span>
            <span className="label-done">Done</span>
          </span>
        </span>
      </div>
      <div className="wave">
        <Bars fill="rgba(107, 94, 84, 0.2)" />
        <div className="wave-progress">
          <Bars fill="url(#wave-gradient)" gradient />
        </div>
        <span className="wave-playhead" />
      </div>
      <div className="wave-results">
        <span className="pill">F minor</span>
        <span className="pill">128 BPM</span>
      </div>
    </div>
  );
}
