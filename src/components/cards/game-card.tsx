"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Pill } from "@/components/ui/pill";
import { formatReleaseDate } from "@/lib/utils/date";
import type { GameCatalogEntry } from "@/types/game";

type GameCardProps = {
  game: GameCatalogEntry;
};

export function GameCard({ game }: GameCardProps) {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="h-full"
    >
      <Link
        href={`/games/${game.slug}`}
        className="surface-panel flex h-full flex-col overflow-hidden rounded-[1.75rem]"
      >
        <div className="relative aspect-[16/10] overflow-hidden border-b border-line">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,209,102,0.4),transparent_35%),linear-gradient(140deg,rgba(20,33,61,0.94),rgba(65,80,109,0.92))]" />
          <Image
            src={game.thumbnail}
            alt={`${game.title} cover art`}
            fill
            className="object-cover mix-blend-screen"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        </div>
        <div className="flex flex-1 flex-col gap-4 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <Pill>{game.genre}</Pill>
            <Pill tone={game.status === "live" ? "signal" : "neutral"}>{game.status}</Pill>
          </div>
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">
              {game.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-foreground-soft">
              {game.shortDescription}
            </p>
          </div>
          <div className="mt-auto flex items-center justify-between gap-4 border-t border-line pt-4 text-sm text-foreground-soft">
            <span>{game.sessionLength}</span>
            <span>{formatReleaseDate(game.releaseDate)}</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
