import * as Phaser from "phaser";
import { ATLAS_KEYS, AUDIO_KEYS, IMAGE_KEYS, UI_FRAMES } from "../config";

export class MenuScene extends Phaser.Scene {
  private startButton!: Phaser.GameObjects.Image;
  private menuMusic?: Phaser.Sound.BaseSound;

  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    // Static menu background image.
    const bg = this.add.image(0, 0, IMAGE_KEYS.menuBackground).setDepth(0);
    bg.setOrigin(0.5);

    // Menu music: start immediately on load, stop on START click.
    // Note: some environments may block autoplay with sound.
    try {
      this.menuMusic = this.sound.add(AUDIO_KEYS.startMenuMusic, { loop: true, volume: 0.65 });
      this.menuMusic.play();
    } catch {
      // ignore
    }

    // START button with pointer states.
    this.startButton = this.add
      .image(0, 0, ATLAS_KEYS.ui, UI_FRAMES.btnLargeNormal)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    const startLabel = this.add
      .text(0, 0, "START", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(3);

    const layout = (width: number, height: number) => {
      bg.setPosition(width / 2, height / 2);
      // Cover the screen: scale based on the dimension that needs more coverage.
      // If screen is wider than image (relative to height), scale by width.
      // If screen is taller than image (relative to width), scale by height.
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale);

      const padding = 24;
      // Button width logic: max 80% of width, but clamp to reasonable max size if needed.
      // Let's stick to 80% of width for now as requested.
      const btnTargetWidth = Math.min((width - padding * 2) * 0.8, 400); 
      const btnScale = btnTargetWidth / this.startButton.width;
      this.startButton.setScale(btnScale);
      
      const btnY = height - padding - (this.startButton.height * btnScale) / 2;
      this.startButton.setPosition(width / 2, btnY);
      startLabel.setPosition(width / 2, btnY);
      startLabel.setScale(btnScale); // Scale text too? Or keep fixed? Fixed is better usually, but let's keep it simple.
    };

    layout(this.scale.width, this.scale.height);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      layout(gameSize.width, gameSize.height);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);

    this.startButton.on("pointerdown", () => {
      this.startButton.setFrame(UI_FRAMES.btnLargePressed);
    });
    this.startButton.on("pointerup", () => {
      this.startButton.setFrame(UI_FRAMES.btnLargeNormal);
      this.onStart();
    });

    // Cleanup on scene shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
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

