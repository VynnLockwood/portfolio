"use client";
import { useEffect, useMemo, useState } from "react";
import { Texture, TextureLoader } from "three";

/** The owner: a warm glowing sphere at the origin with the logo as a billboard. Not clickable. */
export function Sun() {
  const [tex, setTex] = useState<Texture | null>(null);
  useEffect(() => {
    let dead = false;
    let loaded: Texture | null = null;
    new TextureLoader().load("/vynn-logo.png", (t) => {
      if (dead) return t.dispose();
      loaded = t;
      setTex(t);
    });
    return () => { dead = true; loaded?.dispose(); };
  }, []);
  const color = useMemo(() => "#ffd9a0", []);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[6, 32, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {tex && (
        <sprite scale={[16, 16, 1]} position={[0, 0, 0]}>
          <spriteMaterial map={tex} transparent depthWrite={false} />
        </sprite>
      )}
    </group>
  );
}
