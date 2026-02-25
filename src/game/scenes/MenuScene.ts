import * as Phaser from "phaser";
import { AUDIO_KEYS, IMAGE_KEYS, UI_SCALE } from "../config";
import { SaveManager, SaveData } from "../systems/SaveManager";

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
      void this.submitStartCheckIn();
      const savedData = SaveManager.load();
      if (savedData.currentLevel > 1) {
        this.onStart(savedData.currentLevel, savedData, true);
      } else {
        this.onStart(1, undefined, true);
      }
    });

    const layout = (width: number, height: number) => {
      bg.setPosition(width / 2, height / 2);
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      bg.setScale(Math.max(scaleX, scaleY));

      const btnY = height * 0.67;
      this.startButton.setPosition(width / 2, btnY);
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

  private onStart(level: number, save?: SaveData, showMenu = false) {
    this.unlockAudioOnce();
    this.playClick();
    this.menuMusic?.stop();
    this.menuMusic?.destroy();
    this.menuMusic = undefined;
    this.scene.start("GameScene", { level, save, showMenu });
  }

  private async submitStartCheckIn() {
    try {
      const { sdk } = await import("@farcaster/miniapp-sdk");
      if (!(await sdk.isInMiniApp())) return;

      const response = await sdk.quickAuth.fetch("/api/checkin/start", { method: "POST" });
      if (!response.ok) {
        console.warn("Start check-in failed:", response.status);
      }
    } catch (error) {
      console.warn("Start check-in request failed:", error);
    }
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
      (this.sound as unknown as { unlock?: () => void }).unlock?.();
      const ctx = (this.sound as unknown as { context?: AudioContext }).context;
      if (ctx?.state === "suspended") void ctx.resume().catch(() => {});
    } catch {
      // ignore
    }
  }
}


