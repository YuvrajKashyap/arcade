import {
  REACTION_MAX_DELAY_MS,
  REACTION_MIN_DELAY_MS,
} from "@/features/games/reaction-time/config/constants";
import { randomBetween } from "@/features/games/shared/utils/math";

export function getRandomDelay() {
  return Math.round(randomBetween(REACTION_MIN_DELAY_MS, REACTION_MAX_DELAY_MS));
}
