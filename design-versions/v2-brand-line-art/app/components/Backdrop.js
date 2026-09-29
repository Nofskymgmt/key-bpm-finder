// Decorative line-art background: palm trees, a sun and sparkles in the style of the
// Nofsky art direction guide (thin, loose marks; olive or mauve on off-white).

const round = (n) => Math.round(n * 10) / 10;

function quadPoint([x0, y0], [x1, y1], [x2, y2], t) {
  const u = 1 - t;
  return [u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2];
}

function quadTangent([x0, y0], [x1, y1], [x2, y2], t) {
  const dx = 2 * (1 - t) * (x1 - x0) + 2 * t * (x2 - x1);
  const dy = 2 * (1 - t) * (y1 - y0) + 2 * t * (y2 - y1);
  const len = Math.hypot(dx, dy);
  return [dx / len, dy / len];
}

function cubicPoint([x0, y0], [x1, y1], [x2, y2], [x3, y3], t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * x0 + b * x1 + c * x2 + d * x3, a * y0 + b * y1 + c * y2 + d * y3];
}

// A frond is a curved spine with leaflets hanging off both sides, drooping with "gravity".
function frondPath(crown, ctrl, tip, maxLeaf) {
  let d = `M${crown.map(round).join(' ')} Q${ctrl.map(round).join(' ')} ${tip.map(round).join(' ')}`;
  for (let t = 0.14; t < 0.97; t += 0.055) {
    const [px, py] = quadPoint(crown, ctrl, tip, t);
    const [tx, ty] = quadTangent(crown, ctrl, tip, t);
    const len = maxLeaf * Math.pow(Math.sin(Math.PI * t), 0.8) * (1 - 0.35 * t);
    for (const side of [1, -1]) {
      let dx = tx * 0.55 - ty * side * 0.8;
      let dy = ty * 0.55 + tx * side * 0.8 + 0.45;
      const n = Math.hypot(dx, dy);
      dx /= n;
      dy /= n;
      const ex = px + dx * len, ey = py + dy * len;
      const cx = px + dx * len * 0.5, cy = py + dy * len * 0.5 + len * 0.12;
      d += ` M${round(px)} ${round(py)} Q${round(cx)} ${round(cy)} ${round(ex)} ${round(ey)}`;
    }
  }
  return d;
}

function palmPaths() {
  const base = [150, 600], c1 = [156, 470], c2 = [148, 330], crown = [170, 172];

  // Trunk: two gently curving edges plus ring marks that taper toward the top.
  let trunk = 'M140 600 C146 470 139 330 164 176 M160 600 C166 470 157 330 176 176';
  for (let t = 0.04; t < 0.97; t += 0.055) {
    const [x, y] = cubicPoint(base, c1, c2, crown, t);
    const half = 10 - 4 * t;
    trunk += ` M${round(x - half)} ${round(y)} Q${round(x)} ${round(y + 3)} ${round(x + half)} ${round(y - 1)}`;
  }

  const fronds = [
    [[118, 118], [38, 192]],
    [[118, 88], [52, 96]],
    [[166, 88], [138, 38]],
    [[202, 84], [244, 58]],
    [[232, 120], [292, 160]],
    [[216, 160], [252, 252]],
    [[140, 172], [96, 262]],
  ]
    .map(([ctrl, tip]) => frondPath(crown, ctrl, tip, 26))
    .join(' ');

  return { trunk, fronds };
}

const PALM = palmPaths();

function Palm({ className }) {
  return (
    <svg className={className} viewBox="0 0 300 600" fill="none" aria-hidden="true">
      <path d={PALM.trunk} vectorEffect="non-scaling-stroke" />
      <path d={PALM.fronds} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Sun({ className }) {
  // Hand-drawn feel: rays of slightly uneven length.
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const inner = 46, outer = 60 + (i % 3) * 5;
    return `M${round(80 + Math.cos(a) * inner)} ${round(80 + Math.sin(a) * inner)} L${round(80 + Math.cos(a) * outer)} ${round(80 + Math.sin(a) * outer)}`;
  }).join(' ');
  return (
    <svg className={className} viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <path d="M80 42 C101 41 118 58 118 80 C119 101 101 118 80 118 C59 119 42 101 42 80 C41 60 58 42 81 43" vectorEffect="non-scaling-stroke" />
      <path d={rays} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Sparkle({ className }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M20 2 Q21 19 38 20 Q21 21 20 38 Q19 21 2 20 Q19 19 20 2 Z" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <Sun className="art sun" />
      <Sparkle className="art sparkle sparkle-1" />
      <Sparkle className="art sparkle sparkle-2" />
      <Palm className="art palm palm-left" />
      <Palm className="art palm palm-right" />
      <svg className="art horizon" viewBox="0 0 1200 40" preserveAspectRatio="none" fill="none">
        <path d="M0 30 Q300 18 600 24 T1200 20" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
