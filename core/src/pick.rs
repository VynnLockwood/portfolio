//! Ray picking against the body spheres.

/// `ray` = origin xyz + unit direction xyz. Returns the index of the nearest sphere hit, or -1.
pub fn pick_body(positions: &[f32], radii: &[f32], ray: &[f32; 6]) -> i32 {
    if positions.len() != radii.len() * 3 {
        return -1;
    }
    let (o, d) = ([ray[0], ray[1], ray[2]], [ray[3], ray[4], ray[5]]);
    let mut best = -1;
    let mut best_t = f32::MAX;
    for (i, &r) in radii.iter().enumerate() {
        let oc = [o[0] - positions[i * 3], o[1] - positions[i * 3 + 1], o[2] - positions[i * 3 + 2]];
        let b = oc[0] * d[0] + oc[1] * d[1] + oc[2] * d[2];
        let c = oc[0] * oc[0] + oc[1] * oc[1] + oc[2] * oc[2] - r * r;
        let disc = b * b - c;
        if disc < 0.0 {
            continue;
        }
        let root = disc.sqrt();
        if -b + root < 0.0 {
            continue; // sphere is behind the ray origin
        }
        let t = (-b - root).max(0.0);
        if t < best_t {
            best_t = t;
            best = i as i32;
        }
    }
    best
}
