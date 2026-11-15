use crate::layout::{BodySpec, Layout};
use wasm_bindgen::prelude::*;

fn js<E: std::fmt::Display>(e: E) -> JsError {
    JsError::new(&e.to_string())
}

#[wasm_bindgen]
pub struct UniverseLayout {
    inner: Layout,
}

#[wasm_bindgen]
impl UniverseLayout {
    /// `bodies_json` is `[{"weight":1.0,"roles":3}, ...]`.
    #[wasm_bindgen(constructor)]
    pub fn new(bodies_json: &str, seed: u32) -> Result<UniverseLayout, JsError> {
        let bodies: Vec<BodySpec> = serde_json::from_str(bodies_json).map_err(js)?;
        Ok(UniverseLayout { inner: Layout::new(&bodies, seed) })
    }
    pub fn step(&mut self, n: u32) {
        self.inner.step(n);
    }
    pub fn positions(&self) -> Vec<f32> {
        self.inner.positions().to_vec()
    }
    pub fn settled(&self) -> bool {
        self.inner.is_settled()
    }
}

use crate::{camera, pick, stars};

#[wasm_bindgen]
pub struct StarLayerData {
    inner: stars::StarLayer,
}

#[wasm_bindgen]
impl StarLayerData {
    pub fn positions(&self) -> Vec<f32> {
        self.inner.positions.clone()
    }
    pub fn sizes(&self) -> Vec<f32> {
        self.inner.sizes.clone()
    }
    pub fn phases(&self) -> Vec<f32> {
        self.inner.phases.clone()
    }
    pub fn freqs(&self) -> Vec<f32> {
        self.inner.freqs.clone()
    }
    pub fn mags(&self) -> Vec<f32> {
        self.inner.mags.clone()
    }
    pub fn colors(&self) -> Vec<f32> {
        self.inner.colors.clone()
    }
}

#[wasm_bindgen(js_name = star_layer)]
pub fn star_layer_wasm(kind: u8, count: u32, seed: u32) -> StarLayerData {
    StarLayerData { inner: stars::star_layer(kind, count, seed) }
}

/// Wrong-length input never panics: it just means "no hit" / "no path".
#[wasm_bindgen(js_name = pick_body)]
pub fn pick_body_wasm(positions: Vec<f32>, radii: Vec<f32>, ray: Vec<f32>) -> i32 {
    match <[f32; 6]>::try_from(ray.as_slice()) {
        Ok(r) => pick::pick_body(&positions, &radii, &r),
        Err(_) => -1,
    }
}

#[wasm_bindgen(js_name = camera_path)]
pub fn camera_path_wasm(from: Vec<f32>, to: Vec<f32>, samples: u32, arc: bool) -> Vec<f32> {
    match (<[f32; 6]>::try_from(from.as_slice()), <[f32; 6]>::try_from(to.as_slice())) {
        (Ok(f), Ok(t)) => camera::camera_path(&f, &t, samples, arc),
        _ => Vec::new(),
    }
}

#[wasm_bindgen(js_name = fly_toward_pose)]
pub fn fly_toward_pose_wasm(body: Vec<f32>, radius: f32, camera: Vec<f32>) -> Vec<f32> {
    match (<[f32; 3]>::try_from(body.as_slice()), <[f32; 3]>::try_from(camera.as_slice())) {
        (Ok(b), Ok(c)) => camera::fly_toward_pose(&b, radius, &c).to_vec(),
        _ => Vec::new(),
    }
}

#[wasm_bindgen(js_name = frame_pose)]
pub fn frame_pose_wasm(positions: Vec<f32>, fov_deg: f32) -> Vec<f32> {
    camera::frame_pose(&positions, fov_deg).to_vec()
}
