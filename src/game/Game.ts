import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./config";
import { GameScene } from "./scenes/GameScene";
import { MenuScene } from "./scenes/MenuScene";
import { PreloadScene } from "./scenes/PreloadScene";

/**
 * Creates a Phaser.Game instance.
 *
 * IMPORTANT (Next.js): call this only on the client, inside useEffect.
 */
export function createGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#000000",
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
    disableContextMenu: true,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: typeof window !== "undefined" ? window.innerWidth : GAME_WIDTH,
      height: typeof window !== "undefined" ? window.innerHeight : GAME_HEIGHT,
    },
    scene: [PreloadScene, MenuScene, GameScene],
  };

  return new Phaser.Game(config);
}

