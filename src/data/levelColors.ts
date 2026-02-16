/** Map shadow level (1-5) to gradient color: blue → purple → green */
export function levelToColor(level: number): string {
  const t = Math.max(0, Math.min(1, (level - 1) / 4));
  if (t <= 0.5) return interpolateHex("#3b82f6", "#8b5cf6", t * 2);
  return interpolateHex("#8b5cf6", "#22c55e", (t - 0.5) * 2);
}

function interpolateHex(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
