// JS stand-in for the wasm-pack package (src/wasm). Used by unit tests and by local builds without wasm-pack.
// Same exports and the same maths in simple form; the real thing is the Rust crate in core/.
export default async function init() {}

function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class UniverseLayout {
  constructor(bodiesJson, seed) {
    const bodies = JSON.parse(bodiesJson);
    const r = rng(seed);
    this.n = bodies.length;
    this.pos = new Float32Array(this.n * 3);
    bodies.forEach((b, i) => {
      const radius = 25 + (1 - Math.min(1, Math.max(0, b.weight))) * 90;
      const a = (i / Math.max(1, this.n)) * Math.PI * 2 + r() * 0.5;
      const tilt = (r() - 0.5) * 40;
      this.pos.set([Math.cos(a) * radius, tilt, Math.sin(a) * radius], i * 3);
    });
    this.left = 3;
  }
  step() { if (this.left > 0) this.left--; }
  positions() { return this.pos.slice(); }
  settled() { return this.left === 0; }
  free() { this.n = 0; }
}

export class StarLayerData {
  constructor(count, seed) {
    const r = rng(seed);
    const f = (k) => new Float32Array(count * k);
    this.p = f(3); this.s = f(1); this.ph = f(1); this.fq = f(1); this.m = f(1); this.c = f(3);
    for (let i = 0; i < count; i++) {
      const u = r() * 2 - 1, t = r() * Math.PI * 2, k = Math.sqrt(1 - u * u);
      this.p.set([Math.cos(t) * k, u, Math.sin(t) * k], i * 3);
      this.s[i] = 1.4 + r() * 2; this.ph[i] = r() * 6.28; this.fq[i] = 0.3 + r() * 1.2; this.m[i] = 0.4 + 0.6 * r();
      this.c.set([0.9, 0.95, 1], i * 3);
    }
  }
  positions() { return this.p; } sizes() { return this.s; } phases() { return this.ph; }
  freqs() { return this.fq; } mags() { return this.m; } colors() { return this.c; }
  free() {}
}

export function star_layer(kind, count, seed) {
  const s = new StarLayerData(count, seed);
  const radius = kind === 1 ? 3800 : kind === 2 ? 2000 : 4000;
  for (let i = 0; i < s.p.length; i++) s.p[i] *= radius;
  return s;
}

export function pick_body(positions, radii, ray) {
  if (positions.length !== radii.length * 3 || ray.length !== 6) return -1;
  let best = -1, bestT = Infinity;
  for (let i = 0; i < radii.length; i++) {
    const oc = [ray[0] - positions[i * 3], ray[1] - positions[i * 3 + 1], ray[2] - positions[i * 3 + 2]];
    const b = oc[0] * ray[3] + oc[1] * ray[4] + oc[2] * ray[5];
    const c = oc[0] ** 2 + oc[1] ** 2 + oc[2] ** 2 - radii[i] ** 2;
    const disc = b * b - c;
    if (disc < 0 || -b + Math.sqrt(disc) < 0) continue;
    const t = Math.max(0, -b - Math.sqrt(disc));
    if (t < bestT) { bestT = t; best = i; }
  }
  return best;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const len = (a) => Math.hypot(a[0], a[1], a[2]);

export function camera_path(from, to, samples, arc) {
  const n = Math.max(2, samples);
  const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  let side = [d[1] * 0 - d[2] * 1, d[2] * 0 - d[0] * 0, d[0] * 1 - d[1] * 0];
  if (len(side) < 1e-6) side = [1, 0, 0];
  const sl = len(side);
  const out = new Float32Array(n * 6);
  for (let s = 0; s < n; s++) {
    const e = ease(s / (n - 1));
    for (let k = 0; k < 3; k++) {
      let p = from[k] + d[k] * e;
      if (arc) p += (side[k] / sl) * Math.sin(Math.PI * e) * 0.2 * len(d);
      out[s * 6 + k] = p;
      out[s * 6 + 3 + k] = from[3 + k] + (to[3 + k] - from[3 + k]) * e;
    }
  }
  return out;
}

export function fly_toward_pose(body, radius, camera) {
  const d = [camera[0] - body[0], camera[1] - body[1], camera[2] - body[2]];
  const l = len(d) || 1;
  const u = len(d) < 1e-9 ? [0, 0, 1] : d.map((v) => v / l);
  return new Float32Array([body[0] + u[0] * 3 * radius, body[1] + u[1] * 3 * radius, body[2] + u[2] * 3 * radius, body[0], body[1], body[2]]);
}

export function frame_pose(positions, fovDeg) {
  const n = Math.max(1, positions.length / 3);
  const c = [0, 0, 0];
  for (let i = 0; i < positions.length; i++) c[i % 3] += positions[i] / n;
  let r = 40;
  for (let i = 0; i < positions.length; i += 3) r = Math.max(r, Math.hypot(positions[i] - c[0], positions[i + 1] - c[1], positions[i + 2] - c[2]));
  const dist = (r / Math.sin(((fovDeg / 2) * Math.PI) / 180)) * 1.15;
  const v = [0, 0.25, 1], vl = len(v);
  return new Float32Array([c[0] + (v[0] / vl) * dist, c[1] + (v[1] / vl) * dist, c[2] + (v[2] / vl) * dist, c[0], c[1], c[2]]);
}
