import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "playwright";

const baseUrl = process.env.ARCADE_CAPTURE_URL ?? "https://arcade.yuvrajkashyap.com";
const outputRoot = path.resolve("public/brand/recruiter");

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
}

async function captureRoute(page, route, destination) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await settle(page);
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

await captureRoute(desktopPage, "/", path.join(outputRoot, "desktop", "dashboard.jpg"));
await captureRoute(desktopPage, "/about", path.join(outputRoot, "desktop", "about.jpg"));

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

await captureRoute(mobilePage, "/", path.join(outputRoot, "mobile", "dashboard.jpg"));
await captureRoute(mobilePage, "/about", path.join(outputRoot, "mobile", "about.jpg"));

for (const slug of games) {
  await captureRoute(
    mobilePage,
    `/games/${slug}`,
    path.join(outputRoot, "mobile", "games", `${slug}.jpg`),
  );
}

await mobile.close();
await browser.close();

console.log(`Captured ${games.length * 2 + 5} recruiter-showcase images from ${baseUrl}.`);
