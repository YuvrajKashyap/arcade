"use client";

import dynamic from "next/dynamic";
import type { GameSlug } from "@/content/games/registry";
import { GameLoadingState } from "@/components/games/game-loading-state";

const SnakeGame = dynamic(() => import("@/features/games/snake"), {
  ssr: false,
  loading: GameLoadingState,
});

const PongGame = dynamic(() => import("@/features/games/pong"), {
  ssr: false,
  loading: GameLoadingState,
});

const ReactionTimeGame = dynamic(() => import("@/features/games/reaction-time"), {
  ssr: false,
  loading: GameLoadingState,
});

const TicTacToeGame = dynamic(() => import("@/features/games/tic-tac-toe"), {
  ssr: false,
  loading: GameLoadingState,
});

const PinballGame = dynamic(() => import("@/features/games/pinball"), {
  ssr: false,
  loading: GameLoadingState,
});

const BreakoutGame = dynamic(() => import("@/features/games/breakout"), {
  ssr: false,
  loading: GameLoadingState,
});

const AsteroidsGame = dynamic(() => import("@/features/games/asteroids"), {
  ssr: false,
  loading: GameLoadingState,
});

const MinesweeperGame = dynamic(() => import("@/features/games/minesweeper"), {
  ssr: false,
  loading: GameLoadingState,
});

const TwentyFortyEightGame = dynamic(() => import("@/features/games/2048"), {
  ssr: false,
  loading: GameLoadingState,
});

const DoodleJumpGame = dynamic(() => import("@/features/games/doodle-jump"), {
  ssr: false,
  loading: GameLoadingState,
});

const FlappyBirdGame = dynamic(() => import("@/features/games/flappy-bird"), {
  ssr: false,
  loading: GameLoadingState,
});

const CrossyRoadsGame = dynamic(() => import("@/features/games/crossy-roads"), {
  ssr: false,
  loading: GameLoadingState,
});

const ChromeDinoGame = dynamic(() => import("@/features/games/chrome-dino"), {
  ssr: false,
  loading: GameLoadingState,
});

const PacmanGame = dynamic(() => import("@/features/games/pacman"), {
  ssr: false,
  loading: GameLoadingState,
});

const TetrisGame = dynamic(() => import("@/features/games/tetris"), {
  ssr: false,
  loading: GameLoadingState,
});

const CookieClickerGame = dynamic(() => import("@/features/games/cookie-clicker"), {
  ssr: false,
  loading: GameLoadingState,
});

const SnakesAndLaddersGame = dynamic(() => import("@/features/games/snakes-and-ladders"), {
  ssr: false,
  loading: GameLoadingState,
});

const SorryGame = dynamic(() => import("@/features/games/sorry"), {
  ssr: false,
  loading: GameLoadingState,
});

const StreetFighterGame = dynamic(() => import("@/features/games/street-fighter"), {
  ssr: false,
  loading: GameLoadingState,
});

const HelixJumpGame = dynamic(() => import("@/features/games/helix-jump"), {
  ssr: false,
  loading: GameLoadingState,
});

const StackGame = dynamic(() => import("@/features/games/stack"), {
  ssr: false,
  loading: GameLoadingState,
});

const MemoryMatchGame = dynamic(() => import("@/features/games/memory-match"), {
  ssr: false,
  loading: GameLoadingState,
});

const WhackAMoleGame = dynamic(() => import("@/features/games/whack-a-mole"), {
  ssr: false,
  loading: GameLoadingState,
});

const ConnectFourGame = dynamic(() => import("@/features/games/connect-four"), {
  ssr: false,
  loading: GameLoadingState,
});

const HangmanGame = dynamic(() => import("@/features/games/hangman"), {
  ssr: false,
  loading: GameLoadingState,
});

const TypingSpeedTestGame = dynamic(() => import("@/features/games/typing-speed-test"), {
  ssr: false,
  loading: GameLoadingState,
});

const BubblePopGame = dynamic(() => import("@/features/games/bubble-pop"), {
  ssr: false,
  loading: GameLoadingState,
});

const MiniGolfGame = dynamic(() => import("@/features/games/mini-golf"), {
  ssr: false,
  loading: GameLoadingState,
});

const DunkHitGame = dynamic(() => import("@/features/games/dunk-hit"), {
  ssr: false,
  loading: GameLoadingState,
});

export const gameComponentMap: Record<GameSlug, React.ComponentType> = {
  snake: SnakeGame,
  pong: PongGame,
  "reaction-time": ReactionTimeGame,
  "tic-tac-toe": TicTacToeGame,
  pinball: PinballGame,
  breakout: BreakoutGame,
  asteroids: AsteroidsGame,
  minesweeper: MinesweeperGame,
  "2048": TwentyFortyEightGame,
  "doodle-jump": DoodleJumpGame,
  "flappy-bird": FlappyBirdGame,
  "crossy-roads": CrossyRoadsGame,
  "chrome-dino": ChromeDinoGame,
  pacman: PacmanGame,
  tetris: TetrisGame,
  "cookie-clicker": CookieClickerGame,
  "snakes-and-ladders": SnakesAndLaddersGame,
  sorry: SorryGame,
  "street-fighter": StreetFighterGame,
  "helix-jump": HelixJumpGame,
  stack: StackGame,
  "memory-match": MemoryMatchGame,
  "whack-a-mole": WhackAMoleGame,
  "connect-four": ConnectFourGame,
  hangman: HangmanGame,
  "typing-speed-test": TypingSpeedTestGame,
  "bubble-pop": BubblePopGame,
  "mini-golf": MiniGolfGame,
  "dunk-hit": DunkHitGame,
};
