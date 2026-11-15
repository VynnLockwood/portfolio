"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Raycaster, Vector2 } from "three";
import repos from "../data/repos.json";
import type { Repo } from "../data/types";
import { getCore } from "../engine/coreClient";
import { useUniverse } from "../store/useUniverse";
import { bodyBuffers } from "./Bodies";
import { activateRepo, Picker } from "./interaction";
import { rig } from "./rigRef";

const list = repos as Repo[];
const CLICK_SLOP_PX = 5;

/** Hover and click on the bodies. Pointer moves are turned into rays, at most one per frame, and picked in Rust. */
export function Interaction() {
  const { gl, camera } = useThree();
  const st = useMemo(
    () => ({ x: 0, y: 0, dirty: false, down: null as null | { x: number; y: number }, hit: -1, ray: new Raycaster(), ndc: new Vector2(), buf: new Float32Array(6), picker: null as Picker | null }),
    [],
  );

  useEffect(() => {
    const el = gl.domElement;
    const root = document.documentElement;
    const picker = new Picker(getCore, (i) => {
      st.hit = i;
      useUniverse.getState().setHovered(i >= 0 ? list[i].id : null);
      el.style.cursor = i >= 0 ? "pointer" : "";
    }, () => bodyBuffers);
    st.picker = picker;

    const onMove = (e: PointerEvent) => {
      st.x = e.clientX;
      st.y = e.clientY;
      st.dirty = true;
      root.style.setProperty("--px", `${e.clientX}px`);
      root.style.setProperty("--py", `${e.clientY}px`);
    };
    const onDown = (e: PointerEvent) => {
      st.down = { x: e.clientX, y: e.clientY };
      onMove(e); // touch has no hover: pick on press so the result is ready by the time the finger lifts
    };
    const onUp = (e: PointerEvent) => {
      const d = st.down;
      st.down = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > CLICK_SLOP_PX) return; // a drag is an orbit, not a click
      if (st.hit >= 0) activateRepo(st.hit, (i) => rig.flyToward?.(i));
    };
    const onLeave = () => {
      st.dirty = false;
      st.hit = -1;
      useUniverse.getState().setHovered(null);
      el.style.cursor = "";
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      picker.dispose();
      st.picker = null;
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.style.cursor = "";
      useUniverse.getState().setHovered(null);
    };
  }, [gl, st]);

  useFrame(() => {
    if (!st.dirty || !st.picker) return;
    st.dirty = false;
    const rect = gl.domElement.getBoundingClientRect();
    st.ndc.set(((st.x - rect.left) / rect.width) * 2 - 1, -((st.y - rect.top) / rect.height) * 2 + 1);
    st.ray.setFromCamera(st.ndc, camera);
    const { origin, direction } = st.ray.ray;
    st.buf.set([origin.x, origin.y, origin.z, direction.x, direction.y, direction.z]);
    st.picker.move(st.buf.slice());
  });

  return null;
}
