import Phaser from "phaser";
import { ATLAS_KEYS, BG_FRAMES, GAME_HEIGHT, GAME_WIDTH, UI_FRAMES } from "../config";

export class MenuScene extends Phaser.Scene {
  private bgStar!: Phaser.GameObjects.TileSprite;
  private bgNebula!: Phaser.GameObjects.TileSprite;
  private bgDust!: Phaser.GameObjects.TileSprite;

  private soundIcon!: Phaser.GameObjects.Image;
  private startButton!: Phaser.GameObjects.Image;

  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    // Parallax background (downward scroll).
    this.bgStar = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, BG_FRAMES.starfield).setOrigin(0);
    this.bgNebula = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, BG_FRAMES.nebula).setOrigin(0);
    this.bgDust = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, BG_FRAMES.dust).setOrigin(0);

    // Menu window.
    const panel = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ATLAS_KEYS.ui, UI_FRAMES.panelWindow);
    panel.setDepth(10);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 55, "SPACE SHOOTER", {
        fontFamily: "monospace",
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(11);

    // START button with pointer states.
    const btnY = GAME_HEIGHT / 2 + 35;
    this.startButton = this.add
      .image(GAME_WIDTH / 2, btnY, ATLAS_KEYS.ui, UI_FRAMES.btnLargeNormal)
      .setInteractive({ useHandCursor: true })
      .setDepth(11);

    this.add
      .text(GAME_WIDTH / 2, btnY, "START", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(12);

    let isDown = false;
    this.startButton.on("pointerover", () => {
      if (!isDown) this.startButton.setFrame(UI_FRAMES.btnLargeHover);
    });
    this.startButton.on("pointerout", () => {
      if (!isDown) this.startButton.setFrame(UI_FRAMES.btnLargeNormal);
    });
    this.startButton.on("pointerdown", () => {
      isDown = true;
      this.startButton.setFrame(UI_FRAMES.btnLargePressed);
    });
    this.startButton.on("pointerup", () => {
      isDown = false;
      this.startButton.setFrame(UI_FRAMES.btnLargeHover);
      this.onStart();
    });

    // Sound toggle.
    const soundEnabled = Boolean(this.registry.get("soundEnabled"));
    this.soundIcon = this.add
      .image(GAME_WIDTH - 16, GAME_HEIGHT / 2 - 80, ATLAS_KEYS.ui, soundEnabled ? UI_FRAMES.iconSoundOn : UI_FRAMES.iconSoundOff)
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(12);

    this.soundIcon.on("pointerup", () => {
      const next = !Boolean(this.registry.get("soundEnabled"));
      this.registry.set("soundEnabled", next);
      this.soundIcon.setFrame(next ? UI_FRAMES.iconSoundOn : UI_FRAMES.iconSoundOff);
    });

    // Hint text.
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 85, "Drag to move • Auto-fire", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#c9d1d9",
      })
      .setOrigin(0.5)
      .setDepth(11);
  }

  update(_time: number, delta: number) {
    const t = delta / 16.666; // normalize ~60fps
    // Increasing tilePositionY makes the texture appear to move "up",
    // so we subtract to make the background drift "down" (vertical shooter feel).
    this.bgStar.tilePositionY -= 0.25 * t;
    this.bgNebula.tilePositionY -= 0.6 * t;
    this.bgDust.tilePositionY -= 1.2 * t;
  }

  private onStart() {
    // IMPORTANT: unlock audio only after START click (user gesture).
    this.unlockAudioOnce();
    this.scene.start("GameScene");
  }

  private unlockAudioOnce() {
    if (this.registry.get("audioUnlocked")) return;
    if (!Boolean(this.registry.get("soundEnabled"))) return;

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

