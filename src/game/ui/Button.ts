import * as Phaser from "phaser";
import { UI_COLORS } from "../config";

export type ButtonType = "primary" | "danger" | "ok" | "icon";

export interface ButtonOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  text?: string;
  icon?: string; // If provided, uses ATLAS_KEYS.ui with this frame
  iconScale?: number;
  width?: number;
  height?: number;
  onClick?: () => void;
  type?: ButtonType;
  fontSize?: number;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private textObj?: Phaser.GameObjects.Text;
  private iconObj?: Phaser.GameObjects.Image;
  private options: ButtonOptions;
  
  private isHovered = false;
  private isPressed = false;

  constructor(options: ButtonOptions) {
    super(options.scene, options.x, options.y);
    this.options = options;
    
    // Default dimensions
    if (!this.options.width) this.options.width = options.icon ? 60 : 200;
    if (!this.options.height) this.options.height = 60;
    if (!this.options.type) this.options.type = "primary";

    this.bg = this.scene.add.graphics();
    this.add(this.bg);

    if (options.text) {
      this.textObj = this.scene.add.text(0, 0, options.text, {
        fontFamily: "Orbitron",
        fontSize: `${options.fontSize || 24}px`,
        color: UI_COLORS.text,
        align: "center"
      }).setOrigin(0.5);
      this.add(this.textObj);
    }

    if (options.icon) {
      // We assume ATLAS_KEYS.ui is available globally or imported if needed.
      // But we can't import ATLAS_KEYS here easily due to circular deps if config imports Button?
      // No, config is data only. But let's just use string "ui" for atlas key as convention.
      this.iconObj = this.scene.add.image(0, 0, "ui", options.icon);
      if (options.iconScale) this.iconObj.setScale(options.iconScale);
      this.add(this.iconObj);
    }

    this.setSize(this.options.width, this.options.height);
    this.setInteractive({ useHandCursor: true })
      .on("pointerover", this.onHover, this)
      .on("pointerout", this.onOut, this)
      .on("pointerdown", this.onDown, this)
      .on("pointerup", this.onUp, this);
    
    this.draw();
    this.scene.add.existing(this);
  }

  private onHover() {
    this.isHovered = true;
    this.draw();
  }

  private onOut() {
    this.isHovered = false;
    this.isPressed = false;
    this.draw();
  }

  private onDown() {
    this.isPressed = true;
    this.draw();
  }

  private onUp() {
    if (this.isPressed) {
      this.isPressed = false;
      this.draw();
      if (this.options.onClick) {
        this.options.onClick();
      }
    }
  }

  public setText(text: string) {
    if (this.textObj) {
      this.textObj.setText(text);
    }
  }

  public setIcon(frame: string) {
    if (this.iconObj) {
      this.iconObj.setFrame(frame);
    }
  }

  public getIcon(): Phaser.GameObjects.Image | undefined {
    return this.iconObj;
  }

  private draw() {
    this.bg.clear();
    
    const w = this.options.width!;
    const h = this.options.height!;
    const r = 12; // Rounded corners

    // Colors based on state and type
    let fillColor = UI_COLORS.mainBg;
    let strokeColor = UI_COLORS.mainOutline;
    let alpha = 0.9;

    if (this.options.type === "danger") {
      strokeColor = UI_COLORS.danger;
    } else if (this.options.type === "ok") {
      strokeColor = UI_COLORS.ok;
    }

    if (this.isPressed) {
      strokeColor = UI_COLORS.pressedOutline;
      fillColor = UI_COLORS.pressedOutline;
      alpha = 0.3;
    } else if (this.isHovered) {
      strokeColor = UI_COLORS.hoverOutline;
      fillColor = UI_COLORS.hoverOutline;
      alpha = 0.1;
    }

    this.bg.fillStyle(fillColor, this.isPressed ? 0.3 : (this.isHovered ? 0.1 : 0.9));
    // If not pressed/hovered, fill with mainBg at 0.9 alpha
    if (!this.isPressed && !this.isHovered) {
      this.bg.fillStyle(UI_COLORS.mainBg, 0.9);
    }

    this.bg.lineStyle(2, strokeColor, 1);
    
    // Draw rounded rect centered
    this.bg.fillRoundedRect(-w/2, -h/2, w, h, r);
    this.bg.strokeRoundedRect(-w/2, -h/2, w, h, r);

    // Update text/icon position if needed (e.g. press effect)
    const offset = this.isPressed ? 2 : 0;
    if (this.textObj) this.textObj.y = offset;
    if (this.iconObj) this.iconObj.y = offset;
  }
}
