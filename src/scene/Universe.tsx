"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { disposeCore, peekCore, whenCoreReady, workerStats } from "../engine/coreClient";
import { fallbackToList } from "../store/useUniverse";
import { E2E, hook, perf } from "./e2e";
import { Bodies } from "./Bodies";
import { CameraRig } from "./CameraRig";
import { Interaction } from "./Interaction";
import { Space } from "./space/Space";
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

  useEffect(() => {
    let dead = false;
    whenCoreReady().catch(() => {
      if (!dead) fallbackToList();
    });
    const onVis = () => setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      dead = true;
      document.removeEventListener("visibilitychange", onVis);
      void disposeCore();
    };
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 40, 220], fov: 55, near: 0.1, far: 12000 }}
      dpr={[1, 2]}
      frameloop={frameloop}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          fallbackToList();
        });
      }}
    >
      <color attach="background" args={["#05060F"]} />
      <Space />
      <Sun />
      <Bodies />
      <CameraRig />
      <Interaction />
      <Warp />
      <FpsProbe />
    </Canvas>
  );
}
