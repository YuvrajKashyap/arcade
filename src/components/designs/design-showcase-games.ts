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

export const designShowcaseGames: readonly DesignShowcaseGame[] = [
  {
    title: "Snake",
    href: "/games/snake",
    genre: "Arcade",
    accent: "#8b5cf6",
    blurb: "Grid pressure, score chase loops, and instant restart flow.",
    metric: "2-5 MIN",
    mode: "ENDLESS",
    code: "SNK-01",
    thumbnail: "/games/snake/thumbnail.png",
  },
  {
    title: "Pong",
    href: "/games/pong",
    genre: "Arcade",
    accent: "#38bdf8",
    blurb: "A clean duel with tuned ball speed and hard keyboard focus.",
    metric: "3-6 MIN",
    mode: "DUEL",
    code: "PNG-02",
    thumbnail: "/games/pong/thumbnail.png",
  },
  {
    title: "Reaction Time",
    href: "/games/reaction-time",
    genre: "Reaction",
    accent: "#f472b6",
    blurb: "Minimal reflex testing with immediate timing feedback.",
    metric: "30 SEC",
    mode: "TIMED",
    code: "RCT-03",
    thumbnail: "/games/reaction-time/thumbnail.png",
  },
  {
    title: "Tic Tac Toe",
    href: "/games/tic-tac-toe",
    genre: "Puzzle",
    accent: "#8b5cf6",
    blurb: "A perfect-information duel with an unbeatable CPU and fast restart flow.",
    metric: "1-3 MIN",
    mode: "TACTICAL",
    code: "TTT-04",
    thumbnail: "/games/tic-tac-toe/thumbnail.png",
  },
] as const;

