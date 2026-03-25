import { gameCatalog } from "@/content/games/registry";
import {
  categoryDescriptions,
  genreOrder,
  mobileSupportCopy,
} from "@/lib/constants/site";
import { isWithinLastDays } from "@/lib/utils/date";
import type {
  GameCategoryGroup,
  GamePageData,
  HomepageCollections,
} from "@/types/game";

function sortByLibraryOrder(left: { libraryOrder: number }, right: { libraryOrder: number }) {
  return left.libraryOrder - right.libraryOrder;
}

export function getPublishedGames() {
  return [...gameCatalog].filter((game) => game.published).sort(sortByLibraryOrder);
}

export function getFeaturedGames() {
  return getPublishedGames()
    .filter((game) => game.featured)
    .sort((left, right) => {
      return (
        (left.featurePriority ?? Number.MAX_SAFE_INTEGER) -
        (right.featurePriority ?? Number.MAX_SAFE_INTEGER)
      );
    });
}

export function getNewReleaseGames(now = new Date()) {
  return getPublishedGames()
    .filter((game) => isWithinLastDays(game.releaseDate, 14, now))
    .sort((left, right) => right.releaseDate.localeCompare(left.releaseDate));
}

export function getGameBySlug(slug: string) {
  return gameCatalog.find((game) => game.slug === slug);
}

export function getPublishedGameBySlug(slug: string) {
  const game = getGameBySlug(slug);

  return game?.published ? game : undefined;
}

export function getPublishedGameSlugs() {
  return getPublishedGames().map((game) => ({
    slug: game.slug,
  }));
}

export function getCategoryGroups(games = getPublishedGames()): GameCategoryGroup[] {
  const groupedGames = new Map<GameCategoryGroup["genre"], GameCategoryGroup["games"]>();

  for (const game of games) {
    const currentGames = groupedGames.get(game.genre) ?? [];
    groupedGames.set(game.genre, [...currentGames, game]);
  }

  return genreOrder.flatMap((genre) => {
    const genreGames = groupedGames.get(genre);

    if (!genreGames || genreGames.length === 0) {
      return [];
    }

    return [
      {
        genre,
        description: categoryDescriptions[genre],
        games: [...genreGames].sort(sortByLibraryOrder),
      },
    ];
  });
}

export function getRelatedGames(slug: string, limit = 3) {
  const selectedGame = getPublishedGameBySlug(slug);
  if (!selectedGame) {
    return [];
  }

  return getPublishedGames()
    .filter((game) => game.slug !== slug)
    .sort((left, right) => {
      const sameGenreDelta =
        Number(right.genre === selectedGame.genre) -
        Number(left.genre === selectedGame.genre);
      if (sameGenreDelta !== 0) {
      return sameGenreDelta;
      }

      const sharedTagDelta =
        right.tags.filter((tag) => selectedGame.tags.includes(tag)).length -
        left.tags.filter((tag) => selectedGame.tags.includes(tag)).length;

      if (sharedTagDelta !== 0) {
        return sharedTagDelta;
      }

      return left.libraryOrder - right.libraryOrder;
    })
    .slice(0, limit);
}

export function getHomepageCollections(now = new Date()): HomepageCollections {
  const allGames = getPublishedGames();
  const featuredGames = allGames
    .filter((game) => game.featured)
    .sort(
      (left, right) =>
        (left.featurePriority ?? Number.MAX_SAFE_INTEGER) -
        (right.featurePriority ?? Number.MAX_SAFE_INTEGER),
    );
  const newReleaseGames = allGames
    .filter((game) => isWithinLastDays(game.releaseDate, 14, now))
    .sort((left, right) => right.releaseDate.localeCompare(left.releaseDate));

  return {
    heroGame: featuredGames[0] ?? allGames[0],
    featuredGames,
    newReleaseGames,
    categoryGroups: getCategoryGroups(allGames),
    allGames,
  };
}

export function getGamePageData(slug: string, relatedLimit = 2): GamePageData | undefined {
  const game = getPublishedGameBySlug(slug);

  if (!game) {
    return undefined;
  }

  return {
    game,
    relatedGames: getRelatedGames(slug, relatedLimit),
    mobileSupportCopy: mobileSupportCopy[game.mobileSupport],
  };
}
