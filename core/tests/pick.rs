use universe_core::pick::pick_body;

const AHEAD: [f32; 6] = [0.0, 0.0, -10.0, 0.0, 0.0, 1.0];

#[test]
fn ray_hits_a_sphere_in_front() {
    assert_eq!(pick_body(&[0.0, 0.0, 0.0], &[1.0], &AHEAD), 0);
}

#[test]
fn picks_the_nearer_of_two_overlapping_spheres() {
    let pos = [0.0, 0.0, 0.0, 0.0, 0.0, -0.5];
    assert_eq!(pick_body(&pos, &[1.0, 1.0], &AHEAD), 1);
}

#[test]
fn ray_that_misses_returns_minus_one() {
    assert_eq!(pick_body(&[5.0, 0.0, 0.0], &[1.0], &AHEAD), -1);
}

#[test]
fn sphere_behind_the_origin_returns_minus_one() {
    assert_eq!(pick_body(&[0.0, 0.0, -20.0], &[1.0], &AHEAD), -1);
}

#[test]
fn empty_input_returns_minus_one() {
    assert_eq!(pick_body(&[], &[], &AHEAD), -1);
}

#[test]
fn mismatched_lengths_return_minus_one() {
    assert_eq!(pick_body(&[0.0, 0.0, 0.0], &[], &AHEAD), -1);
}
