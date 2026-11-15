use universe_core::camera::{camera_path, fly_toward_pose, frame_pose};

const FROM: [f32; 6] = [0.0, 0.0, 100.0, 0.0, 0.0, 0.0];
const TO: [f32; 6] = [50.0, 20.0, 0.0, 10.0, 0.0, 0.0];

fn close(a: &[f32], b: &[f32]) -> bool {
    a.iter().zip(b).all(|(x, y)| (x - y).abs() < 1e-3)
}

#[test]
fn path_starts_at_from_and_ends_at_to() {
    let p = camera_path(&FROM, &TO, 120, true);
    assert_eq!(p.len(), 120 * 6);
    assert!(close(&p[0..6], &FROM));
    assert!(close(&p[119 * 6..], &TO));
}

#[test]
fn two_samples_work() {
    let p = camera_path(&FROM, &TO, 2, true);
    assert_eq!(p.len(), 12);
    assert!(close(&p[0..6], &FROM) && close(&p[6..12], &TO));
}

#[test]
fn without_arc_the_midpoint_is_on_the_straight_line() {
    let p = camera_path(&FROM, &TO, 3, false);
    let mid = &p[6..12];
    assert!(close(&mid[0..3], &[25.0, 10.0, 50.0]), "{mid:?}");
}

#[test]
fn with_arc_the_midpoint_leaves_the_straight_line() {
    let p = camera_path(&FROM, &TO, 3, true);
    let mid = &p[6..9];
    let line = [25.0, 10.0, 50.0];
    let off: f32 = (0..3).map(|k| (mid[k] - line[k]).powi(2)).sum::<f32>().sqrt();
    assert!(off > 1.0, "off={off}");
}

#[test]
fn fly_toward_ends_three_radii_away_looking_at_the_body() {
    let body = [10.0, 5.0, -3.0];
    let pose = fly_toward_pose(&body, 4.0, &[10.0, 5.0, 100.0]);
    let d: f32 = (0..3).map(|k| (pose[k] - body[k]).powi(2)).sum::<f32>().sqrt();
    assert!((d - 12.0).abs() < 1e-3);
    assert!(close(&pose[3..6], &body));
    assert!(pose[2] > body[2], "stays on the camera's side");
}

#[test]
fn frame_pose_of_one_point_keeps_the_minimum_radius() {
    let pose = frame_pose(&[1.0, 2.0, 3.0], 55.0);
    let d: f32 = (0..3).map(|k| (pose[k] - pose[3 + k]).powi(2)).sum::<f32>().sqrt();
    let expect = 40.0 / (55.0f32 / 2.0).to_radians().sin() * 1.15;
    assert!((d - expect).abs() < 0.05, "d={d} expect={expect}");
    assert!(close(&pose[3..6], &[1.0, 2.0, 3.0]));
}

#[test]
fn frame_pose_of_nothing_does_not_panic() {
    let pose = frame_pose(&[], 55.0);
    assert!(pose.iter().all(|v| v.is_finite()));
}
