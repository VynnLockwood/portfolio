# Universe Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the bodies and sun look like real space objects, keep the sky sharp at any zoom, make bodies easy to notice, and hint scroll-to-zoom and drag-to-spin.

**Architecture:** Same Next.js + react-three-fiber app and Rust/WASM core. Only the look and UI change, plus one Rust constants change (wider orbits). New pure helpers get unit tests; shaders are checked by headless-Chrome screenshots and the existing leak tests.

**Tech Stack:** react-three-fiber 9, three 0.187, zustand, vitest, Playwright, Rust (native tests).

**Spec:** `docs/superpowers/specs/2026-11-15-universe-polish-design.md`

## Global Constraints

- No per-frame allocation in `useFrame` code: reuse vectors and typed arrays.
- Every geometry, material and texture made is disposed on unmount (leak e2e must stay green).
- No image assets; shaders only. The sky never renders below 1920 px across on `high` and `medium` tiers when the window allows it (dpr up to 2).
- Time for animation accumulates `clampDt(dtMs)` (from `src/scene/pathPlayer.ts`), so a hidden tab never jumps.
- Reduced motion (`prefers-reduced-motion`): no spin, no pulse, no hint fade animation.
- Labels and hint text meet WCAG AA contrast against their dark pill (`contrastRatio` in `src/data/roles.ts`).
- Click-opens-repo, role filter, fallback notice and worker/WASM disposal behave as before. The list view is now the default first view; 3D is opt-in.
- Commits are authored as the repo's configured git user, with no Claude attribution lines.

## Review Focus

- Zoom to `minDistance` beside a planet and the sun: silhouettes must be smooth (not faceted) and nothing clips.
- A body behind the camera or far off screen: its label is hidden, never a NaN or huge transform.
- Role filter dims the planet, its ring and its label together.
- Hint on a touch device, after a window resize, and under reduced motion: it never blocks pointer events and always goes away.
- Hidden tab then back: spin and sun boil do not jump, and no extra GPU objects exist after many view toggles.
- First paint of the list view stays instant: no canvas, worker or WASM starts until the visitor asks for 3D.
- Keyboard and screen reader: the list cards, chips and the 3D button are reachable and named; the disabled 3D button explains why.

---

### Task 1: Planet kinds and seeds, bigger bodies, wider orbits

**Files:**
- Create: `src/scene/planets.ts`, `src/scene/planets.test.ts`
- Modify: `src/scene/Bodies.tsx` (`bodyRadius`), `src/scene/roleMix.test.ts`, `src/scene/CameraRig.tsx` (`FRAME_POINTS`), `core/src/layout.rs` (`ORBIT_MIN`, `ORBIT_SPAN`), `core/tests/layout.rs`

**Interfaces:**
- Produces: `type PlanetKind = "rocky" | "ocean" | "gas" | "storm"`; `planetKind(roles: Role[]): PlanetKind` (first role: backend→rocky, data→ocean, fullstack→gas, ai→storm); `planetSeed(id: string): number` (deterministic, 0..1000, distinct for the 9 repo ids); `hasRing(kind: PlanetKind): boolean` (true only for gas). `bodyRadius(rank)` now runs 6.0 (rank 1) down to 2.25 (rank 9).

- [ ] **Step 1: Write the failing tests** in `planets.test.ts`: kind per first role; seed is stable across calls and the 9 repo seeds are all different; only gas has a ring. In `roleMix.test.ts` change the radius test to expect 6.0 and 2.25, still strictly decreasing.
- [ ] **Step 2:** Run `npx vitest run src/scene/planets.test.ts src/scene/roleMix.test.ts`. Expected: FAIL (module missing, radius 4.0).
- [ ] **Step 3: Implement** `planets.ts` as above; change `bodyRadius` to `6.0 - (rank - 1) * (3.75 / 8)`.
- [ ] **Step 4:** Raise `ORBIT_MIN` to 38.0 and `ORBIT_SPAN` to 112.0 in `core/src/layout.rs`; set `FRAME_POINTS` to `[-150,0,0, 150,0,0, 0,80,0]` and its comment to 150. Update any Rust test that hard-codes the old limit.
- [ ] **Step 5:** Run `npx vitest run` and `cd core && cargo test --release`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: planet kinds, bigger bodies, wider orbits`.

### Task 2: Lit planets with atmosphere, spin and rings

**Files:**
- Modify: `src/scene/Bodies.tsx`
- Test: `src/scene/Bodies.test.tsx` (new)

**Interfaces:**
- Consumes: `planetKind`, `planetSeed`, `hasRing` (Task 1), `clampDt`.
- Produces: `PLANET_SEGMENTS = { width: 64, height: 48 }` exported const; planet material uniforms `uKind`, `uSeed`, `uTime`, `uMix`, `uHover`, `uTint` (role colour of the first role, atmosphere only); one shared `RingGeometry` and one ring mesh per gas planet, following the planet and dimmed by the same mix.

- [ ] **Step 1: Write the failing tests** in `Bodies.test.tsx` (render `<Bodies />` inside a `Canvas`-less r3f test root, as `Universe.test.tsx` mocks do, or test a small exported factory `makePlanetMaterial(roles, id)`): the material has all six uniforms with the kind mapped from the first role; `PLANET_SEGMENTS.width >= 64`; the number of ring meshes equals the number of repos whose first role is fullstack; unmount disposes geometry, materials and ring geometry (spy `dispose`).
- [ ] **Step 2:** Run `npx vitest run src/scene/Bodies.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the shader in `Bodies.tsx`: world-space sun direction `normalize(-worldPos)`; Lambert diffuse with a soft terminator and a small ambient so the night side is not black; per-kind surface from 3D noise on the object-space normal rotated by `uTime * 0.05` (rocky: low-freq grey-blue with darker craters; ocean: teal with white cloud swirls and warm land patches; gas: horizontal bands with turbulence in amber; storm: violet bands with one bright oval); atmosphere = fresnel rim tinted by `uTint`, brighter on the lit side; `uHover` adds rim and a slow pulse (`sin(uTime*3)`, off when reduced motion); `uMix` dims everything as before. Time is `st.time += clampDt(dtMs)/1000` once per frame, frozen when `matchMedia` reduces motion (read once on mount). Ring: `RingGeometry(1.4, 2.2, 96)` tilted about 25 degrees, a `MeshBasicMaterial`-style shader that fades at the edges and is lit from the sun side; same `position` and `scale` as the planet each frame.
- [ ] **Step 4:** Run `npx vitest run src/scene` and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: lit planets with atmosphere, spin and rings`.

### Task 3: Sun as a star

**Files:**
- Modify: `src/scene/Sun.tsx`
- Test: `src/scene/Sun.test.tsx` (new)

**Interfaces:**
- Produces: `Sun()` with no texture loader; a plasma sphere shader (`uTime`) and a camera-facing corona plane with additive blending.

- [ ] **Step 1: Write the failing test** `Sun.test.tsx`: mounting `Sun` does not request `/vynn-logo.png` (spy `TextureLoader.prototype.load`); unmount disposes its geometries and materials.
- [ ] **Step 2:** Run `npx vitest run src/scene/Sun.test.tsx`. Expected: FAIL (it loads the logo).
- [ ] **Step 3: Implement**: sphere radius 6, 64x48 segments; fragment shader: animated 3D fbm granulation mapped to white-yellow-orange, darker limb with a bright edge, values above 1 so Bloom picks them up (`toneMapped={false}`); corona: a plane of 40 x 40 units, `AdditiveBlending`, `depthWrite=false`, radial falloff with a few rays from noise, copying `camera.quaternion` each frame (no allocation); time as in Task 2. Remove the logo texture and its state.
- [ ] **Step 4:** Run `npx vitest run` and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: sun with plasma surface and corona`.

### Task 4: Sharp per-pixel sky

**Files:**
- Modify: `src/scene/space/Nebula.tsx`, `src/scene/quality.ts`, `src/scene/quality.test.ts`, `src/scene/Universe.tsx`
- Test: `src/scene/quality.test.ts`

**Interfaces:**
- Produces: `TierSpec.cubemap` replaced by `nebulaOctaves: number` (high 6, medium 5, low 4); `renderDpr(width: number, tier: Tier): [number, number]` returning `[min, 2]` where `min = tier === "low" ? 1 : Math.min(2, Math.max(1, 1920 / width))`; `Nebula({ octaves }: { octaves: number })` draws a `BackSide` sphere dome (radius 10, `depthTest=false`, `depthWrite=false`, `renderOrder=-1000`, `frustumCulled=false`) whose position copies the camera position each frame; no `scene.background`, no render target.

- [ ] **Step 1: Write the failing tests** in `quality.test.ts`: `renderDpr(1280, "high")` is `[1.5, 2]`; `renderDpr(2560, "high")` is `[1, 2]`; `renderDpr(1280, "low")` is `[1, 2]`; `TIERS.high.nebulaOctaves > TIERS.low.nebulaOctaves`.
- [ ] **Step 2:** Run `npx vitest run src/scene/quality.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**: keep the existing fragment shader look; make the `ridged` and `fbm` loop counts a `#define` set from `octaves` through `material.defines`; drop the cubemap bake; `Universe` passes `dpr={renderDpr(window.innerWidth, tier)}` (tier from `useTier`; move `useTier` use so `Canvas` gets it, e.g. a small wrapper) and `Space` passes `TIERS[tier].nebulaOctaves`. Dispose geometry and material on unmount.
- [ ] **Step 4:** Run `npx vitest run`, `npx tsc --noEmit`, then `NEXT_PUBLIC_USE_STUB=1 CHROMIUM_PATH=/usr/bin/google-chrome npx playwright test e2e/leaks.spec.ts`. Expected: PASS (no GPU growth).
- [ ] **Step 5: Commit** `feat: per-pixel nebula that stays sharp at any zoom`.

### Task 5: Name labels and the zoom/spin hint

**Files:**
- Create: `src/scene/labels.ts`, `src/scene/Labels.tsx`, `src/ui/Hint.tsx`, `src/scene/labels.test.ts`, `src/ui/Hint.test.tsx`
- Modify: `src/scene/Universe.tsx` (mount `LabelDriver`), `src/ui/Shell.tsx` (mount `BodyLabels` and `Hint` in 3D view), `src/app/globals.css`

**Interfaces:**
- Produces: `projectLabel(out: { x: number; y: number; visible: boolean }, world: Vector3, camera: Camera, width: number, height: number, radius: number): void` (fills `out`; `visible=false` when the point is behind the camera, outside the view by more than 10 percent, or any value is not finite); `labelRegistry: Map<string, HTMLElement>`; `BodyLabels()` renders one `<span data-label={id} aria-hidden="true">` per repo (role-colour dot + name) and registers it; `LabelDriver()` in the Canvas writes `transform: translate3d(x, y, 0)` and `data-hidden` each frame from `bodyBuffers`; `Hint()` per the spec text, `pointer-events: none`, shown 3.4 s after mount, hidden on first `wheel`, `pointerdown` followed by a move over 5 px, or `touchmove` on the canvas, and after 12 s; coarse-pointer wording from `matchMedia("(pointer: coarse)")`; role filter sets `data-dim` on labels.

- [ ] **Step 1: Write the failing tests**: `projectLabel` returns visible and the screen centre for a point straight ahead; `visible=false` for a point behind the camera; `visible=false` and no NaN for a point at infinity. `Hint` with fake timers: absent at 3 s, present at 3.5 s, gone after a `wheel` event, gone at 12 s without input; coarse pointer shows "Pinch to zoom"; it has `pointer-events: none` via class and `aria-hidden`. A contrast test: label text colour against the pill colour has `contrastRatio >= 4.5`.
- [ ] **Step 2:** Run `npx vitest run src/scene/labels.test.ts src/ui/Hint.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** as above; CSS for `.body-label` (small pill, `rgba(8,10,30,.8)` background, `will-change: transform`, opacity transition off under reduced motion), `.hint` (bottom centre, fades, `transition: none` under reduced motion). Labels sit below the body by its projected radius.
- [ ] **Step 4:** Run `npx vitest run` and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: body name labels and the zoom and spin hint`.

### Task 6: List view by default, casual modern look, 3D one click away

Added after the owner's request: "make list view the default and the UI more casual and modern, then the user can switch to 3D".

**Files:**
- Modify: `src/ui/view.ts`, `src/ui/view.test.ts`, `src/ui/Shell.tsx`, `src/ui/Shell.test.tsx`, `src/ui/Header.tsx`, `src/ui/RepoList.tsx`, `src/ui/RepoList.test.tsx`, `src/ui/Welcome.tsx`, `src/ui/RoleTags.tsx`, `src/app/globals.css`, `e2e/helpers.ts`, `e2e/leaks.spec.ts`, `e2e/motion.spec.ts`

**Interfaces:**
- Consumes: `useUniverse` (`view`, `setView`, `role`), `hasWebGL`, `useReducedMotion`.
- Produces: the first view is always `"list"` (replace `chooseInitialView` with a constant; delete the width/reduced-motion branches); `canShow3D(): boolean` (WebGL present) disables the "Explore in 3D" button with a title when false; hero block (`<h1>` "Hey, I'm Vynn.", line "Welcome to my universe, hope you enjoy the exploring.", the role line, primary button "Explore in 3D", secondary link "Say hi" with `aria-label="Contact"`); role chips under "Show me:"; `RepoList` renders cards (a two-column grid from 760 px, one column below) where the whole card is the link (`data-repo`, `target="_blank"`, `rel="noopener"`) and shows name, blurb, stack chips (`repo.stack`) and role chips; the greeting overlay (`Welcome`) shows only in the 3D view.

- [ ] **Step 1: Write the failing tests.** `view.test.ts`: initial view is `"list"` for wide, narrow, WebGL and reduced-motion inputs; `canShow3D` follows `hasWebGL`. `RepoList.test.tsx`: each repo renders as one link with its name, blurb, every stack chip and role chip; links open in a new tab with `rel` containing `noopener`; the role filter sets `data-dim` on non-matching cards. `Shell.test.tsx`: wide screen with WebGL still starts in list view; the hero text and "Explore in 3D" are present; clicking "Explore in 3D" sets view `"3d"` and the button reads "Back to list"; without WebGL the button is disabled; `Welcome` is not in the DOM in list view.
- [ ] **Step 2:** Run `npx vitest run src/ui`. Expected: FAIL.
- [ ] **Step 3: Implement** as above. Look: dark glass cards (`rgba(14,17,40,.6)`, 1 px border, 20 px radius, backdrop blur), hover lifts 3 px and glows in the card's first role colour, soft fade-up on load (off under reduced motion), primary button with a violet-to-cyan gradient, friendly sentence-case labels, and a CSS-only starfield behind the list view (layered radial gradients; no JS, no GPU). Keep the 3D header compact. Contrast of every text colour against its background is at least 4.5:1 (use `contrastRatio` in a test for the chip and card text colours).
- [ ] **Step 4:** Make `open()` in `e2e/helpers.ts` load the page, click "Explore in 3D" and wait for the canvas; the first motion test checks the list view for default motion too; keep every other e2e test valid. Run `npx vitest run`, `npx tsc --noEmit` and the Playwright suite. Expected: PASS.
- [ ] **Step 5: Commit** `feat: list view by default with a casual modern look`.

### Task 7: Browser checks, screenshots, docs, final review

**Files:**
- Modify: `src/scene/e2e.ts` (`?tier=high|medium|low` sets the store tier when `?e2e` is on), `e2e/leaks.spec.ts`, `README.md`

- [ ] **Step 1: Write the failing e2e test** in `e2e/leaks.spec.ts`: after warm-up, 10 list/3D toggles do not grow geometry, texture or worker counts with the new ring geometry and sun (existing test covers it; add the `?tier=high` run once) and no `pageerror`.
- [ ] **Step 2:** Run `NEXT_PUBLIC_USE_STUB=1 CHROMIUM_PATH=/usr/bin/google-chrome npx playwright test`. Expected: all PASS, skips unchanged.
- [ ] **Step 3: Visual check** at 1920x1080 with `?e2e=1&tier=high`: intro with hint, zoomed beside a planet, zoomed beside the sun, a phone viewport, role filter on. Save to `/tmp/universe-shots-2/` and look at each. Fix anything that looks flat, faceted, cluttered or unreadable; each fix keeps the suite green.
- [ ] **Step 4:** Update `README.md` (look, hint, `?tier=` for e2e). Run the whole suite: `npx vitest run`, `cd core && cargo test --release`, `npx tsc --noEmit`, `NEXT_PUBLIC_USE_STUB=1 npx next build`, Playwright.
- [ ] **Step 5: Commit** `test: tier override, visual and leak checks; docs`.
