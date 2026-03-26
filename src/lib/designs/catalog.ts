export type DesignCatalogEntry = {
  id: string;
  name: string;
  tone: string;
  description: string;
};

export const designCatalog: readonly DesignCatalogEntry[] = [
  {
    id: "1",
    name: "Obsidian",
    tone: "Ultra-minimal monochrome",
    description: "Thin wide-tracked type, borderless cards, expanding underline search. The restraint is the design.",
  },
  {
    id: "2",
    name: "Prism",
    tone: "Glassmorphism with depth",
    description: "Frosted glass surfaces, blurred color orbs, prismatic gradient title. Layered and atmospheric.",
  },
  {
    id: "3",
    name: "Signal",
    tone: "Technical precision",
    description: "Monospace stencil type, corner brackets, data readouts, scan-line hover. Elevated terminal energy.",
  },
  {
    id: "4",
    name: "Vapor",
    tone: "Atmospheric breathing",
    description: "Slow gradient animation, bloom text-shadow, pulsing search, warm inner glow. Everything breathes.",
  },
  {
    id: "5",
    name: "Carbon",
    tone: "Industrial premium",
    description: "Heavy bold type, sharp notch-cut corners, micro-texture, precise border reveals. Engineered confidence.",
  },
] as const;

export function getDesignById(id: string) {
  return designCatalog.find((design) => design.id === id);
}
