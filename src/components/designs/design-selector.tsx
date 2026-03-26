"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { DesignCatalogEntry } from "@/lib/designs/catalog";

type DesignSelectorProps = {
  designs: readonly DesignCatalogEntry[];
};

export function DesignSelector({ designs }: DesignSelectorProps) {
  return (
    <div className="min-h-screen bg-[#060410] text-[#e8e0f8]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.1),transparent_50%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
            ARCADE
          </h1>
          <p className="mt-4 text-sm text-white/30">
            5 design directions &mdash; pick one to preview
          </p>
        </motion.div>

        <div className="mt-14 grid gap-3">
          {designs.map((design, i) => (
            <motion.div
              key={design.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.4 }}
            >
              <Link
                href={`/design/${design.id}`}
                className="group flex items-center gap-5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-5 transition-all hover:border-[#7c3aed]/35 hover:bg-white/[0.04]"
              >
                <span className="shrink-0 font-mono text-2xl font-bold text-[#7c3aed]/70 transition-colors group-hover:text-[#7c3aed]">
                  {design.id}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-base font-semibold text-white group-hover:text-[#c4b5fd]">
                      {design.name}
                    </h2>
                    <span className="hidden text-xs text-white/15 sm:block">
                      {design.tone}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/30">
                    {design.description}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-[#7c3aed] opacity-0 transition-opacity group-hover:opacity-100">
                  &rarr;
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
