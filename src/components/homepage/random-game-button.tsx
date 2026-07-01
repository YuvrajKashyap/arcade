"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type RandomGameButtonProps = {
  gameSlugs: readonly string[];
  className?: string;
};

export function RandomGameButton({ gameSlugs, className }: RandomGameButtonProps) {
  const router = useRouter();
  const disabled = gameSlugs.length === 0;

  function playRandomGame() {
    if (disabled) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * gameSlugs.length);
    const slug = gameSlugs[randomIndex];
    if (slug) {
      router.push(`/games/${slug}` as Route);
    }
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold text-foreground hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-strong disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
      disabled={disabled}
      onClick={playRandomGame}
    >
      Surprise me
    </button>
  );
}
