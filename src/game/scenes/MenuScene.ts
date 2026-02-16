import Phaser from "phaser";
import { ATLAS_KEYS, AUDIO_KEYS, GAME_HEIGHT, GAME_WIDTH, IMAGE_KEYS, UI_FRAMES } from "../config";

export class MenuScene extends Phaser.Scene {
  private startButton!: Phaser.GameObjects.Image;
  private menuMusic?: Phaser.Sound.BaseSound;

  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    // Static menu background image.
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, IMAGE_KEYS.menuBackground).setDepth(0);
    bg.setOrigin(0.5);
    const scale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
    bg.setScale(scale);

    // Menu music: start immediately on load, stop on START click.
    // Note: some environments may block autoplay with sound.
    try {
      this.menuMusic = this.sound.add(AUDIO_KEYS.startMenuMusic, { loop: true, volume: 0.65 });
      this.menuMusic.play();
    } catch {
      // ignore
    }

    // START button with pointer states.
    const padding = 24;
    const btnTargetWidth = GAME_WIDTH - padding * 2;
    const btnY = GAME_HEIGHT - padding; // bottom padding (we'll subtract half height below)
    this.startButton = this.add
      .image(GAME_WIDTH / 2, btnY, ATLAS_KEYS.ui, UI_FRAMES.btnLargeNormal)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    // Stretch-to-width while keeping aspect ratio.
    const btnScale = btnTargetWidth / this.startButton.width;
    this.startButton.setScale(btnScale);
    this.startButton.setY(GAME_HEIGHT - padding - this.startButton.displayHeight / 2);

    this.add
      .text(GAME_WIDTH / 2, this.startButton.y, "START", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.startButton.on("pointerdown", () => {
      this.startButton.setFrame(UI_FRAMES.btnLargePressed);
    });
    this.startButton.on("pointerup", () => {
      this.startButton.setFrame(UI_FRAMES.btnLargeNormal);
      this.onStart();
    });

    // Cleanup on scene shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.menuMusic?.stop();
      this.menuMusic?.destroy();
      this.menuMusic = undefined;
    });
  }

  private onStart() {
    // IMPORTANT: unlock audio only after START click (user gesture).
    this.unlockAudioOnce();
    this.playClick();

    // Stop menu music immediately.
    this.menuMusic?.stop();
    this.menuMusic?.destroy();
    this.menuMusic = undefined;

    this.scene.start("GameScene");
  }

  private playClick() {
    try {
      this.sound.play(AUDIO_KEYS.click, { volume: 0.7 });
    } catch {
      // ignore
    }
  }

  private unlockAudioOnce() {
    if (this.registry.get("audioUnlocked")) return;

    this.registry.set("audioUnlocked", true);

    try {
      // Phaser handles WebAudio/HTML5 unlock internally; calling unlock here ensures it's tied
      // to an explicit user gesture.
      (this.sound as unknown as { unlock?: () => void }).unlock?.();

      const ctx = (this.sound as unknown as { context?: AudioContext }).context;
      if (ctx?.state === "suspended") {
        void ctx.resume().catch(() => {});
      }
    } catch {
      // ignore
    }
  }
}

