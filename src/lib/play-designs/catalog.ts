export type PlayDesignCatalogEntry = {
  id: string;
  name: string;
  tone: string;
  description: string;
};

export const playDesignCatalog: readonly PlayDesignCatalogEntry[] = [
  {
    id: "1",
    name: "Void",
    tone: "Total immersion",
    description:
      "Game floats in absolute darkness with a breathing radial glow. Nothing exists except the game.",
  },
  {
    id: "2",
    name: "Neon Frame",
    tone: "Electric precision",
    description:
      "Animated neon border traces the game container. Particle field background, sharp geometric energy.",
  },
  {
    id: "3",
    name: "Nebula",
    tone: "Atmospheric depth",
    description:
      "Slow-moving color clouds drift behind a frosted glass game frame. Ambient and otherworldly.",
  },
  {
    id: "4",
    name: "Monolith",
    tone: "Architectural minimalism",
    description:
      "Centered monolith container on a faint dot grid. Sharp, precise, and structurally confident.",
  },
  {
    id: "5",
    name: "Ember",
    tone: "Warm kinetic glow",
    description:
      "Floating ember particles with a warm-shifting container border. Alive, breathing, magnetic.",
  },
  {
    id: "6",
    name: "Theater",
    tone: "Cinematic immersion",
    description:
      "Cinema metaphor. No frame — just the game on black. Vignette focus, auto-hiding bottom bar, cursor disappears.",
  },
  {
    id: "7",
    name: "Split",
    tone: "Editorial asymmetry",
    description:
      "Asymmetric layout. Narrow left panel with vertical title, game offset right. Divider line draws on entry.",
  },
  {
    id: "8",
    name: "Zen",
    tone: "Pure emptiness",
    description:
      "Nothing exists that doesn't need to. No borders, no buttons. Keyboard-only. The restraint is the design.",
  },
] as const;

export function getPlayDesignById(id: string) {
  return playDesignCatalog.find((d) => d.id === id);
}
