import * as Phaser from "phaser";
import { ATLAS_KEYS, GAME_HEIGHT, SPRITE_FRAMES } from "../config";

const ZAPPER_PROJECTILE_SPEED = 420;
// TUNE PROJECTILE SCALE HERE:
const ZAPPER_PROJECTILE_SCALE = 0.85;

export class ZapperProjectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(
      scene,
      x,
      y,
      ATLAS_KEYS.fx,
      `${SPRITE_FRAMES.zapperProjectilePrefix}${SPRITE_FRAMES.zapperProjectileStart}${SPRITE_FRAMES.zapperProjectileSuffix}`,
    );

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(4);
    this.setScale(ZAPPER_PROJECTILE_SCALE);
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

    this.setVelocity(0, -ZAPPER_PROJECTILE_SPEED);
    this.play("zapper_projectile", true);

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

