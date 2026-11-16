"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { disposeCore, peekCore, whenCoreReady, workerStats } from "../engine/coreClient";
import { fallbackToList } from "../store/useUniverse";
import { E2E, hook, perf } from "./e2e";
import { Bodies } from "./Bodies";
import { CameraRig } from "./CameraRig";
import { Interaction } from "./Interaction";
import { LabelDriver } from "./Labels";
import { Space, useTier } from "./space/Space";
import { renderDpr } from "./quality";
import { Sun } from "./Sun";
import { Warp } from "./Warp";

// Test hook (only with ?e2e=1): lets the browser tests read GPU memory, worker and wasm counts and frame time.
if (E2E) {
  hook.workers = () => ({ ...workerStats });
  hook.wasmLive = async () => (peekCore() ? peekCore()!.debugLive() : 0);
}

function FpsProbe() {
  const gl = useThree((s) => s.gl);
  const frame = useMemo(() => ({ ms: 0 }), []);
  useEffect(() => {
    if (!E2E) return;
    hook.gpu = () => ({ geometries: gl.info.memory.geometries, textures: gl.info.memory.textures });
    hook.frameMs = () => frame.ms;
    return () => { delete hook.gpu; delete hook.frameMs; };
  }, [gl, frame]);
  useFrame((_, dt) => {
    perf.fps = perf.fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05;
    frame.ms = frame.ms === 0 ? dt * 1000 : frame.ms * 0.95 + dt * 1000 * 0.05;
  });
  return null;
}

/** The cosmos. Loaded client-only and lazily; falls back to the list if WebGL or the WASM core fails. */
export default function Universe() {
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");
  const tier = useTier();
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 0 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const alive = useRef(true);
  const glCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    let dead = false;
    alive.current = true;
    whenCoreReady().catch(() => {
      if (!dead) fallbackToList();
    });
    const onVis = () => setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      dead = true;
      alive.current = false;
      glCleanup.current?.();
      glCleanup.current = null;
      document.removeEventListener("visibilitychange", onVis);
      void disposeCore();
    };
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 40, 220], fov: 55, near: 0.1, far: 12000 }}
      dpr={renderDpr(width, tier)}
      frameloop={frameloop}
      onCreated={({ gl }) => {
        const el = gl.domElement;
        const onLost = (e: Event) => {
          e.preventDefault();
          if (alive.current) fallbackToList(); // an old canvas torn down by a view switch must not push the new view to the list
        };
        el.addEventListener("webglcontextlost", onLost);
        glCleanup.current = () => el.removeEventListener("webglcontextlost", onLost);
      }}
    >
      <color attach="background" args={["#05060F"]} />
      <Space tier={tier} />
      <Sun />
      <Bodies />
      <CameraRig />
      <Interaction />
      <Warp />
      <LabelDriver />
      <FpsProbe />
    </Canvas>
  );
}
