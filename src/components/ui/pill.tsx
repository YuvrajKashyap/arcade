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
        tone === "neutral" && "border border-line bg-surface text-foreground-soft",
        tone === "accent" && "border border-line-strong bg-accent-soft text-accent-strong",
        tone === "signal" && "border border-line-strong bg-surface text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
