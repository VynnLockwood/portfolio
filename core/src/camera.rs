//! Camera path maths: eased, arcing moves sampled up front so the render loop only indexes an array.
//! A pose is `[px, py, pz, tx, ty, tz]` (camera position, then look-at target).

type V = [f32; 3];

fn sub(a: V, b: V) -> V {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}
fn add(a: V, b: V) -> V {
    [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}
fn mul(a: V, k: f32) -> V {
    [a[0] * k, a[1] * k, a[2] * k]
}
fn len(a: V) -> f32 {
    (a[0] * a[0] + a[1] * a[1] + a[2] * a[2]).sqrt()
}
fn norm(a: V) -> V {
    let l = len(a);
    if l < 1e-9 {
        [0.0, 0.0, 1.0]
    } else {
        mul(a, 1.0 / l)
    }
}
fn cross(a: V, b: V) -> V {
    [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

fn ease_in_out_cubic(t: f32) -> f32 {
    if t < 0.5 {
        4.0 * t * t * t
    } else {
        1.0 - (-2.0 * t + 2.0).powi(3) / 2.0
    }
}

/// `samples` poses (min 2) from `from` to `to`, eased; with `arc` the position bulges sideways.
pub fn camera_path(from: &[f32; 6], to: &[f32; 6], samples: u32, arc: bool) -> Vec<f32> {
    let n = samples.max(2) as usize;
    let (fp, ft) = ([from[0], from[1], from[2]], [from[3], from[4], from[5]]);
    let (tp, tt) = ([to[0], to[1], to[2]], [to[3], to[4], to[5]]);
    let d = sub(tp, fp);
    let mut side = cross(d, [0.0, 1.0, 0.0]);
    if len(side) < 1e-6 {
        side = [1.0, 0.0, 0.0];
    }
    let side = norm(side);
    let mut out = Vec::with_capacity(n * 6);
    for s in 0..n {
        let e = ease_in_out_cubic(s as f32 / (n - 1) as f32);
        let mut p = add(fp, mul(d, e));
        if arc {
            p = add(p, mul(side, (std::f32::consts::PI * e).sin() * 0.2 * len(d)));
        }
        let t = add(ft, mul(sub(tt, ft), e));
        out.extend_from_slice(&p);
        out.extend_from_slice(&t);
    }
    out
}

/// Ends 3x the body radius away, on the side the camera is already on, looking at the body.
pub fn fly_toward_pose(body: &[f32; 3], radius: f32, camera: &[f32; 3]) -> [f32; 6] {
    let dir = norm(sub(*camera, *body));
    let p = add(*body, mul(dir, 3.0 * radius));
    [p[0], p[1], p[2], body[0], body[1], body[2]]
}

/// A pose from which the bounding sphere of all points fits in the view.
pub fn frame_pose(positions: &[f32], fov_deg: f32) -> [f32; 6] {
    let pts: Vec<V> = positions.chunks_exact(3).map(|c| [c[0], c[1], c[2]]).collect();
    let n = pts.len().max(1) as f32;
    let c = mul(pts.iter().fold([0.0; 3], |s, p| add(s, *p)), 1.0 / n);
    let r = pts.iter().map(|p| len(sub(*p, c))).fold(40.0f32, f32::max);
    let dist = r / (fov_deg / 2.0).to_radians().sin() * 1.15;
    let p = add(c, mul(norm([0.0, 0.25, 1.0]), dist));
    [p[0], p[1], p[2], c[0], c[1], c[2]]
}
