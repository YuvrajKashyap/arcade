"use client";

import { useState } from "react";
import { TerminalBoot } from "@/components/designs/terminal-boot";

type BootedDesignScreenProps = {
  children: React.ReactNode;
  gameTitles: string[];
};

export function BootedDesignScreen({
  children,
  gameTitles,
}: BootedDesignScreenProps) {
  const [bootComplete, setBootComplete] = useState(false);

  return (
    <>
      {!bootComplete ? (
        <TerminalBoot
          gameTitles={gameTitles}
          onComplete={() => setBootComplete(true)}
        />
      ) : null}
      <div
        className={bootComplete ? "opacity-100" : "pointer-events-none opacity-0"}
        aria-hidden={!bootComplete}
      >
        {children}
      </div>
    </>
  );
}
