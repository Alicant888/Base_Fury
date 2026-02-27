import * as Phaser from "phaser";
import { ATLAS_KEYS, GAME_HEIGHT, SPRITE_FRAMES } from "../config";

const ROCKET_SPEED = 320;
// TUNE ROCKET SCALE HERE:
const ROCKET_SCALE = 0.8;

export class RocketProjectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(
      scene,
      x,
      y,
      ATLAS_KEYS.fx,
      `${SPRITE_FRAMES.rocketProjectilePrefix}${SPRITE_FRAMES.rocketProjectileStart}${SPRITE_FRAMES.rocketProjectileSuffix}`,
    );

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(1.5);
    this.setScale(ROCKET_SCALE);
  }

  fire(x: number, y: number) {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);

    body.enable = true;
    body.reset(x, y);
    body.allowGravity = false;

    this.setVelocity(0, -ROCKET_SPEED);
    this.play("rocket_projectile", true);

    body.setSize(this.displayWidth * 0.7, this.displayHeight * 0.7, true);
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
    if (this.y < -48) this.kill();
    if (this.y > GAME_HEIGHT + 48) this.kill();
  }
}

