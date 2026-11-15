"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, Mesh, RingGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import repos from "../data/repos.json";
import { ROLES, roleMask } from "../data/roles";
import type { Repo, Role } from "../data/types";
import { NOISE_GLSL } from "./glsl";
import { clampDt } from "./pathPlayer";
import { hasRing, planetKind, planetSeed } from "./planets";
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

const KINDS = ["rocky", "ocean", "gas", "storm"] as const;

const vert = /* glsl */ `
varying vec3 vObj; varying vec3 vWN; varying vec3 vWPos;
void main(){
  vObj = normal;
  vWN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWPos = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const frag = /* glsl */ `
uniform float uKind, uSeed, uTime, uSpin, uMix, uHover; uniform vec3 uTint;
varying vec3 vObj; varying vec3 vWN; varying vec3 vWPos;
${NOISE_GLSL}
void main(){
  float cs = cos(uSpin), sn = sin(uSpin);
  vec3 p = vec3(cs*vObj.x + sn*vObj.z, vObj.y, -sn*vObj.x + cs*vObj.z); // the surface turns, the light does not
  vec3 N = normalize(vWN);
  vec3 L = normalize(-vWPos);                       // the sun sits at the origin
  vec3 V = normalize(cameraPosition - vWPos);
  float ndl = dot(N, L);
  float day = smoothstep(-0.12, 0.38, ndl);         // soft terminator
  vec3 q = p * 2.0 + uSeed;
  vec3 alb;
  float spec = 0.0;
  if (uKind < 0.5) {                                // rocky: grey-blue stone with craters
    float n = fbm(q * 1.4);
    alb = mix(vec3(.28,.31,.38), vec3(.64,.62,.60), n);
    alb *= 1.0 - 0.38 * smoothstep(.56, .72, fbm(q * 5.0));
    alb *= 0.85 + 0.3 * fbm(q * 14.0);
  } else if (uKind < 1.5) {                         // ocean: sea, land and drifting cloud
    float land = fbm(q * 1.2);
    alb = mix(vec3(.03,.20,.42), vec3(.08,.52,.60), fbm(q * 3.0));
    alb = mix(alb, mix(vec3(.50,.44,.28), vec3(.24,.42,.20), fbm(q * 4.0)), smoothstep(.54, .6, land));
    float cloud = fbm(vec3(q.x * 2.2 + uSpin * 0.6, q.y * 4.5, q.z * 2.2));
    alb = mix(alb, vec3(.96), smoothstep(.56, .82, cloud) * .85);
    spec = (1.0 - smoothstep(.54, .6, land)) * pow(max(dot(reflect(-L, N), V), 0.0), 40.0) * .6;
  } else if (uKind < 2.5) {                         // gas giant: warm bands with turbulence
    float turb = fbm(vec3(p.x * 3.0 + uSpin, p.y * 9.0, p.z * 3.0) + uSeed);
    float band = sin(p.y * 15.0 + turb * 3.2 + uSeed);
    alb = mix(vec3(.78,.52,.26), vec3(.96,.84,.60), band * .5 + .5);
    alb = mix(alb, vec3(.50,.27,.14), smoothstep(.42, .9, turb) * .4);
  } else {                                          // storm giant: violet bands and one bright oval
    float turb = fbm(vec3(p.x * 2.5 + uSpin, p.y * 7.0, p.z * 2.5) + uSeed);
    float band = sin(p.y * 11.0 + turb * 4.0 + uSeed);
    alb = mix(vec3(.26,.14,.52), vec3(.64,.46,.92), band * .5 + .5);
    float oval = smoothstep(.24, .0, length(vec2(p.x - .35, (p.y + .22) * 2.4))) * step(0.0, p.z);
    alb = mix(alb, vec3(1.0,.88,1.0), oval * .8);
  }
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 col = alb * (0.05 + 1.1 * day) + vec3(1.0,.95,.85) * spec * day;
  col += uTint * rim * (0.25 + 0.9 * smoothstep(-0.3, 0.5, ndl)) * 1.1;  // thin atmosphere
  float pulse = uHover * (0.5 + 0.5 * sin(uTime * 3.0));
  col += uTint * rim * (uHover * 0.9 + pulse * 0.6);                      // hover: brighter rim, slow pulse
  float lum = 0.2 + 0.8 * uMix;
  gl_FragColor = vec4(col * lum, 0.3 + 0.7 * uMix);
}`;

const ringVert = /* glsl */ `
varying vec2 vXY; varying vec3 vWN;
void main(){
  vXY = position.xy;
  vWN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}`;
const ringFrag = /* glsl */ `
uniform float uSeed, uMix, uSunX, uSunY, uSunZ;
varying vec2 vXY; varying vec3 vWN;
void main(){
  float r = (length(vXY) - 1.4) / 0.8;
  float a = smoothstep(0.0, .08, r) * smoothstep(1.0, .86, r) * (0.55 + 0.45 * sin(r * 46.0 + uSeed));
  vec3 L = normalize(vec3(uSunX, uSunY, uSunZ));
  float lit = 0.35 + 0.65 * abs(dot(normalize(vWN), L));
  gl_FragColor = vec4(vec3(.86,.74,.52) * lit * (0.2 + 0.8 * uMix), a * 0.85 * (0.3 + 0.7 * uMix));
}`;

export const PLANET_SEGMENTS = { width: 64, height: 48 } as const;

function makeMaterial(repo: Repo): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: true,
    uniforms: {
      uKind: { value: KINDS.indexOf(planetKind(repo.roles)) }, uSeed: { value: planetSeed(repo.id) },
      uTime: { value: 0 }, uSpin: { value: 0 }, uMix: { value: 1 }, uHover: { value: 0 },
      uTint: { value: new Color(ROLES[repo.roles[0]].color) },
    },
  });
}

function makeRingMaterial(repo: Repo): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: ringVert, fragmentShader: ringFrag, transparent: true, depthWrite: false, side: DoubleSide,
    uniforms: { uSeed: { value: planetSeed(repo.id) }, uMix: { value: 1 }, uSunX: { value: 0 }, uSunY: { value: 0 }, uSunZ: { value: 1 } },
  });
}

/** Everything the planets need on the GPU, made once and disposed together. */
export function createPlanetAssets(rs: Repo[]) {
  const geo = new SphereGeometry(1, PLANET_SEGMENTS.width, PLANET_SEGMENTS.height);
  const ringGeo = new RingGeometry(1.4, 2.2, 96);
  const mats = rs.map(makeMaterial);
  const rings = rs
    .map((r, index) => ({ index, repo: r }))
    .filter(({ repo }) => hasRing(planetKind(repo.roles)))
    .map(({ index, repo }) => ({ index, mat: makeRingMaterial(repo) }));
  return {
    geo, ringGeo, mats, rings,
    dispose() {
      geo.dispose(); ringGeo.dispose();
      mats.forEach((m) => m.dispose());
      rings.forEach((r) => r.mat.dispose());
    },
  };
}

/** One sphere per repo. Positions come from the Rust layout (worker); role filter brightness is eased every frame. */
export function Bodies() {
  const meshes = useRef<(Mesh | null)[]>([]);
  const ringMeshes = useRef<(Mesh | null)[]>([]);
  const assets = useMemo(() => createPlanetAssets(list), []);
  const { geo, ringGeo, mats, rings } = assets;
  useEffect(() => () => assets.dispose(), [assets]);

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
      time: 0, // seconds, built from clamped steps so a hidden tab never makes the planets jump
      reduced: typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
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
    const dtMs = clampDt(dt * 1000);
    if (!st.reduced) st.time += dtMs / 1000;
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
      mats[i].uniforms.uTime.value = st.time;
      mats[i].uniforms.uSpin.value = st.time * (0.12 + (i % 5) * 0.03);
    }
    for (let k = 0; k < rings.length; k++) {
      const { index, mat } = rings[k];
      const pm = meshes.current[index];
      const rm = ringMeshes.current[k];
      if (!pm || !rm) continue;
      rm.position.copy(pm.position);
      rm.scale.copy(pm.scale);
      mat.uniforms.uMix.value = st.mix[index];
      mat.uniforms.uSunX.value = -pm.position.x; // light comes from the origin
      mat.uniforms.uSunY.value = -pm.position.y;
      mat.uniforms.uSunZ.value = -pm.position.z;
    }
  });

  return (
    <group>
      {list.map((r, i) => (
        <mesh key={r.id} ref={(m) => { meshes.current[i] = m; }} geometry={geo} material={mats[i]} dispose={null} />
      ))}
      {rings.map((r, k) => (
        <mesh key={`ring-${list[r.index].id}`} ref={(m) => { ringMeshes.current[k] = m; }} geometry={ringGeo} material={r.mat} rotation={[Math.PI / 2 - 1.0, 0, 0.25]} dispose={null} />
      ))}
    </group>
  );
}
