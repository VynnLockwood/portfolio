"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { disposeCore, whenCoreReady } from "../engine/coreClient";
import { fallbackToList } from "../store/useUniverse";
import { perf } from "./e2e";
import { Bodies } from "./Bodies";
import { CameraRig } from "./CameraRig";
import { Space } from "./space/Space";
import { Sun } from "./Sun";
import { Warp } from "./Warp";

function FpsProbe() {
  useFrame((_, dt) => {
    perf.fps = perf.fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05;
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
      <Warp />
      <FpsProbe />
    </Canvas>
  );
}
