use universe_core::layout::{BodySpec, Layout};

/// The 9 repos: (rank, role mask). Weight = 1.0 - 0.07 * (rank - 1).
const NINE: [u8; 9] = [11, 13, 6, 2, 1, 4, 8, 1, 1];

fn nine() -> Vec<BodySpec> {
    NINE.iter().enumerate().map(|(i, &roles)| BodySpec { weight: 1.0 - 0.07 * i as f32, roles }).collect()
}

fn settle(seed: u32) -> Layout {
    let mut l = Layout::new(&nine(), seed);
    l.step(400);
    l
}

fn dist(p: &[f32], a: usize, b: usize) -> f32 {
    let d: f32 = (0..3).map(|k| (p[a * 3 + k] - p[b * 3 + k]).powi(2)).sum();
    d.sqrt()
}

#[test]
fn same_seed_gives_identical_positions() {
    assert_eq!(settle(1).positions(), settle(1).positions());
}

#[test]
fn different_seed_differs() {
    assert_ne!(settle(1).positions(), settle(2).positions());
}

#[test]
fn positions_are_finite_and_layout_settles_within_400_steps() {
    let l = settle(1);
    assert_eq!(l.positions().len(), 27);
    assert!(l.positions().iter().all(|v| v.is_finite()));
    assert!(l.is_settled());
}

#[test]
fn rank_one_orbits_closer_to_the_sun_than_rank_nine() {
    let l = settle(1);
    let p = l.positions();
    let r = |i: usize| (p[i * 3].powi(2) + p[i * 3 + 1].powi(2) + p[i * 3 + 2].powi(2)).sqrt();
    assert!(r(0) < r(8), "rank1 {} rank9 {}", r(0), r(8));
}

#[test]
fn bodies_sharing_a_role_sit_closer_than_bodies_sharing_none() {
    let l = settle(1);
    let p = l.positions();
    let (mut same, mut ns, mut diff, mut nd) = (0.0, 0.0, 0.0, 0.0);
    for a in 0..9 {
        for b in (a + 1)..9 {
            if NINE[a] & NINE[b] != 0 {
                same += dist(p, a, b);
                ns += 1.0;
            } else {
                diff += dist(p, a, b);
                nd += 1.0;
            }
        }
    }
    assert!(ns > 0.0 && nd > 0.0);
    assert!(same / ns < diff / nd, "same {} diff {}", same / ns, diff / nd);
}

#[test]
fn bodies_do_not_overlap() {
    let l = settle(1);
    let p = l.positions();
    for a in 0..9 {
        for b in (a + 1)..9 {
            assert!(dist(p, a, b) > 6.0, "bodies {a} and {b} too close");
        }
    }
}

#[test]
fn empty_and_single_body_do_not_panic() {
    let mut e = Layout::new(&[], 1);
    e.step(10);
    assert!(e.positions().is_empty());
    let mut s = Layout::new(&[BodySpec { weight: 1.0, roles: 1 }], 1);
    s.step(400);
    assert_eq!(s.positions().len(), 3);
    assert!(s.positions().iter().all(|v| v.is_finite()));
}
