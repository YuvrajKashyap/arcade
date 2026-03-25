"use client";

import { useEffect, useRef } from "react";

type KeyboardStateOptions = {
  enabled?: boolean;
  preventDefaultKeys?: string[];
};

function normalizeKey(key: string) {
  return key.length === 1 ? key.toLowerCase() : key.toLowerCase();
}

export function useKeyboardState({
  enabled = true,
  preventDefaultKeys = [],
}: KeyboardStateOptions = {}) {
  const pressedKeysRef = useRef(new Set<string>());

  useEffect(() => {
    const pressedKeys = pressedKeysRef.current;

    if (!enabled) {
      pressedKeys.clear();
      return;
    }

    const blockedKeys = new Set(preventDefaultKeys.map(normalizeKey));
    const clearPressedKeys = () => {
      pressedKeys.clear();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const normalizedKey = normalizeKey(event.key);
      if (blockedKeys.has(normalizedKey)) {
        event.preventDefault();
      }

      pressedKeys.add(normalizedKey);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const normalizedKey = normalizeKey(event.key);
      pressedKeys.delete(normalizedKey);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearPressedKeys);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearPressedKeys);
      pressedKeys.clear();
    };
  }, [enabled, preventDefaultKeys]);

  return pressedKeysRef;
}
