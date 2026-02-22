import * as Phaser from "phaser";
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
        fontFamily: "Orbitron",
        fontSize: "20px",
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
    this.load.atlas(ATLAS_KEYS.fx2, "/assets/atlases/FX2.png", "/assets/atlases/FX2.json");
    this.load.atlas(ATLAS_KEYS.ui, "/assets/atlases/ui.png", "/assets/atlases/ui.json");
    // Backgrounds: multi-atlas (BCG.png + L0..L6.png).
    this.load.multiatlas(ATLAS_KEYS.bg, "/assets/atlases/backgrounds.json", "/assets/atlases/");

    // Load new UI buttons (loose PNGs)
    this.load.image(IMAGE_KEYS.uiStart, "/assets/atlases/UI/start.png");
    this.load.image(IMAGE_KEYS.uiHome, "/assets/atlases/UI/home.png");
    this.load.image(IMAGE_KEYS.uiResume, "/assets/atlases/UI/resume.png");
    this.load.image(IMAGE_KEYS.uiRestart, "/assets/atlases/UI/restart.png");
    this.load.image(IMAGE_KEYS.uiPlay, "/assets/atlases/UI/play.png");
    this.load.image(IMAGE_KEYS.uiPlayG, "/assets/atlases/UI/playg.png");
    this.load.image(IMAGE_KEYS.uiPause, "/assets/atlases/UI/pause.png");
    this.load.image(IMAGE_KEYS.uiPrev, "/assets/atlases/UI/prev.png");
    this.load.image(IMAGE_KEYS.uiNext, "/assets/atlases/UI/next.png");
    this.load.image(IMAGE_KEYS.uiExit, "/assets/atlases/UI/exit.png");
    this.load.image(IMAGE_KEYS.uiMenu, "/assets/atlases/UI/menu.png");
    this.load.image(IMAGE_KEYS.uiYes, "/assets/atlases/UI/yes.png");
    this.load.image(IMAGE_KEYS.uiNo, "/assets/atlases/UI/no.png");
    this.load.image(IMAGE_KEYS.ui1d, "/assets/atlases/UI/1d.png"); // Dialog "Are you sure?"
    this.load.image(IMAGE_KEYS.ui2d, "/assets/atlases/UI/2d.png"); // Game Over text
    this.load.image(IMAGE_KEYS.uiXp, "/assets/atlases/UI/XP.png");

    // Menu background (static) + menu music.
    this.load.image(IMAGE_KEYS.menuBackground, "/assets/start.webp");
    this.load.image(IMAGE_KEYS.pauseBackground, "/assets/menu.webp");
    this.load.audio(AUDIO_KEYS.startMenuMusic, "/assets/audio/music/start_menu.wav");
    this.load.audio(AUDIO_KEYS.gameMusic, "/assets/audio/music/1.wav"); // Default to 1.wav
    this.load.audio(AUDIO_KEYS.music1, "/assets/audio/music/1.wav");
    this.load.audio(AUDIO_KEYS.music2, "/assets/audio/music/2.wav");
    this.load.audio(AUDIO_KEYS.music3, "/assets/audio/music/3.wav");
    this.load.audio(AUDIO_KEYS.music4, "/assets/audio/music/4.wav");
    this.load.audio(AUDIO_KEYS.music5, "/assets/audio/music/5.wav");
    this.load.audio(AUDIO_KEYS.music6, "/assets/audio/music/6.wav");
    this.load.audio(AUDIO_KEYS.music7, "/assets/audio/music/7.wav");
    this.load.audio(AUDIO_KEYS.music8, "/assets/audio/music/8.wav");

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

