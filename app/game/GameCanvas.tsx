"use client";

import { useEffect, useRef } from "react";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let detachVisibility: (() => void) | null = null;

    (async () => {
      // IMPORTANT: Phaser must never be imported during SSR.
      // Next.js can evaluate client components on the server, but `useEffect` runs only on the client.
      const [{ createGame }, { attachVisibilityHandlers }] = await Promise.all([
        import("@/src/game/Game"),
        import("@/src/platform"),
      ]);

      if (disposed) return;
      if (gameRef.current) return;

      const game = createGame(container);
      gameRef.current = game;
      detachVisibility = attachVisibilityHandlers(game);
    })();

    return () => {
      disposed = true;
      detachVisibility?.();
      detachVisibility = null;

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100dvw",
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        boxSizing: "border-box",
        overflow: "hidden",
        background: "#000",
        touchAction: "none",
      }}
    />
  );
}

