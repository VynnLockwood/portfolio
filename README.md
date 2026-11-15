# portfolio

Source of **https://vynnlockwood.lunariankids.com**: a career portfolio shown as a small universe.
Each glowing body is one of my public GitHub projects. Click one to open that repo in a new tab.
A plain HTML list of the same repos is always in the page (search engines, screen readers, and a "List view" button).

Only public repositories are linked.

## How it is built

- **Next.js 16** static export (`output: "export"`), React 19, react-three-fiber for the 3D scene.
- **Rust core** (`core/`, crate `universe-core`) compiled to WebAssembly. It owns the force layout of the bodies,
  the seeded star field, ray picking, and the camera flight paths. It runs in a Web Worker through Comlink,
  so the main thread only draws.
- **Cleanup**: leaving the 3D view terminates the worker, frees the WASM objects and disposes GPU buffers.
  Hidden tabs stop rendering. If WebGL or the worker fails, the page falls back to the list view.
- Repo data lives in `src/data/repos.json`; role tags in `src/data/roles.ts`.

## Commands

```sh
npm ci
sh core/build-wasm.sh      # needs Rust + wasm32-unknown-unknown + wasm-pack
npm run dev                # local dev server
npm test                   # vitest unit tests
(cd core && cargo test --release)   # Rust tests
npm run build              # static site into out/
npm run e2e                # Playwright: leaks, fallback, motion
```

Without a WASM toolchain, `NEXT_PUBLIC_USE_STUB=1 npm run build` uses a JS stub of the core (tests and local look only).
Set `PERF=1` to also run the strict 16.7 ms frame-time test on a machine with a GPU, and `WASM_REAL=1` for the blocked-`.wasm` test.

## Deploy

CI (`.github/workflows/ci.yml`) runs the Rust tests, builds WASM, runs all tests and uploads `out/` as the `site` artifact.
Deploy is manual: rsync `out/` to the nginx root on the VPS (served through a cloudflared tunnel).
