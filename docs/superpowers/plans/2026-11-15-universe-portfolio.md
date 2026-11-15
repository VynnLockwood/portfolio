# Vynn's Universe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the portfolio as a Next.js static site where 9 public repos are 3D bodies in a cosmos, driven by a Rust/WASM core.

**Architecture:** Next.js (App Router, `output: 'export'`) renders the shell and an always-present HTML repo list. A lazy, client-only react-three-fiber canvas draws the cosmos, ported from `cosmic-webs`. A new Rust crate `universe-core`, compiled with `wasm-pack` and run in a Web Worker via `comlink`, owns layout, star buffers, picking and camera-path sampling.

**Tech Stack:** Next.js (current stable at build time; React 19, App Router), TypeScript, three `^0.187.0`, `@react-three/fiber ^9.8.2`, `@react-three/drei ^10.7.9`, `@react-three/postprocessing ^3.2.2`, `postprocessing ^6.39.6`, `comlink ^4.4.2`, `zustand ^5.0.16`, vitest + Testing Library, Playwright, Rust + `wasm-bindgen` + `wasm-pack`.

**Spec:** `docs/superpowers/specs/2026-11-15-universe-portfolio-design.md`. Source to port from: https://github.com/VynnLockwood/cosmic-webs (public; clone read-only to `/home/claude/vynnlockwood/cosmic-webs`; paths below prefixed `CW:` mean files in that clone).

## Global Constraints

- Deploy stays cloudflared → nginx static files, so `next.config` has `output: 'export'`; no server features.
- Only public repos are linked or named. No GitHub API, no runtime network calls except loading own static files.
- Greeting copy, exactly: heading `Welcome to my universe`, second line `hope you enjoy the exploring`.
- Role statement, exactly: `Backend, data and AI engineer who builds quiet tools.`
- Contact button points to `https://github.com/VynnLockwood` (placeholder; owner will supply a real link).
- Keep `vynn-logo.png` (moves to `public/`), favicon, title `VynnLockwood`, footer `Lunarian Kids · © 2026 Myths of the Moon` (link `https://lunariankids.com`).
- Repo links: `target="_blank"` and `rel="noopener"`. Opening a repo from a click must call `window.open` synchronously inside the click handler.
- `prefers-reduced-motion`: no warp, no twinkle, no auto drift; moves become 300 ms fades/short moves.
- Cap device pixel ratio at 2. Pause rendering when the tab is hidden.
- Role colours must reach contrast ratio ≥ 4.5:1 against the void colour `#05060F`.
- Work on branch `feat/universe`. Each commit message ends with the two attribution lines from the session's git-attribution reminder (`Co-Authored-By: …` and `Claude-Session: …`). Do not push.

## Review Focus

Failure modes the spec implies but no feature task would otherwise test (each has a test in the owning task):

1. WASM file fails to load or WebGL context is lost → page falls back to list view with a short notice, no blank canvas, no uncaught error. (Task 5)
2. Role tag clicked rapidly mid-transition → last click wins, no body stuck dimmed. (Task 6)
3. Window resized or device pixel ratio changes while mounted → canvas resizes, no extra GPU buffers. (Task 5)
4. Tab hidden for a long time then shown → no giant time step; camera does not teleport; no catch-up burst. (Task 7)
5. View switched to list (or page left) while a worker call is pending → no unhandled rejection, worker terminated, WASM objects freed. (Task 9)

## File Structure

```
core/                         Rust crate `universe-core` (Cargo.toml, build-wasm.sh, src/{lib,layout,stars,pick,camera,wasm}.rs, tests/)
public/{vynn-logo.png,wasm/}  static assets; wasm/ is build output (gitignored)
src/app/{layout.tsx,page.tsx,globals.css}
src/data/{types.ts,roles.ts,repos.json}
src/engine/{coreApi.ts,coreWorker.ts,coreClient.ts}
src/wasm/                     wasm-pack JS glue (gitignored); src/wasm-stub/ is the vitest stand-in
src/store/useUniverse.ts
src/scene/{Universe.tsx,Bodies.tsx,Sun.tsx,CameraRig.tsx,Warp.tsx,quality.ts,space/{Stars,Nebula,Dust,Effects}.tsx}
src/ui/{Shell.tsx,Welcome.tsx,Header.tsx,RoleTags.tsx,RepoList.tsx,view.ts}
e2e/{leaks.spec.ts,motion.spec.ts}
.github/workflows/ci.yml
```

---

### Task 1: Next.js static scaffold, data, HTML list

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/data/types.ts`, `src/data/roles.ts`, `src/data/repos.json`, `src/ui/RepoList.tsx`
- Move: `vynn-logo.png` → `public/vynn-logo.png`. Delete: `index.html`.
- Test: `src/data/repos.test.ts`, `src/ui/RepoList.test.tsx`

**Interfaces:**
- Produces (`src/data/types.ts`): `type Role = "backend" | "data" | "fullstack" | "ai"`; `interface Repo { id: string; name: string; url: string; blurb: string; roles: Role[]; stack: string[]; rank: number }` (rank 1..9, 1 biggest).
- Produces (`src/data/roles.ts`): `ROLES: Record<Role, { label: string; color: string; bit: number }>` with bits backend=1, data=2, fullstack=4, ai=8 and labels `Backend`, `Data`, `Full-stack`, `AI`; `roleMask(roles: Role[]): number`; `contrastRatio(hexA: string, hexB: string): number`.
- Produces (`repos.json` default export is `Repo[]`, ordered by rank): ids/urls `https://github.com/VynnLockwood/<id>`; ranks and roles: 1 project-singularity [ai,backend,data]; 2 kuronuma [ai,backend,fullstack]; 3 cosmic-webs [fullstack,data]; 4 ETL-Cleansing-tools [data]; 5 ma-ieat [backend]; 6 Salmon.myths [fullstack]; 7 rainbowq.myths [ai]; 8 realtime-api-inspector [backend]; 9 java-spring-boot-chat-api [backend]. `blurb` = the spec table's one-line proof, shortened to ≤ 110 chars. `stack` per repo, checked against each repo's README before writing (singularity: Python, FastAPI, React, PostgreSQL, MCP; kuronuma: Go, React, MCP, Docker; cosmic-webs: Rust, WASM, three.js, PostgreSQL; ETL: Python, FastAPI, PostgreSQL, Superset; ma-ieat: Go, InfluxDB, PostgreSQL, React; Salmon: Next.js, FastAPI, nginx, Docker; rainbowq: Python, Hermes; inspector: Go, JavaScript; java chat: Java, Spring Boot, React).
- Produces (`RepoList.tsx`): `RepoList({ visible: boolean }): JSX.Element`, a server-compatible `<nav aria-label="Projects">` with one `<a target="_blank" rel="noopener">` per repo, in rank order. `visible=false` applies class `sr-only-focusable` (visually hidden, revealed on focus).

- [ ] **Step 1:** `git checkout -b feat/universe`. Scaffold the Next.js app by hand (no generator output you do not understand): `next.config.ts` sets `output: 'export'`, `images: { unoptimized: true }`, `trailingSlash: true`. Add deps from Tech Stack.
- [ ] **Step 2: Write failing tests.**
  `repos.test.ts`: `repos.length === 9`; ids unique; every `url` matches `^https://github\.com/VynnLockwood/[\w.-]+$`; ranks are exactly 1..9; every role is a `Role`; every `ROLES[r].color` has `contrastRatio(color, "#05060F") >= 4.5`; `roleMask(["ai","data"]) === 10`.
  `RepoList.test.tsx`: renders 9 anchors, each with `target="_blank"` and `rel` containing `noopener`; first anchor text contains `project-singularity`'s display name; with `visible={false}` the nav has class `sr-only-focusable` and anchors are still in the DOM.
- [ ] **Step 3: Run** `npx vitest run` → FAIL (modules missing).
- [ ] **Step 4: Implement** the files above. `layout.tsx` sets title `VynnLockwood`, description `VynnLockwood — Backend, Data, Full-stack and AI engineer. Bangkok, Thailand.`, favicon `/vynn-logo.png`, Open Graph title/description/image (`/vynn-logo.png`). `page.tsx` renders logo, name `VynnLockwood` with `by Myths of the Moon`, the role statement, a visible `RepoList`, the footer. Port the existing page's look (light CSS in the old `index.html`) only as the temporary base; the dark theme comes in Task 8.
- [ ] **Step 5: Run** `npx vitest run` → PASS. Then `npx next build` and check `out/index.html` contains all 9 repo URLs: `grep -c "github.com/VynnLockwood/" out/index.html` prints ≥ 9.
- [ ] **Step 6: Commit** `feat: Next.js static scaffold with repo data and HTML list`.

---

### Task 2: Rust crate: layout

**Files:**
- Create: `core/Cargo.toml` (name `universe-core`, `crate-type = ["cdylib","rlib"]`, deps `serde`, `serde_json`, `wasm-bindgen`; release profile `opt-level = 3`, `lto = true`), `core/src/lib.rs`, `core/src/layout.rs`, `core/src/wasm.rs`, `core/.gitignore`, `core/rustfmt.toml` (copy from `CW:core/`).
- Test: `core/tests/layout.rs`

**Interfaces:**
- Produces (`layout.rs`): `pub struct BodySpec { pub weight: f32, pub roles: u8 }` (weight 1.0 = biggest, > 0; roles = bitmask from Task 1); `pub struct Layout`; `Layout::new(bodies: &[BodySpec], seed: u32) -> Layout`; `step(&mut self, n: u32)`; `positions(&self) -> &[f32]` (len `n*3`, bodies only; the sun is fixed at the origin and not included); `is_settled(&self) -> bool`.
- Produces (`wasm.rs`): `#[wasm_bindgen] struct UniverseLayout` with `new(bodies_json: &str, seed: u32) -> Result<UniverseLayout, JsError>` (JSON `[{"weight":1.0,"roles":3},…]`), `step(&mut self, n: u32)`, `positions(&self) -> Vec<f32>`, `settled(&self) -> bool`.

- [ ] **Step 1: Write failing tests** in `core/tests/layout.rs`, using the 9 specs from Task 1 (weights `1.0 - 0.07*(rank-1)`, roles masks): (a) same seed gives identical positions after 300 steps; (b) different seed differs; (c) all positions finite and the layout `is_settled()` within 400 steps; (d) rank 1 body is closer to the origin than rank 9; (e) mean distance between pairs that share a role < mean distance between pairs sharing none; (f) empty input and a single body do not panic.
- [ ] **Step 2: Run** `cd core && cargo test --release` → FAIL.
- [ ] **Step 3: Implement** `Layout` by adapting `CW:core/src/layout.rs` (xorshift seed, damping, alpha cooling, Barnes–Hut can be dropped: n ≤ 100, use O(n²) repulsion). Replace FK springs with: spring between every pair that shares a role (rest length 28), a radial pull toward an orbit radius that grows as weight falls, and the existing centering gravity. Constants are the builder's call as long as tests pass.
- [ ] **Step 4: Run** `cargo test --release` → PASS. Run `cargo build --release --target wasm32-unknown-unknown` → compiles (needs `rustup target add wasm32-unknown-unknown`).
- [ ] **Step 5: Commit** `feat(core): universe-core crate with deterministic role-clustered layout`.

---

### Task 3: Rust crate: stars, picking, camera paths

**Files:**
- Create: `core/src/stars.rs`, `core/src/pick.rs`, `core/src/camera.rs`. Modify: `core/src/lib.rs`, `core/src/wasm.rs`.
- Test: `core/tests/stars.rs`, `core/tests/pick.rs`, `core/tests/camera.rs`

**Interfaces:**
- Produces (`stars.rs`): `pub struct StarLayer { pub positions: Vec<f32>, pub sizes: Vec<f32>, pub phases: Vec<f32>, pub freqs: Vec<f32>, pub mags: Vec<f32>, pub colors: Vec<f32> }`; `pub fn star_layer(kind: u8, count: u32, seed: u32) -> StarLayer`. Kinds: 0 far sphere radius 4000, sizes 1.3–3.2; 1 bright sphere radius 3800, sizes 4–7; 2 mid shell radius 500–3500, sizes 1.4–3.4. `mags = 0.4 + 0.6 * u³·²` shape as `CW:web/src/scene/space/Stars.tsx` (`Math.pow(r(), 3.2)`), phases 0..2π, freqs 0.3–1.5, colours use the same temperature palette and weights as `starColor` there.
- Produces (`pick.rs`): `pub fn pick_body(positions: &[f32], radii: &[f32], ray: &[f32; 6]) -> i32` (ray = origin xyz + unit direction xyz; nearest hit index, `-1` for none).
- Produces (`camera.rs`): `pub fn camera_path(from: &[f32; 6], to: &[f32; 6], samples: u32, arc: bool) -> Vec<f32>` (6 floats per sample: position xyz, target xyz; sample 0 = `from`, last = `to`; easing `easeInOutCubic`; arc bulge `0.2·|Δ|·sin(π·e)` sideways, as `arcPose` in `CW:web/src/scene/camera/director.ts`); `pub fn fly_toward_pose(body: &[f32; 3], radius: f32, camera: &[f32; 3]) -> [f32; 6]` (ends 3×radius from the body on the camera's side, target = body); `pub fn frame_pose(positions: &[f32], fov_deg: f32) -> [f32; 6]` (as `frameSetPose`, view dir `[0,0.25,1]`, min radius 40, factor 1.15).
- Produces (`wasm.rs`): `#[wasm_bindgen] struct StarLayerData` with getters `positions()`, `sizes()`, `phases()`, `freqs()`, `mags()`, `colors()` each `Vec<f32>`; free functions `star_layer(kind: u8, count: u32, seed: u32) -> StarLayerData`, `pick_body(positions: Vec<f32>, radii: Vec<f32>, ray: Vec<f32>) -> i32`, `camera_path(from: Vec<f32>, to: Vec<f32>, samples: u32, arc: bool) -> Vec<f32>`, `fly_toward_pose(body: Vec<f32>, radius: f32, camera: Vec<f32>) -> Vec<f32>`, `frame_pose(positions: Vec<f32>, fov_deg: f32) -> Vec<f32>`.

- [ ] **Step 1: Write failing tests.** Stars: same seed same output; `positions.len() == 3·count`, `colors.len() == 3·count`, other arrays `count`; kind 0 points have radius within 1e-2 of 4000; kind 2 radii in [500, 3500]; mags in [0.4, 1.0]; all colour components in [0, 1]; `count = 0` returns empty vectors. Pick: ray along +z from `[0,0,-10]` hits a sphere radius 1 at origin (index 0); picks the nearer of two overlapping spheres; ray that misses returns `-1`; sphere behind the origin returns `-1`; empty positions returns `-1`. Camera: `path[0..6] == from`, last 6 == `to`; `samples = 2` works; with `arc=false` the midpoint position equals the straight-line midpoint; with `arc=true` the midpoint is off the straight line; `fly_toward_pose` end distance = 3·radius and target = body; `frame_pose` of one point still has radius ≥ 40 distance factor.
- [ ] **Step 2: Run** `cargo test --release` → FAIL.
- [ ] **Step 3: Implement** the three modules and the `wasm.rs` exports (convert slices with length checks; return `JsError`-free results, bad lengths yield `-1` / empty, never panic).
- [ ] **Step 4: Run** `cargo test --release` → PASS; `cargo build --release --target wasm32-unknown-unknown` compiles.
- [ ] **Step 5: Commit** `feat(core): star buffers, picking and camera path sampling`.

---

### Task 4: WASM build, worker, client

**Files:**
- Create: `core/build-wasm.sh`, `src/engine/coreApi.ts`, `src/engine/coreWorker.ts`, `src/engine/coreClient.ts`, `src/wasm-stub/universe_core.js`, `src/wasm-stub/universe_core.d.ts`
- Modify: `vitest.config.ts` (alias `@wasm` → `src/wasm-stub` under vitest), `tsconfig.json` (path `@wasm/*` → `src/wasm/*`), `.gitignore` (`src/wasm/`, `public/wasm/`, `core/target/`)
- Test: `src/engine/coreApi.test.ts`

**Interfaces:**
- Produces (`core/build-wasm.sh`): runs `wasm-pack build --target web --release --out-dir ../src/wasm` then copies `src/wasm/universe_core_bg.wasm` to `public/wasm/universe_core_bg.wasm`.
- Produces (`coreApi.ts`):
  ```ts
  export interface StarLayerData { positions: Float32Array; sizes: Float32Array; phases: Float32Array; freqs: Float32Array; mags: Float32Array; colors: Float32Array }
  export interface CoreApi {
    layoutNew(bodies: { weight: number; roles: number }[], seed: number): Promise<void>;
    layoutStep(n: number): Promise<Float32Array>;
    layoutSettled(): Promise<boolean>;
    layoutFree(): Promise<void>;
    starLayer(kind: 0 | 1 | 2, count: number, seed: number): Promise<StarLayerData>;
    pick(positions: Float32Array, radii: Float32Array, ray: Float32Array): Promise<number>;
    cameraPath(from: Float32Array, to: Float32Array, samples: number, arc: boolean): Promise<Float32Array>;
    flyTowardPose(body: Float32Array, radius: number, camera: Float32Array): Promise<Float32Array>;
    framePose(positions: Float32Array, fovDeg: number): Promise<Float32Array>;
    debugLive(): Promise<number>; // count of live wasm objects not yet freed
  }
  export function createCoreApi(wasm: WasmModule): CoreApi;
  ```
  `star_layer` data is copied out of the wasm object and the wasm object is `.free()`d inside `starLayer`; `layoutNew` frees any previous layout first.
- Produces (`coreClient.ts`): `getCore(): CoreApi` (creates the module Worker lazily), `disposeCore(): Promise<void>` (calls `layoutFree`, ignores a rejected call, `terminate()`s the worker, clears the singleton), `setCore(c: CoreApi | null): void` (tests), `workerStats: { created: number; terminated: number }`.
- Produces (`coreWorker.ts`): `await init({ module_or_path: new URL("/wasm/universe_core_bg.wasm", self.location.origin) }); Comlink.expose(createCoreApi(wasm))`. Float32Array results are returned with `Comlink.transfer`.

- [ ] **Step 1: Write failing test** `coreApi.test.ts` with the stub: `layoutNew` twice leaves `debugLive() === 1`; `layoutFree()` gives `0`; `starLayer(0, 10, 1)` returns arrays with lengths 30/10/10/10/10/30 and `debugLive()` unchanged afterwards; `disposeCore()` after `setCore(fake)` calls `terminate` exactly once and a second call is a no-op; `workerStats.created - workerStats.terminated === 0` after dispose.
- [ ] **Step 2: Run** `npx vitest run src/engine` → FAIL.
- [ ] **Step 3: Implement** the files. The stub mirrors the real exports with simple deterministic JS (live-object counter included).
- [ ] **Step 4: Run** `npx vitest run src/engine` → PASS. Run `sh core/build-wasm.sh` (needs `wasm-pack`) and check `public/wasm/universe_core_bg.wasm` exists.
- [ ] **Step 5: Commit** `feat: wasm build script, worker and typed core client`.

---

### Task 5: Cosmos background and canvas shell

**Files:**
- Create: `src/scene/quality.ts`, `src/scene/space/{Stars,Nebula,Dust,Effects}.tsx`, `src/scene/Universe.tsx`, `src/store/useUniverse.ts`
- Test: `src/scene/quality.test.ts`, `src/scene/Universe.test.tsx`

**Interfaces:**
- Consumes: `getCore`, `disposeCore` (Task 4).
- Produces (`quality.ts`): `type Tier = "high" | "medium" | "low"`; `TIERS` and `starCounts(t: Tier)` and `pickTier(avgFps: number): Tier` copied unchanged from `CW:web/src/scene/space/quality.ts` (`high` is 14000/3000/100).
- Produces (`useUniverse.ts`, zustand): `{ role: Role | null; view: "3d" | "list"; hovered: string | null; tier: Tier | "auto"; notice: string | null; setRole(r: Role | null): void; setView(v: "3d" | "list"): void; setHovered(id: string | null): void; setNotice(m: string | null): void }`.
- Produces (`Universe.tsx`): default export `Universe(): JSX.Element`, the `<Canvas>` (`camera={{ position: [0, 40, 220], fov: 55, near: 0.1, far: 12000 }}`, `dpr={[1, 2]}`, color `#05060F`) containing `<Space/>`; on `webglcontextlost` or any `getCore()`/WASM failure it calls `setNotice("3D could not start, showing the list instead.")` and `setView("list")`. Loaded only through `dynamic(() => import("../scene/Universe"), { ssr: false })`.

- [ ] **Step 1: Write failing tests.** `quality.test.ts`: `starCounts("high")` equals `{far:14000, mid:3000, bright:100}`; `pickTier(60)==="high"`, `pickTier(40)==="medium"`, `pickTier(10)==="low"`. `Universe.test.tsx` (with `setCore` fake whose `starLayer` rejects): rendering sets `notice` and `view === "list"` and does not throw (Review Focus 1); (mock `@react-three/fiber`'s `Canvas`, since jsdom has no WebGL) a simulated `webglcontextlost` event does the same. Resize: a test that fires `resize` and changes `devicePixelRatio` to 3 leaves the `Canvas` `dpr` prop at `[1, 2]` and the mocked disposal counter unchanged (Review Focus 3).
- [ ] **Step 2: Run** `npx vitest run src/scene` → FAIL.
- [ ] **Step 3: Implement.** `Stars.tsx`: port `CW:web/src/scene/space/Stars.tsx` but fill the buffers from `core.starLayer(kind, count, seed)` (seeds 1, 2, 3 for far, bright, mid), build `BufferGeometry` once per tier, dispose geometry and material in the effect cleanup. `Nebula.tsx`, `Dust.tsx`, `Effects.tsx`: port from `CW:web/src/scene/space/` replacing store reads with `useUniverse`. `Effects` drops the depth-of-field fly-in toggle's store dependency (a plain `flying` prop from Task 7 later). Canvas uses `frameloop="always"` and a `visibilitychange` listener that switches to `"never"` while hidden.
- [ ] **Step 4: Run** `npx vitest run src/scene` → PASS.
- [ ] **Step 5: Commit** `feat: cosmos background ported from cosmic-webs with Rust star buffers`.

---

### Task 6: Bodies, sun, role filter

**Files:**
- Create: `src/scene/Bodies.tsx`, `src/scene/Sun.tsx`. Modify: `src/scene/Universe.tsx`.
- Test: `src/scene/roleMix.test.ts`

**Interfaces:**
- Consumes: `repos.json`, `ROLES`, `roleMask` (Task 1); `core.layoutNew/layoutStep/layoutSettled` (Task 4); `useUniverse` (Task 5).
- Produces (in `Bodies.tsx`, exported for tests): `bodyRadius(rank: number): number` (rank 1 largest, strictly decreasing, 1.5…4.0 world units); `stepMix(current: number[], target: number[], dtMs: number): number[]` (eases each value toward its target with time constant 150 ms, so a full change takes ≈ 600 ms); `targetMix(role: Role | null, repos: Repo[]): number[]` (1 for repos with the role or when `role` is null, else 0.15).
- `Sun`: emissive sphere at the origin with the owner's logo as a billboard sprite; no click behaviour.
- `Bodies`: one mesh per repo; colour is the role colour (multi-role bodies use a shader with up to three colour bands); brightness and a slight pull toward the camera follow `stepMix`; layout positions come from `layoutStep(3)` every frame until settled (latest-wins, one request in flight; never queue more than one).

- [ ] **Step 1: Write failing tests** `roleMix.test.ts`: `bodyRadius` strictly decreasing for ranks 1..9; `targetMix("data", repos)` is 1 for singularity, cosmic-webs, ETL and 0.15 for the others; `targetMix(null, repos)` is all 1; `stepMix` after 700 ms total (in 16 ms steps) is within 0.02 of target; rapid toggles: apply `targetMix("ai")`, run 100 ms, then `targetMix("backend")`, run 100 ms, then `targetMix(null)`, run 1000 ms → all values within 0.02 of 1 (Review Focus 2: last choice wins, nothing stuck dim).
- [ ] **Step 2: Run** `npx vitest run src/scene/roleMix` → FAIL.
- [ ] **Step 3: Implement** the helpers and components. Dispose each mesh's geometry and material in cleanup; reuse one shared sphere geometry and a `Float32Array` for positions (no per-frame allocation).
- [ ] **Step 4: Run** `npx vitest run` → PASS.
- [ ] **Step 5: Commit** `feat: repo bodies, sun and eased role filter`.

---

### Task 7: Camera rig, intro, warp, reduced motion

**Files:**
- Create: `src/scene/CameraRig.tsx`, `src/scene/Warp.tsx`, `src/scene/pathPlayer.ts`. Modify: `src/scene/Universe.tsx`.
- Test: `src/scene/pathPlayer.test.ts`

**Interfaces:**
- Consumes: `core.cameraPath`, `core.flyTowardPose`, `core.framePose` (Task 4); `CameraControls` from drei.
- Produces (`pathPlayer.ts`): `class PathPlayer { start(path: Float32Array, durationMs: number, nowMs: number): void; sample(nowMs: number, out: Float32Array): boolean /* true while still playing; out = 6 floats */; cancel(): number /* returns progress 0..1 */ }`; `clampDt(dtMs: number): number` (returns `Math.min(dtMs, 50)`).
- `CameraRig`: on mount, intro = `cameraPath` from a far pose to `framePose(positions)` over 2200 ms (300 ms when reduced), `Warp` streaks fade out with it (`Warp.tsx` ports `CW:web/src/scene/camera/Warp.tsx`, disposes its geometry, does nothing when reduced). `flyToward(index)` plays `flyTowardPose` in 1100 ms. `Esc` plays `cameraPath` back to the framed pose in 900 ms. A user drag/zoom cancels the current path without a jump. After 20 s idle the rig drifts at 0.6°/s (off when reduced).

- [ ] **Step 1: Write failing tests** `pathPlayer.test.ts`: `sample` at the start equals the first pose and at/after the end equals the last pose and returns `false`; midway progress is monotone across 10 calls; `cancel()` returns ≈ 0.5 after sampling at half duration; `clampDt(5000) === 50` and `clampDt(16) === 16`; after a simulated 60 s hidden gap, a single `sample` with the clamped dt advances progress by at most 50 ms worth (Review Focus 4).
- [ ] **Step 2: Run** `npx vitest run src/scene/pathPlayer` → FAIL.
- [ ] **Step 3: Implement** `PathPlayer` (interpolates linearly between the sampled poses; the path has 120 samples) and the rig. The rig reads `prefers-reduced-motion` through `useReducedMotion(): boolean`, which this task creates in `src/ui/view.ts` (Task 8 adds `chooseInitialView` and `hasWebGL` to the same file).
- [ ] **Step 4: Run** `npx vitest run` → PASS.
- [ ] **Step 5: Commit** `feat: camera rig with Rust-sampled paths, intro warp and idle drift`.

---

### Task 8: Overlay UI, dark theme, view switching

**Files:**
- Create: `src/ui/Shell.tsx`, `src/ui/Welcome.tsx`, `src/ui/Header.tsx`, `src/ui/RoleTags.tsx`, `src/ui/view.ts`. Modify: `src/app/page.tsx`, `src/app/globals.css`, `src/ui/RepoList.tsx`.
- Test: `src/ui/view.test.ts`, `src/ui/Shell.test.tsx`

**Interfaces:**
- Consumes: `useUniverse` (Task 5), `ROLES`, `RepoList` (Task 1).
- Produces (`view.ts`, adding to the `useReducedMotion` from Task 7): `chooseInitialView(env: { webgl: boolean; width: number; reducedMotion: boolean }): "3d" | "list"` (`list` when `!webgl`, `width < 480`, or `reducedMotion`; else `3d`); `hasWebGL(): boolean`.
- `Shell`: client component. Server HTML is the list view (so crawlers and no-JS visitors see it). After mount it calls `chooseInitialView`, and for `3d` lazy-loads `Universe`. Shows `Welcome` for the intro (heading and second line from Global Constraints, fades out after 3 s or on first pointer/key press), then `Header`: logo, `VynnLockwood`, role statement, `RoleTags` (four `<button aria-pressed>` using `ROLES` labels and colours; pressing the active tag clears it), a `Contact` anchor (`https://github.com/VynnLockwood`, new tab, noopener) and a `List view` / `3D view` toggle button. In `3d` view the `RepoList` is rendered with `visible={false}` (still tabbable); in `list` view with `visible` and the Canvas not mounted. A visible `role="status"` region shows `notice`.
- Dark theme: background `#05060F`, text near-white; keep the old page's typography; footer as in Global Constraints.

- [ ] **Step 1: Write failing tests.** `view.test.ts`: `chooseInitialView({webgl:true,width:1280,reducedMotion:false})==="3d"`; `width:479` → `"list"`; `width:480` → `"3d"`; `webgl:false` → `"list"`; `reducedMotion:true` → `"list"`. `Shell.test.tsx` (Universe mocked): initial render contains the 9 repo anchors; clicking `Backend` sets `aria-pressed="true"` and `store.role==="backend"`, clicking it again clears it; clicking the toggle switches `view` and the mocked Universe unmounts; Contact anchor has `target="_blank"` and `rel` containing `noopener`; the welcome text `Welcome to my universe` and `hope you enjoy the exploring` are present at first and the intro is dismissed by a `keydown`.
- [ ] **Step 2: Run** `npx vitest run src/ui` → FAIL.
- [ ] **Step 3: Implement.** Style so Tab focus is clearly visible in both views.
- [ ] **Step 4: Run** `npx vitest run` → PASS, then `npx next build` succeeds.
- [ ] **Step 5: Commit** `feat: dark shell, welcome, role tags, contact and list/3D switching`.

---

### Task 9: Hover, click-to-open, cleanup

**Files:**
- Modify: `src/scene/Bodies.tsx`, `src/scene/Universe.tsx`, `src/ui/RepoList.tsx`, `src/ui/Shell.tsx`.
- Create: `src/scene/interaction.ts`
- Test: `src/scene/interaction.test.ts`

**Interfaces:**
- Consumes: `core.pick` (Task 4), `CameraRig.flyToward` (Task 7), `useUniverse`.
- Produces (`interaction.ts`): `openRepo(url: string): void` (`window.open(url, "_blank", "noopener")`); `class LatestWins<A extends unknown[], R> { constructor(fn: (...a: A) => Promise<R>, onResult: (r: R) => void); call(...a: A): void }` (at most one request in flight; while one runs only the newest later arguments are kept and sent next; results of superseded calls are dropped).
- Behaviour: pointer move over the canvas raycasts in the camera frame and calls `core.pick` through `LatestWins` (throttled to one per animation frame); a hit sets `hovered` (label shows name and blurb as an HTML overlay); click on a hit calls `openRepo(repo.url)` first, then `flyToward(index)`. Focusing a `RepoList` anchor sets `hovered` to that repo. Enter on a focused anchor opens it natively (real `<a>`). `Esc` clears the role filter if set, otherwise returns the camera.
- Cleanup: unmounting `Universe` (switch to list, or page leave) calls `disposeCore()`, cancels the animation frame and removes all listeners; a pending `pick` that resolves afterwards is ignored.

- [ ] **Step 1: Write failing tests** `interaction.test.ts`: `openRepo` calls a spied `window.open` once with `(url, "_blank", "noopener")`; a click handler test shows `window.open` is called before any awaited promise settles (spy order: called synchronously in the handler, `flyToward` after); `LatestWins` with a slow `fn`: three quick calls produce exactly two `fn` invocations (first and last) and `onResult` is called for first and last only; unmount while a `pick` is pending → no unhandled rejection (`process.on("unhandledRejection")` stays silent), `disposeCore` called once, `workerStats.created === workerStats.terminated` (Review Focus 5).
- [ ] **Step 2: Run** `npx vitest run src/scene/interaction` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run` → PASS.
- [ ] **Step 5: Commit** `feat: hover picking, click opens repo in new tab, full teardown`.

---

### Task 10: Leak and motion browser tests

**Files:**
- Create: `playwright.config.ts` (copy the shape of `CW:web/playwright.config.ts`; `webServer` runs `npx next build && npx serve out -l 3100`), `e2e/leaks.spec.ts`, `e2e/motion.spec.ts`. Modify: `src/scene/Universe.tsx` (test hook).
- Test: the two specs.

**Interfaces:**
- Produces: when the URL has `?e2e=1`, `window.__universe = { gpu(): { geometries: number; textures: number }, workers(): { created: number; terminated: number }, wasmLive(): Promise<number>, frameMs(): number /* rolling mean */ }`. `e2e=1` also fixes the tier to `low` and freezes twinkle.

- [ ] **Step 1: Write the specs** (they fail until the hook exists). `leaks.spec.ts` follows `CW:web/e2e/leaks.spec.ts`: warm up with 3 cycles of `3D → List → 3D` via the toggle, record `gpu()`, run 10 more cycles, expect `geometries` and `textures` ≤ warm values, `workers().created - workers().terminated <= 1` (the live one), `wasmLive()` ≤ warm value, no `pageerror`. A second test toggles every role tag 30 times quickly, then expects no `pageerror` and `gpu()` unchanged. A third resizes the viewport through 3 sizes and checks `gpu()` unchanged (Review Focus 3, in a real browser). A fourth blocks `**/wasm/*.wasm` with `page.route(..., r => r.abort())` and expects the list view visible, `role="status"` text containing `showing the list instead`, and no `pageerror` (Review Focus 1, in a real browser). `motion.spec.ts`: with `reducedMotion: "reduce"` the page starts in list view; switching to 3D shows no `Welcome` fade longer than 400 ms; with default motion `frameMs()` stays below 50 ms over 5 s on the Playwright SwiftShader chromium (a loose bound; a stricter 16 ms check runs only with `PERF=1`).
- [ ] **Step 2: Run** `npx playwright install chromium` (or set `CHROMIUM_PATH`), then `sh core/build-wasm.sh && npx playwright test` → FAIL (no hook).
- [ ] **Step 3: Implement** the hook in `Universe.tsx` using `gl.info.memory`, `workerStats`, `core.debugLive()`, and a `useFrame` rolling mean.
- [ ] **Step 4: Run** `npx playwright test` → PASS. If a leak test fails, fix the disposal that leaks; do not loosen the assertion.
- [ ] **Step 5: Commit** `test: GPU, worker and WASM leak checks and motion checks`.

---

### Task 11: CI, README, final check

**Files:**
- Create: `.github/workflows/ci.yml`. Modify: `README.md`.

**Interfaces:**
- Produces: a workflow that on push and pull request runs: install Rust stable with the `wasm32-unknown-unknown` target and `wasm-pack`; `cargo test --release` in `core/`; `sh core/build-wasm.sh`; `npm ci`; `npx vitest run`; `npx next build`; `npx playwright test`; uploads `out/` as the artifact `site`.
- README documents: what the site is, the Rust-core split, `sh core/build-wasm.sh`, `npm run dev`, tests, and that `out/` is rsynced to the VPS nginx root (deploy stays manual; wiring it to the owner's server is out of scope).

- [ ] **Step 1:** Write the workflow and README. Replace the old line "No build step, no dependencies".
- [ ] **Step 2: Run the whole suite locally:** `cd core && cargo test --release && cd .. && sh core/build-wasm.sh && npx vitest run && npx next build && npx playwright test` → all PASS. `out/index.html` exists and contains the 9 repo URLs and the role statement text.
- [ ] **Step 3: Visual check** with the Chrome tools or Playwright screenshots: intro, explored view, role tag active, list view, a 390 px wide phone viewport. Save screenshots to `/tmp/universe-shots/` and look at them.
- [ ] **Step 4: Commit** `ci: build, test and package the static site; update README`.
- [ ] **Step 5:** Stop. Do not push or open a PR until the owner asks.
