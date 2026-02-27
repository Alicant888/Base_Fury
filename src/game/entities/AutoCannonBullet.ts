import * as Phaser from "phaser";
import { ATLAS_KEYS, GAME_HEIGHT, SPRITE_FRAMES } from "../config";

const AUTO_CANNON_BULLET_SPEED = 420;
// TUNE BULLET SCALE HERE:
const AUTO_CANNON_BULLET_SCALE = 0.52;

export class AutoCannonBullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(
      scene,
      x,
      y,
      ATLAS_KEYS.fx,
      `${SPRITE_FRAMES.autoCannonBulletPrefix}${SPRITE_FRAMES.autoCannonBulletStart}${SPRITE_FRAMES.autoCannonBulletSuffix}`,
    );

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(1.5);
    this.setScale(AUTO_CANNON_BULLET_SCALE);
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

    this.setVelocity(0, -AUTO_CANNON_BULLET_SPEED);
    this.play("auto_cannon_bullet", true);

    // Small hitbox.
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
    if (this.y < -32) this.kill();
    // Safety: if something pushes the bullet down, recycle it too.
    if (this.y > GAME_HEIGHT + 32) this.kill();
  }
}

