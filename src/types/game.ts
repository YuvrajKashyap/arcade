export type GameStatus = "draft" | "beta" | "live";
export type Difficulty = "easy" | "medium" | "hard";
export type MobileSupport = "full" | "partial" | "desktop-best";
export type InputType = "keyboard" | "mouse" | "touch";
export const gameGenres = [
  "Arcade",
  "Puzzle",
  "Reaction",
  "Strategy",
  "Platformer",
  "Experimental",
] as const;
export type GameGenre = (typeof gameGenres)[number];

export type ControlItem = {
  label: string;
  action: string;
};

export type GameMetadata = {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  thumbnail: string;
  genre: GameGenre;
  tags: string[];
  controls: {
    summary: string;
    items: ControlItem[];
  };
  difficulty: Difficulty;
  sessionLength: string;
  releaseDate: string;
  status: GameStatus;
  featured: boolean;
  published: boolean;
  supports: InputType[];
  mobileSupport: MobileSupport;
  version?: string;
  developerNotes?: string;
  howToPlay?: {
    summary: string;
    tips: string[];
  };
};

export type GameCatalogEntry = GameMetadata & {
  libraryOrder: number;
  featurePriority?: number;
  relatedSlugs?: string[];
};

export type GameCategoryGroup = {
  genre: GameGenre;
  description: string;
  games: GameCatalogEntry[];
};

export type HomepageCollections = {
  heroGame?: GameCatalogEntry;
  featuredGames: GameCatalogEntry[];
  newReleaseGames: GameCatalogEntry[];
  categoryGroups: GameCategoryGroup[];
  allGames: GameCatalogEntry[];
};

export type GamePageData = {
  game: GameCatalogEntry;
  relatedGames: GameCatalogEntry[];
  mobileSupportCopy: string;
};
