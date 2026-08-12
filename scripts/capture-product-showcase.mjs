// Captures a production build for public-facing documentation.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "playwright";

const baseUrl = process.env.ARCADE_CAPTURE_URL ?? "https://arcade.yuvrajkashyap.com";
const outputRoot = path.resolve("public/brand/showcase");

const platformRoutes = [
  { slug: "dashboard", route: "/" },
  { slug: "library", route: "/library" },
  { slug: "about", route: "/about" },
];

const games = [
  "snake",
  "pong",
  "reaction-time",
  "tic-tac-toe",
  "pinball",
  "breakout",
  "asteroids",
  "minesweeper",
  "2048",
  "doodle-jump",
  "flappy-bird",
  "crossy-roads",
  "chrome-dino",
  "pacman",
  "tetris",
  "cookie-clicker",
  "snakes-and-ladders",
  "sorry",
  "street-fighter",
  "helix-jump",
  "stack",
  "memory-match",
  "whack-a-mole",
  "connect-four",
  "hangman",
  "typing-speed-test",
  "bubble-pop",
  "mini-golf",
  "dunk-hit",
  "geometry-dash",
];

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(1400);

  // Trigger intersection-based reveals and lazy media before taking a full-page image.
  await page.evaluate(async () => {
    const step = Math.max(500, Math.floor(window.innerHeight * 0.8));

    for (let offset = 0; offset < document.documentElement.scrollHeight; offset += step) {
      window.scrollTo(0, offset);
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }

    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    window.scrollTo(0, 0);
  });

  const hasLongRevealSequence = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight * 3,
  );
  await page.waitForTimeout(hasLongRevealSequence ? 2400 : 500);
}

async function captureRoute(page, route, destination) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await settle(page);

  if (route === "/library") {
    await page.evaluate(() => {
      for (const element of document.querySelectorAll("#content [style]")) {
        if (window.getComputedStyle(element).opacity === "0") {
          element.style.setProperty("opacity", "1", "important");
          element.style.setProperty("transform", "none", "important");
        }
      }
    });
    await page.waitForTimeout(300);
  }

  await page.screenshot({
    path: destination,
    fullPage: true,
    type: "jpeg",
    quality: 84,
  });
}

await mkdir(path.join(outputRoot, "desktop", "games"), { recursive: true });
await mkdir(path.join(outputRoot, "mobile", "games"), { recursive: true });
await mkdir(path.join(outputRoot, "states"), { recursive: true });

const browser = await chromium.launch();

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  colorScheme: "dark",
  deviceScaleFactor: 1,
});
const desktopPage = await desktop.newPage();

for (const { slug, route } of platformRoutes) {
  await captureRoute(
    desktopPage,
    route,
    path.join(outputRoot, "desktop", `${slug}.jpg`),
  );
}

for (const slug of games) {
  await captureRoute(
    desktopPage,
    `/games/${slug}`,
    path.join(outputRoot, "desktop", "games", `${slug}.jpg`),
  );
}

await desktopPage.goto(`${baseUrl}/games/tetris`, { waitUntil: "domcontentloaded" });
await settle(desktopPage);
const helpButton = desktopPage.getByRole("button", { name: /how to play/i }).first();
if (await helpButton.isVisible().catch(() => false)) {
  await helpButton.click();
  await desktopPage.waitForTimeout(300);
  await desktopPage.screenshot({
    path: path.join(outputRoot, "states", "how-to-play-overlay.jpg"),
    fullPage: true,
    type: "jpeg",
    quality: 84,
  });
}
await desktop.close();

const mobile = await browser.newContext({
  ...devices["iPhone 13"],
  colorScheme: "dark",
});
const mobilePage = await mobile.newPage();

for (const { slug, route } of platformRoutes) {
  await captureRoute(
    mobilePage,
    route,
    path.join(outputRoot, "mobile", `${slug}.jpg`),
  );
}

for (const slug of games) {
  await captureRoute(
    mobilePage,
    `/games/${slug}`,
    path.join(outputRoot, "mobile", "games", `${slug}.jpg`),
  );
}

await mobile.close();
await browser.close();

const captureCount = games.length * 2 + platformRoutes.length * 2 + 1;
console.log(`Captured ${captureCount} product-showcase images from ${baseUrl}.`);
