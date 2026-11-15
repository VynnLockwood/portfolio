"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import repos from "../data/repos.json";
import { ROLES, roleMask } from "../data/roles";
import type { Repo, Role } from "../data/types";
import { getCore } from "../engine/coreClient";
import { fallbackToList, useUniverse } from "../store/useUniverse";

const list = repos as Repo[];

/** Biggest body (rank 1) has radius 6.0 world units, smallest (rank 9) 2.25. */
export const bodyRadius = (rank: number): number => 6.0 - (rank - 1) * (3.75 / 8);

/** Same formula the Rust layout tests use; higher weight orbits closer to the sun. */
export const bodyWeight = (rank: number): number => 1 - 0.07 * (rank - 1);

const DIM = 0.15;

/** Per-repo target brightness: 1 when the role matches (or no role is chosen), else dimmed. */
export function targetMix(role: Role | null, rs: Repo[]): number[] {
  return rs.map((r) => (role === null || r.roles.includes(role) ? 1 : DIM));
}

/** Eases `current` toward `target` in place (time constant 150 ms, ~600 ms to settle) and returns it. */
export function stepMix(current: number[], target: number[], dtMs: number): number[] {
  const k = 1 - Math.exp(-dtMs / 150);
  for (let i = 0; i < current.length; i++) current[i] += (target[i] - current[i]) * k;
  return current;
}

/** Latest displayed positions and radii, shared with the picking code. Written every frame by `Bodies`. */
export const bodyBuffers = {
  positions: new Float32Array(list.length * 3),
  radii: Float32Array.from(list.map((r) => bodyRadius(r.rank))),
};

const vert = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main(){
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const frag = /* glsl */ `
uniform vec3 uC0, uC1, uC2; uniform float uN, uMix, uHover;
varying vec3 vN; varying vec3 vV;
void main(){
  float band = vN.y * 0.5 + 0.5;
  vec3 c = uC0;
  if (uN > 1.5) c = mix(c, uC1, smoothstep(0.4, 0.6, band));
  if (uN > 2.5) c = mix(c, uC2, smoothstep(0.7, 0.9, band));
  float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  float lum = (0.55 + 0.9 * rim) * (0.2 + 0.8 * uMix + 0.5 * uHover);
  gl_FragColor = vec4(c * lum, 0.3 + 0.7 * uMix);
}`;

function makeMaterial(roles: Role[]): ShaderMaterial {
  const cols = roles.map((r) => new Color(ROLES[r].color));
  while (cols.length < 3) cols.push(cols[cols.length - 1]);
  return new ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: true,
    uniforms: {
      uC0: { value: cols[0] }, uC1: { value: cols[1] }, uC2: { value: cols[2] },
      uN: { value: roles.length }, uMix: { value: 1 }, uHover: { value: 0 },
    },
  });
}

/** One sphere per repo. Positions come from the Rust layout (worker); role filter brightness is eased every frame. */
export function Bodies() {
  const meshes = useRef<(Mesh | null)[]>([]);
  const { geo, mats } = useMemo(
    () => ({ geo: new SphereGeometry(1, 32, 24), mats: list.map((r) => makeMaterial(r.roles)) }),
    [],
  );
  useEffect(() => () => { geo.dispose(); mats.forEach((m) => m.dispose()); }, [geo, mats]);

  const st = useMemo(
    () => ({
      layout: new Float32Array(list.length * 3),
      settled: false,
      inFlight: false,
      mix: list.map(() => 1),
      target: targetMix(null, list),
      lastRole: null as Role | null,
      hover: list.map(() => 0),
      tmp: new Vector3(),
    }),
    [],
  );

  useEffect(() => {
    let dead = false;
    st.settled = false;
    getCore()
      .layoutNew(list.map((r) => ({ weight: bodyWeight(r.rank), roles: roleMask(r.roles) })), 1)
      .catch(() => { if (!dead) fallbackToList(); });
    return () => { dead = true; st.settled = true; };
  }, [st]);

  useFrame(({ camera }, dt) => {
    const dtMs = Math.min(dt * 1000, 50);
    const { role, hovered } = useUniverse.getState();
    if (role !== st.lastRole) {
      st.lastRole = role;
      st.target = targetMix(role, list);
    }
    stepMix(st.mix, st.target, dtMs);

    // one layout request in flight at a time; stop asking once it has settled
    if (!st.settled && !st.inFlight) {
      st.inFlight = true;
      const core = getCore();
      core.layoutStep(3)
        .then((pos) => {
          if (pos.length === st.layout.length) st.layout.set(pos);
          return core.layoutSettled();
        })
        .then((s) => { st.settled = s; })
        .catch(() => fallbackToList())
        .finally(() => { st.inFlight = false; });
    }

    for (let i = 0; i < list.length; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      st.tmp.set(st.layout[i * 3], st.layout[i * 3 + 1], st.layout[i * 3 + 2]);
      // matching bodies lift slightly toward the camera
      const away = st.tmp.distanceTo(camera.position) || 1;
      st.tmp.lerp(camera.position, (4 * st.mix[i]) / away);
      m.position.copy(st.tmp);
      bodyBuffers.positions[i * 3] = st.tmp.x;
      bodyBuffers.positions[i * 3 + 1] = st.tmp.y;
      bodyBuffers.positions[i * 3 + 2] = st.tmp.z;
      const r = bodyRadius(list[i].rank) * (1 + 0.15 * st.mix[i]);
      m.scale.setScalar(r);
      st.hover[i] += ((hovered === list[i].id ? 1 : 0) - st.hover[i]) * (1 - Math.exp(-dtMs / 100));
      mats[i].uniforms.uMix.value = st.mix[i];
      mats[i].uniforms.uHover.value = st.hover[i];
    }
  });

  return (
    <group>
      {list.map((r, i) => (
        <mesh key={r.id} ref={(m) => { meshes.current[i] = m; }} geometry={geo} material={mats[i]} dispose={null} />
      ))}
    </group>
  );
}
