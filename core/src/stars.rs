//! Seeded star, dust and nebula-point buffers, laid out the way the cosmic-webs sky is.
//! Kinds: 0 far sphere (r 4000), 1 bright sphere (r 3800), 2 mid shell (r 500..3500).

pub struct StarLayer {
    pub positions: Vec<f32>,
    pub sizes: Vec<f32>,
    pub phases: Vec<f32>,
    pub freqs: Vec<f32>,
    pub mags: Vec<f32>,
    pub colors: Vec<f32>,
}

/// mulberry32, the same generator the web version used.
struct Rng(u32);
impl Rng {
    fn next(&mut self) -> f32 {
        self.0 = self.0.wrapping_add(0x6d2b79f5);
        let mut t = (self.0 ^ (self.0 >> 15)).wrapping_mul(1 | self.0);
        t = t.wrapping_add((t ^ (t >> 7)).wrapping_mul(61 | t)) ^ t;
        ((t ^ (t >> 14)) as f64 / 4294967296.0) as f32
    }
}

/// Star colours by temperature: blue-white, white, yellow, orange, red (rarer at the ends).
const PALETTE: [(f32, [f32; 3]); 5] = [
    (0.18, [0.66, 0.78, 1.0]),
    (0.40, [0.96, 0.97, 1.0]),
    (0.24, [1.0, 0.95, 0.78]),
    (0.11, [1.0, 0.80, 0.55]),
    (0.07, [1.0, 0.58, 0.38]),
];

fn star_color(u: f32) -> [f32; 3] {
    let mut acc = 0.0;
    for (w, c) in PALETTE {
        acc += w;
        if u < acc {
            return c;
        }
    }
    PALETTE[PALETTE.len() - 1].1
}

fn on_sphere(rng: &mut Rng, radius: f32) -> [f32; 3] {
    let u = rng.next() * 2.0 - 1.0;
    let t = rng.next() * std::f32::consts::TAU;
    let k = (1.0 - u * u).max(0.0).sqrt();
    [t.cos() * k * radius, u * radius, t.sin() * k * radius]
}

pub fn star_layer(kind: u8, count: u32, seed: u32) -> StarLayer {
    let n = count as usize;
    let (size_lo, size_hi) = match kind {
        1 => (4.0, 7.0),
        2 => (1.4, 3.4),
        _ => (1.3, 3.2),
    };
    let mut rng = Rng(seed);
    let mut out = StarLayer {
        positions: Vec::with_capacity(n * 3),
        sizes: Vec::with_capacity(n),
        phases: Vec::with_capacity(n),
        freqs: Vec::with_capacity(n),
        mags: Vec::with_capacity(n),
        colors: Vec::with_capacity(n * 3),
    };
    for _ in 0..n {
        let p = match kind {
            1 => on_sphere(&mut rng, 3800.0),
            2 => {
                let radius = 500.0 + rng.next() * 3000.0;
                on_sphere(&mut rng, radius)
            }
            _ => on_sphere(&mut rng, 4000.0),
        };
        out.positions.extend_from_slice(&p);
        // few bright stars, many faint ones
        let m = rng.next().powf(3.2);
        out.mags.push(0.4 + 0.6 * m);
        out.sizes.push(size_lo + m * (size_hi - size_lo));
        out.phases.push(rng.next() * std::f32::consts::TAU);
        out.freqs.push(0.3 + rng.next() * 1.2);
        out.colors.extend_from_slice(&star_color(rng.next()));
    }
    out
}
