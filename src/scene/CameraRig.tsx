"use client";
import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { PerspectiveCamera } from "three";
import { Vector3 } from "three";
import { getCore } from "../engine/coreClient";
import { fallbackToList, useUniverse } from "../store/useUniverse";
import { useReducedMotion } from "../ui/view";
import { bodyBuffers, bodyRadius } from "./Bodies";
import repos from "../data/repos.json";
import type { Repo } from "../data/types";
import { E2E } from "./e2e";
import { motion } from "./motion";
import { PathPlayer } from "./pathPlayer";
import { rig } from "./rigRef";

const list = repos as Repo[];
const SAMPLES = 120;
const INTRO_MS = 2200, FLY_MS = 1100, BACK_MS = 900, REDUCED_MS = 300;
const IDLE_AFTER_MS = 20000, IDLE_DEG_PER_S = 0.6;
/** Layout orbits stay within ORBIT_MIN + ORBIT_SPAN = 115 units of the sun, so framing uses that fixed extent. */
const FRAME_POINTS = new Float32Array([-115, 0, 0, 115, 0, 0, 0, 60, 0]);
const INTRO_FROM = new Float32Array([0, 200, 1400, 0, 0, 0]);

/** Camera moves: Rust samples each path once (worker), this plays it back with an array read per frame. */
export function CameraRig() {
  const controls = useRef<React.ComponentRef<typeof CameraControls>>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const reducedRef = useRef(false);
  reducedRef.current = useReducedMotion();
  const player = useMemo(() => new PathPlayer(), []);
  const st = useMemo(
    () => ({ token: 0, lastInput: performance.now(), warp: false, buf: new Float32Array(6), a: new Vector3(), b: new Vector3() }),
    [],
  );

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const core = getCore();
    const finish = () => {
      st.warp = false;
      motion.warp = 0;
      useUniverse.getState().setFlying(false);
    };
    const nowPose = (): Float32Array => {
      c.getPosition(st.a);
      c.getTarget(st.b);
      return new Float32Array([st.a.x, st.a.y, st.a.z, st.b.x, st.b.y, st.b.z]);
    };
    const play = async (to: Float32Array, ms: number, warp: boolean, from?: Float32Array) => {
      const my = ++st.token;
      const reduced = reducedRef.current;
      const path = await core.cameraPath(from ?? nowPose(), to, SAMPLES, !reduced);
      if (my !== st.token) return; // a newer move (or unmount) took over while Rust was working
      player.start(path, reduced ? REDUCED_MS : ms, performance.now());
      st.warp = warp && !reduced;
      useUniverse.getState().setFlying(true);
    };
    const onInput = () => {
      st.lastInput = performance.now();
      if (player.active) {
        player.cancel();
        st.token++;
        finish();
      }
    };
    c.addEventListener("controlstart", onInput);

    rig.back = () => {
      core.framePose(FRAME_POINTS, camera.fov).then((to) => play(to, BACK_MS, false)).catch(() => fallbackToList());
    };
    rig.flyToward = (i) => {
      const body = bodyBuffers.positions.slice(i * 3, i * 3 + 3);
      const r = bodyRadius(list[i].rank);
      core
        .flyTowardPose(body, r, new Float32Array([camera.position.x, camera.position.y, camera.position.z]))
        .then((to) => play(to, FLY_MS, true))
        .catch(() => fallbackToList());
    };

    // intro: out of the dark, into the framed cosmos
    core.framePose(FRAME_POINTS, camera.fov).then((to) => play(to, INTRO_MS, true, INTRO_FROM)).catch(() => fallbackToList());

    return () => {
      st.token++;
      player.cancel();
      c.removeEventListener("controlstart", onInput);
      rig.back = undefined;
      rig.flyToward = undefined;
      finish();
    };
  }, [camera, player, st]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const now = performance.now();
    if (player.active) {
      const playing = player.sample(now, st.buf);
      c.setLookAt(st.buf[0], st.buf[1], st.buf[2], st.buf[3], st.buf[4], st.buf[5], false);
      motion.warp = st.warp ? 1 - player.progress : 0;
      if (!playing) {
        st.warp = false;
        motion.warp = 0;
        useUniverse.getState().setFlying(false);
        st.lastInput = now;
      }
    } else if (!E2E && !reducedRef.current && now - st.lastInput >= IDLE_AFTER_MS) {
      c.rotate(((Math.min(dt, 0.05) * IDLE_DEG_PER_S) * Math.PI) / 180, 0, false);
    }
  });

  return <CameraControls ref={controls} makeDefault dampingFactor={0.08} minDistance={8} maxDistance={900} />;
}
