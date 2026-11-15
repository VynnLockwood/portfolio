use universe_core::stars::star_layer;

fn radius(p: &[f32], i: usize) -> f32 {
    (p[i * 3].powi(2) + p[i * 3 + 1].powi(2) + p[i * 3 + 2].powi(2)).sqrt()
}

#[test]
fn same_seed_same_output_and_other_seed_differs() {
    let a = star_layer(0, 50, 1);
    let b = star_layer(0, 50, 1);
    let c = star_layer(0, 50, 2);
    assert_eq!(a.positions, b.positions);
    assert_eq!(a.colors, b.colors);
    assert_ne!(a.positions, c.positions);
}

#[test]
fn array_lengths_match_count() {
    let s = star_layer(2, 37, 3);
    assert_eq!(s.positions.len(), 111);
    assert_eq!(s.colors.len(), 111);
    for v in [&s.sizes, &s.phases, &s.freqs, &s.mags] {
        assert_eq!(v.len(), 37);
    }
}

#[test]
fn far_stars_lie_on_the_4000_sphere() {
    let s = star_layer(0, 200, 1);
    for i in 0..200 {
        assert!((radius(&s.positions, i) - 4000.0).abs() < 1.0);
    }
}

#[test]
fn bright_stars_lie_on_the_3800_sphere_and_are_big() {
    let s = star_layer(1, 100, 1);
    for i in 0..100 {
        assert!((radius(&s.positions, i) - 3800.0).abs() < 1.0);
        assert!(s.sizes[i] >= 4.0 && s.sizes[i] <= 7.0);
    }
}

#[test]
fn mid_stars_lie_in_the_500_to_3500_shell() {
    let s = star_layer(2, 300, 1);
    for i in 0..300 {
        let r = radius(&s.positions, i);
        assert!(r >= 499.0 && r <= 3501.0, "r={r}");
    }
}

#[test]
fn mags_and_colours_are_in_range() {
    let s = star_layer(0, 500, 9);
    assert!(s.mags.iter().all(|m| *m >= 0.4 && *m <= 1.0));
    assert!(s.colors.iter().all(|c| *c >= 0.0 && *c <= 1.0));
    assert!(s.freqs.iter().all(|f| *f >= 0.3 && *f <= 1.5));
}

#[test]
fn zero_count_is_empty() {
    let s = star_layer(0, 0, 1);
    assert!(s.positions.is_empty() && s.sizes.is_empty() && s.colors.is_empty());
}
