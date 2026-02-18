import * as Phaser from "phaser";
import { ATLAS_KEYS, GAME_HEIGHT, SPRITE_FRAMES } from "../config";

const ENEMY_BULLET_SPEED = 240;
const DEFAULT_DEPTH = 4;

export type EnemyProjectileFireOptions = {
  damage?: number;
  speedY?: number;
  animKey?: string;
  frame?: string;
  depth?: number;
  flipY?: boolean;
  scale?: number;
};

export class EnemyBullet extends Phaser.Physics.Arcade.Sprite {
  private damage = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ATLAS_KEYS.enemy, `${SPRITE_FRAMES.enemyProjectilePrefix}${SPRITE_FRAMES.enemyProjectileStart}${SPRITE_FRAMES.enemyProjectileSuffix}`);

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(DEFAULT_DEPTH);
  }

  getDamage() {
    return this.damage;
  }

  fire(x: number, y: number, options?: EnemyProjectileFireOptions) {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    this.damage = options?.damage ?? 1;

    const frame =
      options?.frame ?? `${SPRITE_FRAMES.enemyProjectilePrefix}${SPRITE_FRAMES.enemyProjectileStart}${SPRITE_FRAMES.enemyProjectileSuffix}`;
    const animKey = options?.animKey ?? "enemy_bullet";
    const speedY = options?.speedY ?? ENEMY_BULLET_SPEED;
    const depth = options?.depth ?? DEFAULT_DEPTH;
    const flipY = options?.flipY ?? true;
    const scale = options?.scale ?? 1;

    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setDepth(depth);
    this.setFlipY(flipY);
    this.setScale(scale);
    this.setFrame(frame);

    body.enable = true;
    body.reset(x, y);
    body.allowGravity = false;

    this.setVelocity(0, speedY);
    try {
      this.play(animKey);
    } catch {
      // ignore
    }

    // Small hitbox.
    body.setSize(this.width * 0.7, this.height * 0.7, true);
  }

  kill() {
    this.setActive(false);
    this.setVisible(false);
    this.anims.stop();
    this.damage = 1;
    this.setScale(1);

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.stop();
      body.enable = false;
    }
  }

  update() {
    if (!this.active) return;
    if (this.y > GAME_HEIGHT + 32) this.kill();
  }
}

