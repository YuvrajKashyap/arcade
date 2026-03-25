import { cn } from "@/lib/utils/cn";

type PillProps = {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "signal";
  className?: string;
};

export function Pill({ children, tone = "neutral", className }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]",
        tone === "neutral" && "border border-line bg-white/70 text-foreground-soft",
        tone === "accent" && "bg-accent text-white",
        tone === "signal" && "bg-signal text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}
