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
