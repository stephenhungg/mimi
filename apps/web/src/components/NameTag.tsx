import { Html } from "@react-three/drei";
import type { Species } from "@mimi/types";
import { BRAND } from "@mimi/types";

interface NameTagProps {
  name: string;
  species: Species;
  yOffset?: number;
}

const SPECIES_EMOJI: Record<Species, string> = {
  tiger: "🐯",
  otter: "🦦",
  bunny: "🐰",
  dog: "🐕",
  giraffe: "🦒",
};

// small pixel-font pill floating above a billboard. occludes behind walls.
export function NameTag({ name, species, yOffset = 1.05 }: NameTagProps) {
  return (
    <Html
      center
      occlude
      distanceFactor={8}
      position={[0, yOffset, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          background: BRAND.asphalt,
          color: BRAND.paper,
          fontFamily: BRAND.pixelFont,
          fontSize: "8px",
          letterSpacing: "0.04em",
          padding: "4px 8px",
          borderRadius: "999px",
          border: `1px solid ${BRAND.paper}`,
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        <span style={{ marginRight: 4 }}>{SPECIES_EMOJI[species]}</span>
        {name}
      </div>
    </Html>
  );
}
