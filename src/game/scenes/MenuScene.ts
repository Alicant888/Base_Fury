import * as Phaser from "phaser";
import { ATLAS_KEYS, AUDIO_KEYS, IMAGE_KEYS, UI_SCALE } from "../config";
import { Button } from "../ui/Button";
import { SaveManager } from "../systems/SaveManager";

export class MenuScene extends Phaser.Scene {
  private startButton!: Phaser.GameObjects.Image;
  private continueButton?: Phaser.GameObjects.Image;
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
    try {
      this.menuMusic = this.sound.add(AUDIO_KEYS.startMenuMusic, { loop: true, volume: 0.65 });
      this.menuMusic.play();
    } catch {
      // ignore
    }

    // START (New Game) button
    this.startButton = this.add.image(0, 0, IMAGE_KEYS.uiStart)
      .setInteractive({ useHandCursor: true })
      .setDepth(2)
      .setScale(UI_SCALE);

    this.startButton.on("pointerover", () => this.startButton.setTint(0xcccccc));
    this.startButton.on("pointerout", () => this.startButton.clearTint());
    this.startButton.on("pointerdown", () => {
      this.startButton.setTint(0x888888);
      SaveManager.clear();
      this.onStart(1);
    });

    // CONTINUE button (only shown when a save exists)
    const hasSave = SaveManager.hasSave();
    if (hasSave) {
      this.continueButton = this.add.image(0, 0, IMAGE_KEYS.uiResume)
        .setInteractive({ useHandCursor: true })
        .setDepth(2)
        .setScale(UI_SCALE);

      this.continueButton.on("pointerover", () => this.continueButton?.setTint(0xcccccc));
      this.continueButton.on("pointerout", () => this.continueButton?.clearTint());
      this.continueButton.on("pointerdown", () => {
        this.continueButton?.setTint(0x888888);
        const save = SaveManager.load();
        this.onStart(save.currentLevel, save);
      });
    }

    const layout = (width: number, height: number) => {
      bg.setPosition(width / 2, height / 2);
      
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale);

      if (hasSave && this.continueButton) {
        // Two buttons: Continue higher, New Game lower
        const btnGap = 60;
        const baseY = height * 0.67;
        this.continueButton.setPosition(width / 2, baseY - btnGap / 2);
        this.startButton.setPosition(width / 2, baseY + btnGap / 2);
      } else {
        const btnY = height * 0.67;
        this.startButton.setPosition(width / 2, btnY);
      }
    };

    layout(this.scale.width, this.scale.height);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      layout(gameSize.width, gameSize.height);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);

    // Cleanup on scene shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      this.menuMusic?.stop();
      this.menuMusic?.destroy();
      this.menuMusic = undefined;
    });
  }

  private onStart(level: number, save?: import("../systems/SaveManager").SaveData) {
    // IMPORTANT: unlock audio only after START click (user gesture).
    this.unlockAudioOnce();
    this.playClick();

    // Stop menu music immediately.
    this.menuMusic?.stop();
    this.menuMusic?.destroy();
    this.menuMusic = undefined;

    this.scene.start("GameScene", { level, save });
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

