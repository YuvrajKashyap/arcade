const DAY_IN_MS = 1000 * 60 * 60 * 24;

export function parseIsoDate(dateString: string) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

export function formatReleaseDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseIsoDate(dateString));
}

export function isWithinLastDays(dateString: string, days: number, now = new Date()) {
  const releaseDate = parseIsoDate(dateString).getTime();
  const referenceDate = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const differenceInDays = Math.floor((referenceDate - releaseDate) / DAY_IN_MS);

  return differenceInDays >= 0 && differenceInDays < days;
}
