import Phaser from "phaser";
import { platform } from "@/src/platform";
import { ATLAS_KEYS, AUDIO_KEYS, GAME_HEIGHT, GAME_WIDTH, IMAGE_KEYS } from "../config";

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
    // Backgrounds: multi-atlas (BCG.png + L0..L6.png).
    this.load.multiatlas(ATLAS_KEYS.bg, "/assets/atlases/backgrounds.json", "/assets/atlases/");

    // Menu background (static) + menu music.
    this.load.image(IMAGE_KEYS.menuBackground, "/assets/start.webp");
    this.load.audio(AUDIO_KEYS.startMenuMusic, "/assets/audio/music/start_menu.wav");
    this.load.audio(AUDIO_KEYS.gameMusic, "/assets/audio/music/2.wav");

    // SFX
    this.load.audio(AUDIO_KEYS.click, "/assets/audio/sfx/click.wav");
    this.load.audio(AUDIO_KEYS.energyShield, "/assets/audio/sfx/energy_shield.wav");
    this.load.audio(AUDIO_KEYS.explosionScout, "/assets/audio/sfx/explosion_scout.wav");
    this.load.audio(AUDIO_KEYS.impactSmall, "/assets/audio/sfx/impact_small.wav");
    this.load.audio(AUDIO_KEYS.laserShort, "/assets/audio/sfx/Mhot.wav");
    this.load.audio(AUDIO_KEYS.gShot, "/assets/audio/sfx/Gshot2.wav");
    this.load.audio(AUDIO_KEYS.zpShot, "/assets/audio/sfx/Zp.wav");
    this.load.audio(AUDIO_KEYS.bigsShot, "/assets/audio/sfx/Bigs.wav");
    this.load.audio(AUDIO_KEYS.laserScout, "/assets/audio/sfx/laser_scout.wav");
    this.load.audio(AUDIO_KEYS.torpedoShot, "/assets/audio/sfx/Torpedo.wav");
    this.load.audio(AUDIO_KEYS.bcShot, "/assets/audio/sfx/Bc.wav");
    this.load.audio(AUDIO_KEYS.dnShot, "/assets/audio/sfx/DnShot.wav");
  }

  create() {
    // Defaults (persist across scenes).
    if (!this.registry.has("audioUnlocked")) this.registry.set("audioUnlocked", false);

    // Base Mini App: hide the native splash screen once we're ready to show content.
    // Guarded so it doesn't crash outside Base/Farcaster.
    void platform.ready().finally(() => {
      this.scene.start("MenuScene");
    });
  }
}

