"use client";
import { lazy, Suspense, useEffect } from "react";
import { useUniverse } from "../store/useUniverse";
import { Header } from "./Header";
import { RepoList } from "./RepoList";
import { chooseInitialView, hasWebGL, useReducedMotion } from "./view";
import { Welcome } from "./Welcome";

// loaded only after mount, and only when the 3D view is on
const Universe = lazy(() => import("../scene/Universe"));

/** The page. Server HTML is the list view, so crawlers, screen readers and no-JS visitors get the full content. */
export function Shell() {
  const view = useUniverse((s) => s.view);
  const role = useUniverse((s) => s.role);
  const notice = useUniverse((s) => s.notice);
  const setView = useUniverse((s) => s.setView);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setView(chooseInitialView({ webgl: hasWebGL(), width: window.innerWidth, reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches }));
    // decide once, on mount; later changes come from the toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="shell" data-view={view} data-reduced={reducedMotion}>
      {view === "3d" && (
        <div className="stage">
          <Suspense fallback={null}>
            <Universe />
          </Suspense>
        </div>
      )}
      <div className="content">
        <Header />
        <Welcome />
        <div role="status" className="notice">{notice}</div>
        <RepoList visible={view === "list"} role={role} />
        <footer className="foot">
          <a href="https://lunariankids.com">Lunarian Kids</a> · © 2026 Myths of the Moon
        </footer>
      </div>
    </div>
  );
}
