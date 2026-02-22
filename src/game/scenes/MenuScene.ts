import * as Phaser from "phaser";
import { AUDIO_KEYS, IMAGE_KEYS, UI_SCALE } from "../config";
import { SaveManager, SaveData } from "../systems/SaveManager";

/** Pack descriptor used by the shop UI. */
interface PackInfo {
  key: string;
  cost: number;
  reqLevel: number;
  /** Key in SaveData that stores whether this pack is purchased. */
  saveFlag: keyof SaveData;
}

const PACKS: PackInfo[] = [
  { key: IMAGE_KEYS.uiPackBase,   cost: 200,  reqLevel: 2,  saveFlag: "packBase"   },
  { key: IMAGE_KEYS.uiPackMedium, cost: 600,  reqLevel: 5,  saveFlag: "packMedium" },
  { key: IMAGE_KEYS.uiPackBig,    cost: 1800, reqLevel: 9,  saveFlag: "packBig"    },
  { key: IMAGE_KEYS.uiPackMaxi,   cost: 5400, reqLevel: 12, saveFlag: "packMaxi"   },
  { key: IMAGE_KEYS.uiPackXp,     cost: 100,  reqLevel: 1,  saveFlag: "packXp"     },
];

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
      const savedData = SaveManager.load();
      if (savedData.currentLevel > 1) {
        this.onStart(savedData.currentLevel, savedData, true);
      } else {
        this.onStart(1, undefined, true);
      }
    });

    // ------------------------------------------------------------------ //
    //  Shop pack buttons + score display                                   //
    // ------------------------------------------------------------------ //
    const shopContainer = this.add.container(0, 0).setDepth(3);
    this.buildShop(shopContainer);

    // ------------------------------------------------------------------ //
    //  Layout                                                              //
    // ------------------------------------------------------------------ //
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

  // ----------------------------------------------------------------------- //
  //  Private helpers                                                         //
  // ----------------------------------------------------------------------- //

  /** Build score text and shop pack buttons inside a container. */
  private buildShop(container: Phaser.GameObjects.Container) {
    const centerX = this.scale.width / 2;   // 180 for a 360-px canvas

    // --- Score display ---
    const scoreTxt = this.add.text(centerX, 580, "", {
      fontFamily: "Orbitron",
      fontSize: "14px",
      color: "#FFD700",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center",
    }).setOrigin(0.5);
    container.add(scoreTxt);

    // Measure button half-width at UI_SCALE (destroyed immediately).
    const probe = this.add.image(-9999, -9999, PACKS[0].key).setScale(UI_SCALE);
    const halfW  = probe.displayWidth  / 2;
    const halfH  = probe.displayHeight / 2;
    probe.destroy();

    const gap  = 5; // pixels between adjacent buttons
    const lx   = centerX - halfW - gap / 2;   // left-column centre x
    const rx   = centerX + halfW + gap / 2;   // right-column centre x
    const rowY = [642, 642 + halfH * 2 + 14, 642 + (halfH * 2 + 14) * 2]; // row y values

    // Grid: [basep left, mediump right], [bigp left, maxip right], [xpp centre]
    const grid = [
      { packIdx: 0, x: lx,     y: rowY[0] },
      { packIdx: 1, x: rx,     y: rowY[0] },
      { packIdx: 2, x: lx,     y: rowY[1] },
      { packIdx: 3, x: rx,     y: rowY[1] },
      { packIdx: 4, x: centerX, y: rowY[2] },
    ];

    // Keep references so they can all be refreshed together after a purchase.
    type BtnEntry = { img: Phaser.GameObjects.Image; lbl: Phaser.GameObjects.Text; pack: PackInfo };
    const entries: BtnEntry[] = [];

    const refreshAll = () => {
      const sv = SaveManager.load();
      scoreTxt.setText(`SCORE: ${sv.score}`);
      for (const { img, lbl, pack } of entries) {
        const owned  = sv[pack.saveFlag] as boolean;
        const reqMet = sv.currentLevel >= pack.reqLevel;

        img.setAlpha(1);
        img.removeInteractive();
        img.off("pointerdown").off("pointerover").off("pointerout");

        if (owned) {
          lbl.setText("OWNED").setColor("#44ff44");
          img.setTint(0x44ff44);
        } else if (!reqMet) {
          lbl.setText(`LVL ${pack.reqLevel}`).setColor("#888888");
          img.setTint(0x444444).setAlpha(0.4);
        } else {
          const canAfford = sv.score >= pack.cost;
          lbl.setText(`${pack.cost} pts`).setColor(canAfford ? "#FFD700" : "#888888");
          img.clearTint().setInteractive({ useHandCursor: true });
          img.on("pointerover", () => img.setTint(0xcccccc));
          img.on("pointerout",  () => img.clearTint());
          img.on("pointerdown", () => {
            const sv2 = SaveManager.load();
            if ((sv2[pack.saveFlag] as boolean) || sv2.score < pack.cost) return;
            this.playClick();
            (sv2 as unknown as Record<string, unknown>)[pack.saveFlag as string] = true;
            sv2.score -= pack.cost;
            SaveManager.save(sv2);
            refreshAll();
          });
        }
      }
    };

    for (const { packIdx, x, y } of grid) {
      const pack = PACKS[packIdx];
      const img = this.add.image(x, y, pack.key).setScale(UI_SCALE).setDepth(3);
      const lbl = this.add.text(x, y + halfH + 9, "", {
        fontFamily: "Orbitron",
        fontSize: "8px",
        color: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 2,
        align: "center",
      }).setOrigin(0.5).setDepth(3);
      container.add([img, lbl]);
      entries.push({ img, lbl, pack });
    }

    // Initial draw.
    refreshAll();
  }

  private onStart(level: number, save?: SaveData, showMenu = false) {
    this.unlockAudioOnce();
    this.playClick();
    this.menuMusic?.stop();
    this.menuMusic?.destroy();
    this.menuMusic = undefined;
    this.scene.start("GameScene", { level, save, showMenu });
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


