import * as Phaser from "phaser";
import { ATLAS_KEYS, GAME_HEIGHT, SPRITE_FRAMES } from "../config";

const PICKUP_SPEED_Y = 95;

export class ShieldPickup extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(
      scene,
      x,
      y,
      ATLAS_KEYS.fx,
      `${SPRITE_FRAMES.shieldPickupPrefix}${SPRITE_FRAMES.shieldPickupStart}${SPRITE_FRAMES.shieldPickupSuffix}`,
    );

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(6);
  }

  spawn(x: number, y: number) {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);

    body.enable = true;
    body.reset(x, y);
    body.allowGravity = false;
    this.setVelocity(0, PICKUP_SPEED_Y);

    this.play("shield_pickup", true);

    // Small overlap hitbox.
    body.setSize(this.width * 0.8, this.height * 0.8, true);
  }

  kill() {
    this.setActive(false);
    this.setVisible(false);
    this.anims.stop();

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.stop();
      body.enable = false;
    }
  }

  update() {
    if (!this.active) return;
    if (this.y > GAME_HEIGHT + 64) this.kill();
  }
}

