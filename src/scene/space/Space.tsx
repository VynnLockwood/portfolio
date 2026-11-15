import { useEffect, useState } from "react";
import { useUniverse } from "../../store/useUniverse";
import { E2E, E2E_TIER, perf } from "../e2e";
import { Dust } from "./Dust";
import { Effects } from "./Effects";
import { Nebula } from "./Nebula";
import { pickTier, TIERS, type Tier } from "../quality";
import { Stars } from "./Stars";

/** Active quality tier: user override, else measured fps over the first 3 s. `?e2e=1` fixes it to `low`. */
export function useTier(): Tier {
  const setting = useUniverse((s) => s.tier);
  const [auto, setAuto] = useState<Tier>(E2E ? (E2E_TIER ?? "low") : "high");
  useEffect(() => {
    if (E2E) return;
    const h = setTimeout(() => setAuto(pickTier(perf.fps)), 3000);
    return () => clearTimeout(h);
  }, []);
  return setting === "auto" ? auto : setting;
}

export function Space({ tier }: { tier: Tier }) {
  const flying = useUniverse((s) => s.flying);
  return (
    <>
      <Nebula octaves={TIERS[tier].nebulaOctaves} />
      <Stars tier={tier} />
      <Dust count={TIERS[tier].dust} />
      <Effects tier={tier} flying={flying} />
    </>
  );
}
