"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Vector3, type PerspectiveCamera } from "three";
import repos from "../data/repos.json";
import { ROLES } from "../data/roles";
import type { Repo } from "../data/types";
import { useUniverse } from "../store/useUniverse";
import { bodyBuffers } from "./Bodies";
import { declutter, labelRegistry, projectLabel, type LabelSpot } from "./labels";

const list = repos as Repo[];

/** One small name tag per repo. Plain DOM (crisp text); `LabelDriver` moves them. Hidden from screen readers: the list already has every name. */
export function BodyLabels() {
  useEffect(() => () => labelRegistry.clear(), []);
  return (
    <div className="body-labels" aria-hidden="true">
      {list.map((r) => (
        <span
          key={r.id}
          className="body-label"
          data-hidden="true"
          ref={(el) => { if (el) labelRegistry.set(r.id, el); else labelRegistry.delete(r.id); }}
        >
          <i style={{ background: ROLES[r.roles[0]].color }} />
          {r.name}
        </span>
      ))}
    </div>
  );
}

/** Inside the Canvas: projects each body to the screen every frame and moves its label. Writes the DOM only when something changed. */
export function LabelDriver() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const n = list.length;
  const st = useMemo(
    () => ({
      spot: { x: 0, y: 0, visible: false } as LabelSpot,
      world: new Vector3(),
      xs: new Float32Array(n), ys: new Float32Array(n), widths: new Float32Array(n).fill(90),
      vis: new Array<boolean>(n).fill(false),
      lastX: new Array<number>(n).fill(-1e9), lastY: new Array<number>(n).fill(-1e9), lastVisible: new Array<boolean>(n).fill(false),
      lastRole: undefined as unknown,
    }),
    [n],
  );
  useFrame(({ size }) => {
    const { role, flying } = useUniverse.getState();
    const roleChanged = role !== st.lastRole;
    st.lastRole = role;
    for (let i = 0; i < n; i++) {
      const el = labelRegistry.get(list[i].id);
      if (!el) { st.vis[i] = false; continue; }
      if (roleChanged) el.dataset.dim = role && !list[i].roles.includes(role) ? "true" : "false";
      if (st.widths[i] === 90 && el.offsetWidth > 0) st.widths[i] = el.offsetWidth; // names never change: measure once
      st.world.set(bodyBuffers.positions[i * 3], bodyBuffers.positions[i * 3 + 1], bodyBuffers.positions[i * 3 + 2]);
      projectLabel(st.spot, st.world, camera, size.width, size.height, bodyBuffers.radii[i] * 1.15);
      st.xs[i] = st.spot.x; st.ys[i] = st.spot.y;
      st.vis[i] = st.spot.visible && !flying; // labels would pile up in the middle during a flight
    }
    declutter(st.xs, st.ys, st.widths, 24, st.vis);
    for (let i = 0; i < n; i++) {
      const el = labelRegistry.get(list[i].id);
      if (!el) continue;
      if (st.vis[i] !== st.lastVisible[i]) {
        st.lastVisible[i] = st.vis[i];
        el.dataset.hidden = st.vis[i] ? "false" : "true";
      }
      if (st.vis[i] && (Math.abs(st.xs[i] - st.lastX[i]) > 0.4 || Math.abs(st.ys[i] - st.lastY[i]) > 0.4)) {
        st.lastX[i] = st.xs[i]; st.lastY[i] = st.ys[i];
        el.style.transform = `translate3d(${st.xs[i].toFixed(1)}px, ${st.ys[i].toFixed(1)}px, 0) translate(-50%, 0)`;
      }
    }
  });
  return null;
}
