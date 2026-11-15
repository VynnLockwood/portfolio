import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { E2E } from "../e2e";
import { TIERS, type Tier } from "../quality";

/** Bloom (glow), vignette, film grain; depth of field only while flying in. */
export function Effects({ tier, flying }: { tier: Tier; flying: boolean }) {
  const spec = TIERS[tier];
  const effects = [
    spec.bloom !== "off" && <Bloom key="b" mipmapBlur luminanceThreshold={0.6} intensity={1.2} resolutionScale={spec.bloom === "half" ? 0.5 : 1} />,
    <Vignette key="v" darkness={0.5} offset={0.3} />,
    spec.grain && !E2E && <Noise key="n" opacity={0.03} />,
    spec.dof && flying && <DepthOfField key="d" focusDistance={0.02} focalLength={0.05} bokehScale={2} />,
  ].filter(Boolean) as React.ReactElement[];
  return <EffectComposer multisampling={0}>{effects}</EffectComposer>;
}
