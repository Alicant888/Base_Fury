import Phaser from "phaser";
import { platform } from "@/src/platform";
import { ATLAS_KEYS, GAME_HEIGHT, GAME_WIDTH } from "../config";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    this.cameras.main.setBackgroundColor("#000000");

    const loadingText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "LOADING...", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => {
      loadingText.setText(`LOADING... ${Math.round(p * 100)}%`);
    });

    // Atlases are served from /public → use absolute paths from the web root.
    this.load.atlas(ATLAS_KEYS.ship, "/assets/atlases/MainShip.png", "/assets/atlases/MainShip.json");
    this.load.atlas(ATLAS_KEYS.enemy, "/assets/atlases/Enemy.png", "/assets/atlases/Enemy.json");
    this.load.atlas(ATLAS_KEYS.fx, "/assets/atlases/FX.png", "/assets/atlases/FX.json");
    this.load.atlas(ATLAS_KEYS.ui, "/assets/atlases/ui.png", "/assets/atlases/ui.json");
    this.load.atlas(ATLAS_KEYS.bg, "/assets/atlases/backgrounds.png", "/assets/atlases/backgrounds.json");
  }

  create() {
    // Defaults (persist across scenes).
    if (!this.registry.has("soundEnabled")) this.registry.set("soundEnabled", true);
    if (!this.registry.has("audioUnlocked")) this.registry.set("audioUnlocked", false);

    // Base Mini App: hide the native splash screen once we're ready to show content.
    // Guarded so it doesn't crash outside Base/Farcaster.
    void platform.ready().finally(() => {
      this.scene.start("MenuScene");
    });
  }
}

