"use client";

import { useEffect, useEffectEvent, useRef } from "react";

type FrameHandler = (deltaSeconds: number, elapsedSeconds: number) => void;

export function useAnimationFrameLoop(
  frameHandler: FrameHandler,
  isActive = true,
) {
  const onFrame = useEffectEvent(frameHandler);
  const elapsedSecondsRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let animationFrameId = 0;
    let previousFrameTime = performance.now();

    const loop = (currentFrameTime: number) => {
      const deltaSeconds = Math.min(
        (currentFrameTime - previousFrameTime) / 1000,
        0.05,
      );
      previousFrameTime = currentFrameTime;
      elapsedSecondsRef.current += deltaSeconds;
      onFrame(deltaSeconds, elapsedSecondsRef.current);
      animationFrameId = window.requestAnimationFrame(loop);
    };

    animationFrameId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isActive]);
}
