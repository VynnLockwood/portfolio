import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, ShaderMaterial } from "three";
import { getCore } from "../../engine/coreClient";
import type { StarLayerData } from "../../engine/coreApi";
import { fallbackToList } from "../../store/useUniverse";
import { E2E } from "../e2e";
import type { Tier } from "../quality";
import { starCounts } from "../quality";

const vert = /* glsl */ `
attribute float aSize; attribute float aPhase; attribute float aFreq; attribute float aMag; attribute vec3 aColor;
uniform float uTime, uPx, uTwinkle; varying float vA; varying vec3 vC;
void main(){
  vA = aMag * (1.0 - 0.25 * uTwinkle * (0.5 + 0.5*sin(uTime*aFreq*6.2831853 + aPhase)));
  vC = aColor;
  gl_PointSize = aSize * uPx;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`;
const frag = /* glsl */ `
uniform float uFlare; varying float vA; varying vec3 vC;
void main(){
  vec2 p = gl_PointCoord - .5; float r = length(p);
  float a = smoothstep(.5, .0, r); a *= a;
  if (uFlare > .5) a = max(a, max(smoothstep(.03,.0,abs(p.x))*smoothstep(.5,.0,abs(p.y)), smoothstep(.03,.0,abs(p.y))*smoothstep(.5,.0,abs(p.x)))*.7);
  gl_FragColor = vec4(vC, a*vA);
}`;

function geometry(d: StarLayerData): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(d.positions, 3));
  g.setAttribute("aSize", new BufferAttribute(d.sizes, 1));
  g.setAttribute("aPhase", new BufferAttribute(d.phases, 1));
  g.setAttribute("aFreq", new BufferAttribute(d.freqs, 1));
  g.setAttribute("aMag", new BufferAttribute(d.mags, 1));
  g.setAttribute("aColor", new BufferAttribute(d.colors, 3));
  return g;
}

function material(flare: boolean, px: number) {
  return new ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: px }, uTwinkle: { value: E2E ? 0 : 1 }, uFlare: { value: flare ? 1 : 0 } },
  });
}

interface Layer { g: BufferGeometry; m: ShaderMaterial; follow: boolean }

/** Far and bright stars are fixed to the sky (follow the camera); mid stars have real positions for parallax.
 *  Positions, sizes, colours and phases come from the Rust core; geometries and materials are disposed on change/unmount. */
export function Stars({ tier }: { tier: Tier }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const camera = useThree((s) => s.camera);
  const sky = useRef<Group>(null!);
  const [layers, setLayers] = useState<Layer[]>([]);

  useEffect(() => {
    let dead = false;
    const made: Layer[] = [];
    const c = starCounts(tier);
    const core = getCore();
    Promise.all([core.starLayer(0, c.far, 1), core.starLayer(1, c.bright, 2), core.starLayer(2, c.mid, 3)])
      .then(([far, bright, mid]) => {
        if (dead) return;
        made.push(
          { g: geometry(far), m: material(false, dpr), follow: true },
          { g: geometry(bright), m: material(true, dpr), follow: true },
          { g: geometry(mid), m: material(false, dpr), follow: false },
        );
        setLayers(made);
      })
      .catch(() => {
        if (!dead) fallbackToList();
      });
    return () => {
      dead = true;
      for (const l of made) { l.g.dispose(); l.m.dispose(); }
      setLayers([]);
    };
  }, [tier, dpr]);

  useFrame(({ clock }) => {
    sky.current.position.copy(camera.position);
    for (const l of layers) l.m.uniforms.uTime.value = E2E ? 0 : clock.elapsedTime;
  });

  return (
    <>
      <group ref={sky}>{layers.filter((l) => l.follow).map((l, i) => <points key={i} geometry={l.g} material={l.m} frustumCulled={false} />)}</group>
      {layers.filter((l) => !l.follow).map((l, i) => <points key={i} geometry={l.g} material={l.m} frustumCulled={false} />)}
    </>
  );
}
