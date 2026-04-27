import { gameCatalog } from "@/content/games/registry";

export type DesignShowcaseGame = {
  title: string;
  href: string;
  genre: string;
  accent: string;
  blurb: string;
  metric: string;
  mode: string;
  code: string;
  thumbnail: string;
};

const showcaseDetails: Record<
  string,
  Pick<DesignShowcaseGame, "accent" | "mode" | "code">
> = {
  snake: { accent: "#8b5cf6", mode: "ENDLESS", code: "SNK-01" },
  pong: { accent: "#38bdf8", mode: "DUEL", code: "PNG-02" },
  "reaction-time": { accent: "#f472b6", mode: "TIMED", code: "RCT-03" },
  "tic-tac-toe": { accent: "#8b5cf6", mode: "TACTICAL", code: "TTT-04" },
  pinball: { accent: "#ff6b35", mode: "TABLE", code: "PNB-05" },
  breakout: { accent: "#00a6a6", mode: "LEVELS", code: "BRK-06" },
  asteroids: { accent: "#c4b5fd", mode: "WAVES", code: "AST-07" },
  minesweeper: { accent: "#ffd166", mode: "FIELD", code: "MNS-08" },
};

export const designShowcaseGames: readonly DesignShowcaseGame[] = gameCatalog
  .filter((game) => game.published)
  .sort((left, right) => left.libraryOrder - right.libraryOrder)
  .map((game) => {
    const details = showcaseDetails[game.slug] ?? {
      accent: "#8b5cf6",
      mode: game.genre.toUpperCase(),
      code: game.slug.slice(0, 3).toUpperCase(),
    };

    return {
      title: game.title,
      href: `/games/${game.slug}`,
      genre: game.genre,
      accent: details.accent,
      blurb: game.shortDescription,
      metric: game.sessionLength.toUpperCase(),
      mode: details.mode,
      code: details.code,
      thumbnail: game.thumbnail,
    };
  });

