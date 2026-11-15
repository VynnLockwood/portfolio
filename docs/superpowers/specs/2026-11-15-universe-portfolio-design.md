# Vynn's Universe: portfolio rebuild (design)

Date: 2026-11-15. Repo: `VynnLockwood/portfolio`. Site: https://vynnlockwood.lunariankids.com

## Intent and why

Today the site is one static `index.html`: logo, a headline, five repo links. It is quiet but it does not
show the owner's range. It is rebuilt as a **career portfolio** for people who may want to interview the owner
(recruiters, hiring managers, engineers). The whole site is "my universe": a dark cosmos the visitor explores.
Each **public GitHub project is a 3D body** in that cosmos. Clicking a body opens that repo in a new tab.

The owner wants to be seen as: **Backend, Data engineer, Full-stack, AI**. The visitor should find the role
they care about in one click, see real proof (public repos), and know how to reach the owner.

Greeting (owner's words, typos fixed by me): "Welcome to my universe, hope you enjoy the exploring."

## Goals

1. Next.js site, rebuilt from the current page. Keeps the owner's logo, name, "by Myths of the Moon", footer.
2. Background and feel like the owner's `cosmic-webs` repo: stars, nebula, dust, twinkle, warp, orbit camera.
   The 3D bodies are no longer database tables. They are the 9 repos below.
3. Click a body: the repo opens in a new tab (`noopener`).
4. Four role tags (Backend, Data, Full-stack, AI). Click a tag: matching bodies glow in that role colour, the rest dim.
5. Transitions are smooth: intro, camera fly-ins, role filter, list/3D switch. No frame stutter on a mid-range laptop.
6. No memory leak: GPU memory and JS heap stay flat across long sessions and repeated mount/unmount.
7. **Rust compiled to WebAssembly is the frontend engine** (see Engine).
8. A plain HTML path always exists: list view, readable by search engines, screen readers, phones, no-WebGL.

## Non-goals

- No backend, no database, no GitHub API calls at runtime.
- No private repos linked or named. (Possible later: one "private work, ask me" body with no link. Not in this scope.)
- No blog, CMS, admin UI, analytics, or account features.
- No rewrite of `cosmic-webs` itself. Its code is read and ported, not changed.

## Anti-goals (failure even if it technically works)

- Pretty, but a recruiter cannot find the repos, the roles, or how to contact the owner in under 10 seconds.
- Heavy first load or hot laptop on a phone. The 3D must not block first paint.
- A 3D-only page that is empty to search engines and screen readers.
- Spin and flicker that ignore `prefers-reduced-motion`.

## Constraints

- Deploy stays: cloudflared tunnel → nginx static files on the owner's VPS. So Next.js `output: 'export'`.
- Only public repos are linked (README of this repo already promises that).
- Rust toolchain with `wasm-pack` is needed at build time. The `.wasm` ships as a static file.
- Works with GPU variance: three quality tiers like `cosmic-webs` (`quality.ts`).
- Owner writes the repo list and copy. Final blurbs must match each repo's real README.

## Approaches considered

- **A. Port the cosmic-webs scene; small Rust core in a Web Worker. (CHOSEN, owner picked A.)**
  React + react-three-fiber draws. Rust WASM does layout, star buffers, picking, camera path maths.
  Trade-offs: fastest to ship, same look as the owner's repo, its leak-test habit carries over.
  JS still issues the draw calls, so Rust is the brain, not the whole engine.
- **B. Rust owns everything; plain three.js only uploads buffers.**
  Trade-offs: strongest "Rust engine" story and least per-frame JS garbage, but the most work, and the camera
  feel (already tuned in `cosmic-webs`) must be rebuilt. Rejected for now. The Rust core in A can grow toward B.
- Dropped: a plain 2D page (no wow, does not fit "my universe").

## Content: the 9 bodies (owner approved the list)

| # | Repo | Roles | One-line proof (from its README) |
|---|------|-------|----------------------------------|
| 1 | project-singularity | AI, Backend, Data | Design a PostgreSQL master-data database through prompts and MCP; rules gate and approvals. FastAPI + React. |
| 2 | kuronuma | AI, Backend, Full-stack | Open-source memory for AI assistants over MCP; Go + React; Google sign-in; self-hostable. |
| 3 | cosmic-webs | Full-stack, Data | Postgres schema as a night sky; Rust/WASM planner; three.js; ranks SQL plans. |
| 4 | ETL-Cleansing-tools | Data | Excel to PostgreSQL tables with Superset on top; Docker stack, FastAPI. |
| 5 | ma-ieat | Backend | Go service, clean architecture, InfluxDB + Postgres, IoT sensors; React front. |
| 6 | Salmon.myths | Full-stack | Next.js + FastAPI behind a hardened nginx gateway, Docker Compose. |
| 7 | rainbowq.myths | AI | Identity, memory and capability package for an AI agent on the Hermes framework. |
| 8 | realtime-api-inspector | Backend | Go realtime API inspector with a small web UI. |
| 9 | java-spring-boot-chat-api | Backend | Java Spring Boot chat API with a React front. |

Size and brightness of a body = the owner's ranking (1 biggest). Multi-role repos glow in several role colours.
The data lives in one hand-written `repos.json` (name, url, blurb, roles, stack, weight). Built into the site.
Not fetched at runtime.

Known issues the owner should know about:

- The current page says Salmon is "a fine-tuned LLM for philosophy, mental health, and life". The repo's README
  describes a Next.js + FastAPI + nginx starter. **My call:** the new site follows the README. The owner can
  change the repo README instead if the LLM claim is true.
- Slots 8 and 9 are small repos. Swap candidates if the owner wants: `emqx-test`, `docker-code-server`.
- The old page says "31 public repositories". That count goes stale. **My call:** drop the number.

## Experience

```
 ·    ✦          Welcome to my universe
      ◉ Singularity   ·      hope you enjoy the exploring
  ·         ◎ Cosmic Webs
 ◍ Kuronuma      · ◌ ETL Tools
 [Backend] [Data] [Full-stack] [AI]          [Contact]  [List view]
```

- **Intro (about 3 s, skippable):** camera warps out of black into the cosmos. The welcome line fades in, then
  fades to a small header (logo, name, one-line role statement, role tags, Contact, List view).
- **Explore:** the owner sits as a "sun" in the middle. Repos orbit/hover around in role-weighted clusters
  placed by the Rust layout. Slow drift. Drag to orbit, wheel to zoom, like `cosmic-webs`.
- **Hover/focus:** body brightens, label shows name and one-line blurb.
- **Click or Enter:** the repo opens in a **new tab immediately** (inside the click, so browsers do not block it),
  while the original tab plays a short fly-toward-body move. (My call; a delayed `window.open` would be popup-blocked.)
- **Role tag:** matching bodies glow in the role colour and lift towards the camera; others dim and recede, eased
  over about 600 ms. Tag again to clear.
- **List view:** a clean accessible list of the same 9 repos, roles and blurbs. Always in the HTML (so search
  engines and screen readers read it). Shown by toggle, and automatically for no-WebGL, very small screens or
  `prefers-reduced-motion` visitors (the 3D can still be turned on there, calmer and without the warp).
- Keyboard: Tab cycles bodies in rank order, Enter opens, Esc clears the role filter or returns the camera.

## Engine (Rust WASM)

New crate `universe-core` in this repo, built with `wasm-pack`, loaded in a Web Worker through `comlink`
(the same way `cosmic-webs` does). It owns:

1. **Layout:** force-directed placement of the 9 bodies plus the sun. Role clusters pull bodies together;
   weight sets orbit radius. Seeded, so the sky is the same every visit. Ported from `cosmic-webs/core/src/layout.rs`.
2. **Star buffers:** seeded star, dust and nebula-point positions, sizes, phases and colours as `Float32Array`s,
   handed to three.js without copying per frame.
3. **Picking:** ray against body spheres, returns the hit index.
4. **Camera paths:** ease curves and fly-in/fly-toward waypoints (same feel as `cosmic-webs` `director.ts`).

JS side: Next.js + React for the shell and the overlay UI; react-three-fiber for drawing. The canvas is
client-only (`dynamic(..., { ssr: false })`) and lazy-loaded, so the list/HTML content paints first.

## Smoothness and leak rules (acceptance, not just advice)

- Draw loop reads Rust buffers and does no per-frame allocation (reuse vectors and typed arrays).
- On unmount: dispose every geometry, material and texture, `free()` every wasm-bindgen object, terminate the
  Worker, cancel `requestAnimationFrame`, remove all listeners, release the WebGL context.
- Pause rendering when the tab is hidden. Cap pixel ratio at 2. Lower quality tier if frame time stays high.
- Tests, in the style of `cosmic-webs/web/e2e/leaks.spec.ts`: mount/unmount many times and switch role/list/3D
  repeatedly. Check three.js `renderer.info.memory` (geometries, textures) and JS heap return to baseline.
  Frame-time check for the intro and fly-ins. Rust unit tests for layout, picking and buffers.
- Reduced motion: no warp, no twinkle, no auto drift; transitions become short fades.

## Build and deploy

- `next build` with `output: 'export'` writes static files to `out/`. nginx serves them as today.
- `.wasm` built by `wasm-pack` (script like `core/build-wasm.sh`). CI builds Rust, then Next, then publishes `out/`.
  A JS stub of the WASM package is allowed for UI unit tests, as `cosmic-webs` does.
- Keep `vynn-logo.png`, the favicon, the page title and meta description (updated to say Backend, Data,
  Full-stack, AI), and add Open Graph tags so a shared link looks right.
- Update the repo README: it still says "no build step, no dependencies".

## Left to the builder

File layout, the exact force-layout constants, colours of the four roles (must pass contrast on the dark
background), exact warp and fly timings inside the ranges above, quality-tier thresholds, test tooling versions
(follow `cosmic-webs`), and how the CI job is wired.

## Open items for the owner

- **Contact:** which link should the Contact button use (email address, LinkedIn, GitHub only)? Nothing
  was given, so the placeholder is the GitHub profile.
- **CV:** should there be a downloadable CV or resume link? Not included unless the owner supplies a file.
- **Role statement:** one line under the owner's name. My draft: "Backend, data and AI engineer who builds
  quiet tools." The owner can rewrite it.
