//! Force-directed 3D layout for the repo bodies. The sun sits fixed at the origin and is not in `positions()`.
//! Bodies repel each other, are pulled together when they share a role, and are pulled toward an orbit
//! radius that grows as their weight falls. Seeded, so the sky is the same on every visit.
use serde::Deserialize;

const REPULSION: f32 = 900.0;
const SPRING_K: f32 = 0.08;
const REST_LEN: f32 = 28.0;
const ORBIT_K: f32 = 0.06;
const ORBIT_MIN: f32 = 25.0;
const ORBIT_SPAN: f32 = 90.0;
const GRAVITY: f32 = 0.004;
const DAMPING: f32 = 0.82;
const MAX_STEP: f32 = 12.0;
const ALPHA_DECAY: f32 = 0.9775; // ~300 steps from 1.0 to ALPHA_MIN
const ALPHA_MIN: f32 = 0.001;

#[derive(Clone, Copy, Debug, Deserialize)]
pub struct BodySpec {
    /// 1.0 = biggest body (closest orbit); must be > 0.
    pub weight: f32,
    /// Bitmask of roles; bodies that share a bit are pulled together.
    pub roles: u8,
}

pub struct Layout {
    n: usize,
    pos: Vec<f32>,
    vel: Vec<f32>,
    orbit: Vec<f32>,
    roles: Vec<u8>,
    alpha: f32,
}

struct Rng(u32);
impl Rng {
    fn next(&mut self) -> f32 {
        // xorshift32 -> [0,1)
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.0 = x;
        (x >> 8) as f32 / (1u32 << 24) as f32
    }
}

impl Layout {
    pub fn new(bodies: &[BodySpec], seed: u32) -> Layout {
        let n = bodies.len();
        let mut rng = Rng(seed.wrapping_mul(2654435761).max(1));
        let mut pos = Vec::with_capacity(n * 3);
        for _ in 0..n {
            loop {
                let p = [rng.next() * 2.0 - 1.0, rng.next() * 2.0 - 1.0, rng.next() * 2.0 - 1.0];
                if p[0] * p[0] + p[1] * p[1] + p[2] * p[2] <= 1.0 {
                    pos.extend(p.iter().map(|v| v * 100.0));
                    break;
                }
            }
        }
        let orbit = bodies.iter().map(|b| ORBIT_MIN + (1.0 - b.weight.clamp(0.0, 1.0)) * ORBIT_SPAN).collect();
        Layout { n, pos, vel: vec![0.0; n * 3], orbit, roles: bodies.iter().map(|b| b.roles).collect(), alpha: 1.0 }
    }

    /// x,y,z per body (len n*3).
    pub fn positions(&self) -> &[f32] {
        &self.pos
    }

    pub fn is_settled(&self) -> bool {
        self.alpha < ALPHA_MIN
    }

    pub fn step(&mut self, iterations: u32) {
        for _ in 0..iterations {
            if self.is_settled() {
                return;
            }
            self.one_step();
        }
    }

    fn one_step(&mut self) {
        let n = self.n;
        let mut force = vec![0.0f32; n * 3];
        for i in 0..n {
            let p = [self.pos[i * 3], self.pos[i * 3 + 1], self.pos[i * 3 + 2]];
            // pull toward the body's orbit radius, and a weak pull to the sun
            let r = (p[0] * p[0] + p[1] * p[1] + p[2] * p[2]).sqrt().max(0.01);
            for k in 0..3 {
                force[i * 3 + k] += -p[k] / r * ORBIT_K * (r - self.orbit[i]) - p[k] * GRAVITY;
            }
            for j in (i + 1)..n {
                let mut d = [0.0f32; 3];
                let mut len2 = 0.0;
                for k in 0..3 {
                    d[k] = self.pos[j * 3 + k] - p[k];
                    len2 += d[k] * d[k];
                }
                if len2 < 1e-6 {
                    // coincident: deterministic nudge so they can separate
                    d = [((i % 7) as f32) - 3.0, ((j % 5) as f32) - 2.0, ((i + j) % 3) as f32 - 1.0 + 0.5];
                    len2 = d.iter().map(|v| v * v).sum();
                }
                let len = len2.sqrt().max(0.01);
                // repulsion pushes i away from j and j away from i
                let push = REPULSION / (len2 + 1.0) / len;
                // role spring (only between bodies that share a role)
                let pull = if self.roles[i] & self.roles[j] != 0 { SPRING_K * (len - REST_LEN) / len } else { 0.0 };
                for k in 0..3 {
                    let f = d[k] * (pull - push);
                    force[i * 3 + k] += f;
                    force[j * 3 + k] -= f;
                }
            }
        }
        for i in 0..n * 3 {
            self.vel[i] = (self.vel[i] + force[i] * self.alpha) * DAMPING;
            self.vel[i] = self.vel[i].clamp(-MAX_STEP, MAX_STEP);
            self.pos[i] += self.vel[i];
            if !self.pos[i].is_finite() {
                self.pos[i] = 0.0;
                self.vel[i] = 0.0;
            }
        }
        self.alpha *= ALPHA_DECAY;
    }
}
