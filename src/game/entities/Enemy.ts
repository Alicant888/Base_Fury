import Phaser from "phaser";
import { ATLAS_KEYS, GAME_HEIGHT, SPRITE_FRAMES } from "../config";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ATLAS_KEYS.enemy, SPRITE_FRAMES.enemyBase);

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(4);
  }

  spawn(x: number, y: number, speedY: number) {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    this.setFrame(SPRITE_FRAMES.enemyBase);
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    body.enable = true;
    body.reset(x, y);

    body.allowGravity = false;
    this.setVelocity(0, speedY);

    // Smaller, forgiving hitbox.
    body.setSize(this.width * 0.7, this.height * 0.7, true);
  }

  kill() {
    this.setActive(false);
    this.setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.stop();
      body.enable = false;
    }
  }

  update() {
    if (!this.active) return;
    if (this.y > GAME_HEIGHT + 48) this.kill();
  }
}

