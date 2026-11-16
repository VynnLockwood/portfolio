"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry } from "three";
import { NOISE_GLSL } from "./glsl";
import { clampDt } from "./pathPlayer";

export const SUN_RADIUS = 6;
const CORONA_SIZE = 44; // plane edge; the sun disc is SUN_RADIUS / (CORONA_SIZE / 2) of the half-width

const sunVert = /* glsl */ `
varying vec3 vObj; varying vec3 vWN; varying vec3 vWPos;
void main(){
  vObj = normal; vWN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0); vWPos = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const sunFrag = /* glsl */ `
uniform float uTime;
varying vec3 vObj; varying vec3 vWN; varying vec3 vWPos;
${NOISE_GLSL}
void main(){
  vec3 p = vObj * 3.0;
  float big = fbm(p + vec3(0.0, uTime * 0.05, 0.0));                    // slow convection cells
  float fine = fbm(p * 3.0 - vec3(uTime * 0.12, 0.0, uTime * 0.07));    // boiling grain
  float heat = clamp(big * 0.75 + fine * 0.5, 0.0, 1.0);
  vec3 deep = vec3(1.0, .28, .04), mid = vec3(1.0, .62, .14), hot = vec3(1.0, .96, .72);
  vec3 col = mix(deep, mid, smoothstep(.25, .6, heat));
  col = mix(col, hot, smoothstep(.55, .9, heat));
  col *= 1.0 - 0.45 * smoothstep(.34, .22, fbm(p * 0.7 + 11.0));        // a few darker sunspots
  float ndv = max(dot(normalize(vWN), normalize(cameraPosition - vWPos)), 0.0);
  col *= 0.5 + 0.5 * pow(ndv, 0.45);                                    // limb darkening
  col += vec3(1.0, .45, .12) * pow(1.0 - ndv, 3.0) * 0.6;               // bright edge
  gl_FragColor = vec4(col * 1.7, 1.0);                                   // above 1: the glow pass picks it up
}`;
const coronaVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const coronaFrag = /* glsl */ `
uniform float uTime; uniform float uDisc;
varying vec2 vUv;
${NOISE_GLSL}
void main(){
  vec2 c = vUv - 0.5;
  float d = length(c) * 2.0;                       // 0 centre, 1 edge of the plane
  if (d < uDisc * 0.96) discard;                    // the sphere draws the disc itself
  float a = atan(c.y, c.x);
  float rays = noise(vec3(cos(a) * 3.0, sin(a) * 3.0, uTime * 0.08)) * 0.7 + noise(vec3(cos(a) * 9.0, sin(a) * 9.0, 4.0 - uTime * 0.05)) * 0.3;
  float fall = exp(-(d - uDisc) * 5.5);
  float glow = fall * (0.55 + 0.9 * rays) * smoothstep(1.0, 0.7, d);
  vec3 col = mix(vec3(1.0, .38, .08), vec3(1.0, .82, .45), exp(-(d - uDisc) * 9.0));
  gl_FragColor = vec4(col * glow, glow);
}`;

/** Everything the sun needs on the GPU, made once and disposed together. No textures. */
export function createSunAssets() {
  const sphereGeo = new SphereGeometry(SUN_RADIUS, 64, 48);
  const coronaGeo = new PlaneGeometry(CORONA_SIZE, CORONA_SIZE);
  const sphereMat = new ShaderMaterial({ vertexShader: sunVert, fragmentShader: sunFrag, uniforms: { uTime: { value: 0 } } });
  const coronaMat = new ShaderMaterial({
    vertexShader: coronaVert, fragmentShader: coronaFrag, transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uDisc: { value: SUN_RADIUS / (CORONA_SIZE / 2) } },
  });
  return {
    sphereGeo, coronaGeo, sphereMat, coronaMat,
    dispose() { sphereGeo.dispose(); coronaGeo.dispose(); sphereMat.dispose(); coronaMat.dispose(); },
  };
}

/** The owner: a boiling star at the origin with a soft corona. Not clickable. */
export function Sun() {
  const assets = useMemo(() => createSunAssets(), []);
  useEffect(() => () => assets.dispose(), [assets]);
  const corona = useRef<Mesh>(null);
  const st = useMemo(
    () => ({ time: 0, reduced: typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true }),
    [],
  );
  useFrame(({ camera }, dt) => {
    if (!st.reduced) st.time += clampDt(dt * 1000) / 1000; // clamped, so a hidden tab never makes the sun jump
    assets.sphereMat.uniforms.uTime.value = st.time;
    assets.coronaMat.uniforms.uTime.value = st.time;
    corona.current?.quaternion.copy(camera.quaternion); // always faces the camera, no allocation
  });
  return (
    <group>
      <mesh geometry={assets.sphereGeo} material={assets.sphereMat} dispose={null} />
      <mesh ref={corona} geometry={assets.coronaGeo} material={assets.coronaMat} renderOrder={1} dispose={null} />
    </group>
  );
}
