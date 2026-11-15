"use client";
import { lazy, Suspense, useEffect } from "react";
import repos from "../data/repos.json";
import type { Repo } from "../data/types";
import { rig } from "../scene/rigRef";
import { useUniverse } from "../store/useUniverse";
import { BodyLabels } from "../scene/Labels";
import { Header } from "./Header";
import { Hint } from "./Hint";
import { RepoList } from "./RepoList";
import { chooseInitialView, hasWebGL, useReducedMotion } from "./view";
import { Welcome } from "./Welcome";

// loaded only after mount, and only when the 3D view is on
const list = repos as Repo[];

const Universe = lazy(() => import("../scene/Universe"));

/** The page. Server HTML is the list view, so crawlers, screen readers and no-JS visitors get the full content. */
export function Shell() {
  const view = useUniverse((s) => s.view);
  const role = useUniverse((s) => s.role);
  const notice = useUniverse((s) => s.notice);
  const setView = useUniverse((s) => s.setView);
  const hovered = useUniverse((s) => s.hovered);
  const setHovered = useUniverse((s) => s.setHovered);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setView(chooseInitialView({ webgl: hasWebGL(), width: window.innerWidth, reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches }));
    // decide once, on mount; later changes come from the toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc clears the role filter, or else flies the camera back
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (useUniverse.getState().role) useUniverse.getState().setRole(null);
      else rig.back?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hoveredRepo = hovered ? list.find((r) => r.id === hovered) : undefined;
  const idOf = (t: EventTarget) => (t as HTMLElement).closest?.("[data-repo]")?.getAttribute("data-repo") ?? null;

  return (
    <div className="shell" data-view={view} data-reduced={reducedMotion}>
      {view === "3d" && (
        <>
          <div className="stage">
            <Suspense fallback={null}>
              <Universe />
            </Suspense>
          </div>
          <BodyLabels />
          <Hint />
        </>
      )}
      <div className="content">
        <Header />
        <Welcome />
        <div role="status" className="notice">{notice}</div>
        {hoveredRepo && view === "3d" && (
          <div className="hover-label" aria-hidden="true">
            <strong>{hoveredRepo.name}</strong> <span>{hoveredRepo.blurb}</span>
          </div>
        )}
        {/* keyboard focus on a list link lights the matching body */}
        <div onFocus={(e) => { const id = idOf(e.target); if (id) setHovered(id); }} onBlur={() => setHovered(null)}>
          <RepoList visible={view === "list"} role={role} />
        </div>
        <footer className="foot">
          <a href="https://lunariankids.com">Lunarian Kids</a> · © 2026 Myths of the Moon
        </footer>
      </div>
    </div>
  );
}
