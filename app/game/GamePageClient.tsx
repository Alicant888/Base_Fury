"use client";

import { AuthOverlay } from "../components/AuthOverlay";
import { GameCanvas } from "./GameCanvas";

export function GamePageClient() {
  return (
    <>
      <GameCanvas />
      <AuthOverlay />
    </>
  );
}