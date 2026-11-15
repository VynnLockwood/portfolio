import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { BackSide, Mesh, ShaderMaterial, SphereGeometry } from "three";

const vert = /* glsl */ `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const frag = /* glsl */ `
varying vec3 vDir;
uniform vec3 uSeed; uniform float uMaxLuma;
float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = .5, s = 0.; for(int i=0;i<FBM_OCT;i++){ s += a*noise(p); p = p*2.03 + vec3(7.1,3.7,1.3); a *= .5; } return s; }
float fbm3(vec3 p){ float a = .5, s = 0.; for(int i=0;i<3;i++){ s += a*noise(p); p = p*2.03 + vec3(7.1,3.7,1.3); a *= .5; } return s; }
// ridged, self-masking noise: thin bright filaments like a supernova remnant
float ridged(vec3 p){
  float a = .5, s = 0., w = 1.;
  for(int i=0;i<RIDGE_OCT;i++){ float n = 1.0 - abs(2.0*noise(p) - 1.0); n *= n; s += a*n*w; w = clamp(n*1.6, 0.0, 1.0); p = p*2.07 + vec3(3.1,1.7,5.3); a *= .5; }
  return s;
}
// One nebula object: a warped filament shell (red/orange/amber) around a soft cyan core, on black.
vec3 nebula(vec3 d, vec3 c, float radius, float seed){
  float cd = dot(d, c);
  if (cd < cos(1.8 * radius)) return vec3(0.0);                // cheap early-out: most pixels are far from every nebula
  float t = acos(clamp(cd, -1.0, 1.0)) / radius;
  vec3 s = vec3(seed, seed*1.7, seed*2.3);
  vec3 p = (d - c) / radius * 1.7;
  p += (vec3(fbm3(p*1.3+s), fbm3(p*1.3+s+7.1), fbm3(p*1.3+s+13.7)) - .5) * 1.4; // the warp is smooth, 3 octaves are plenty
  float fil = ridged(p*1.6 + s);
  float body = smoothstep(0.95, .12, t), halo = smoothstep(1.8, .6, t), core = smoothstep(.6, .0, t);
  vec3 red = vec3(.80,.14,.08), orange = vec3(1.0,.40,.10), amber = vec3(1.0,.62,.28), cyan = vec3(.20,.62,1.0);
  vec3 col = mix(red, orange, smoothstep(.2,.6,fil)) * fil*fil * body * 1.9;
  col += amber * pow(fil, 4.0) * body * 0.75;
  col += cyan * core*core * (.35 + .65*fbm(p*2.0+s)) * .7;
  col += red * halo * fil * .07;
  return col;
}
void main(){
  vec3 d = normalize(vDir);
  vec3 col = vec3(0.0012, 0.0016, 0.0035);                    // near-black sky
  float lum = dot(col, vec3(.2126,.7152,.0722));
  if (lum > uMaxLuma) col *= uMaxLuma / lum;
  col += nebula(d, normalize(vec3( .75,  .25, -.60)), .24, 3.7);
  col += nebula(d, normalize(vec3(-.80, -.30,  .50)), .30, 8.2);
  col += nebula(d, normalize(vec3( .10,  .80,  .55)), .20, 1.3);
  col += nebula(d, normalize(vec3(-.30,  .20, -.90)), .15, 5.5) * .8;
  col += (hash(d*937.1) - .5) * (1.0/255.0);                    // dither
  gl_FragColor = vec4(col, 1.0);
}`;

/** The sky dome and everything it needs on the GPU. The nebula is computed per pixel, so it is as sharp as the screen at any zoom. */
export function createNebulaAssets(octaves: number) {
  const geo = new SphereGeometry(10, 48, 24);
  const mat = new ShaderMaterial({
    side: BackSide, depthWrite: false, depthTest: false, vertexShader: vert, fragmentShader: frag,
    defines: { RIDGE_OCT: octaves, FBM_OCT: Math.max(3, octaves - 1) },
    uniforms: { uMaxLuma: { value: 0.03 }, uSeed: { value: [3.7, 1.9, 8.2] } },
  });
  const mesh = new Mesh(geo, mat);
  mesh.renderOrder = -1000;
  mesh.frustumCulled = false;
  return { geo, mat, mesh, dispose() { geo.dispose(); mat.dispose(); } };
}

/** Draws the sky first, behind everything. The dome follows the camera each frame, so it is infinitely far and orbiting reveals new sky. */
export function Nebula({ octaves }: { octaves: number }) {
  const scene = useThree((s) => s.scene);
  const assets = useMemo(() => createNebulaAssets(octaves), [octaves]);
  useEffect(() => {
    scene.add(assets.mesh);
    return () => { scene.remove(assets.mesh); assets.dispose(); };
  }, [scene, assets]);
  useFrame(({ camera }) => assets.mesh.position.copy(camera.position));
  return null;
}
