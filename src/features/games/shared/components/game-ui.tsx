"use client";

import type { ReactNode } from "react";

type GameHudProps = {
  items: Array<{
    label: string;
    value: ReactNode;
  }>;
  actions?: ReactNode;
};

type GameButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "touch";
  className?: string;
  type?: "button" | "submit" | "reset";
};

export function GamePanel({ children }: { children: ReactNode }) {
  return (
    <div className="arcade-game-panel mx-auto flex w-full max-w-5xl flex-col gap-5 text-foreground">
      {children}
    </div>
  );
}

export function GameHud({ items, actions }: GameHudProps) {
  return (
    <div className="arcade-game-hud rounded-[1.35rem] border border-line bg-surface px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-full border border-line bg-background-strong px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-foreground-muted"
            >
              {item.label}{" "}
              <span className="ml-1 normal-case tracking-normal text-foreground">
                {item.value}
              </span>
            </div>
          ))}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function GameButton({
  children,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  disabled,
  variant = "secondary",
  className = "",
  type = "button",
}: GameButtonProps) {
  const variantClass =
    variant === "primary"
      ? "bg-accent text-background hover:bg-accent-strong"
      : variant === "touch"
        ? "surface-subtle min-h-12 text-foreground hover:bg-surface"
        : "border border-line bg-transparent text-foreground hover:bg-surface";

  return (
    <button
      type={type}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

export function GamePlayfield({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`arcade-game-playfield overflow-hidden rounded-[1.4rem] border border-line bg-background-strong shadow-[0_28px_80px_rgba(0,0,0,0.3)] ${className}`}
    >
      {children}
    </div>
  );
}

export function GameStatus({ children }: { children: ReactNode }) {
  return (
    <p className="arcade-game-status text-center text-sm leading-7 text-foreground-soft">
      {children}
    </p>
  );
}

export function TouchControls({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`arcade-touch-controls mx-auto w-full md:hidden ${className}`}>
      {children}
    </div>
  );
}
