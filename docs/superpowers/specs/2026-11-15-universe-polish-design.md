# Universe polish: design

Status: owner asked for this and said "pick what you think is good", so the choices below are the builder's calls, written down for the record. Builds on `feat/universe` (PR #1).

## Intent
Keep the 3D universe. Make it easier to notice and to use, and make the bodies look like space things instead of flat dots. Owner asks: (1) easier to notice, (2) when zoomed in the background and nebula stay sharp (FHD), (3) hint "scroll to zoom, drag to spin", (4) the project dots and the sun do not look like space things.

## Goals
- Bodies look like planets: lit by the sun, dark side, thin atmosphere glow, slow spin. Surface follows the first role: Backend rocky, Data ocean bands, Full-stack gas giant with a ring, AI violet storm giant. Procedural shaders only, no image files.
- Sun looks like a star: boiling plasma surface and a soft corona. The logo stays in the header only.
- Easier to notice: bodies 1.5x bigger (layout orbits widened to match), a small name label next to each body, a soft pulse on hover.
- Hint line at the bottom: "Scroll to zoom · Drag to spin · Click a world to open it" (touch: "Pinch to zoom · Drag to spin · Tap a world to open it"). Appears after the greeting, disappears on first use or after 12 s.
- Sky stays sharp at any zoom: nebula drawn per pixel at screen resolution on a dome that follows the camera, instead of a fixed-size cubemap. Render scale keeps at least 1920 pixels across on high and medium tiers.

- The list view is the default first view, with a casual, modern look (hero, role chips, card grid, CSS starfield). 3D is one clear button away: "Explore in 3D". Nothing 3D loads until the visitor asks. (Owner request after the first draft.)

## Non-goals
- No new repos, no new pages, no change to click-opens-repo, role filter, fallback or the Rust/WASM split.
- No image or model assets.

## Anti-goals
- Per-frame allocation, leaks, or a longer first paint.
- Labels that cover each other into noise or fail contrast (WCAG AA).
- A hint that blocks the canvas or never goes away.

## Approaches (decided by the builder)
- Planet look: procedural shaders (picked) vs texture images. Images need assets and a network fetch; shaders are tiny and scale with zoom.
- Sharp sky: per-pixel nebula (picked; four nebulae early-out by angle, so most pixels are cheap; octaves drop on lower tiers) vs bigger cubemap (a 4096 float cube is about 800 MB; rejected) vs a screen-size cache redrawn on rotation (more state, more bugs).
- Labels: DOM overlays moved each frame (picked; crisp text, free a11y control) vs drei Html (per-frame allocation) vs canvas text sprites (blurry on zoom).

## Left to the builder
Exact colours, noise scales, label offset, hint styling, easing.
