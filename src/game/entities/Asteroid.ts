import * as Phaser from "phaser";
import { ATLAS_KEYS, GAME_HEIGHT, GAME_WIDTH, SPRITE_FRAMES } from "../config";

const ASTEROID_MIN_DURABILITY = 1;
const ASTEROID_MAX_DURABILITY = 19;

export class Asteroid extends Phaser.Physics.Arcade.Sprite {
  private durability = ASTEROID_MIN_DURABILITY;
  /** Whether this asteroid can damage enemies on collision. */
  private _damagesEnemies = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ATLAS_KEYS.fx, SPRITE_FRAMES.asteroid01Base);

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(8); // above enemies (4), their shields (6), and weapon FX (5)
  }

  get damagesEnemies() { return this._damagesEnemies; }

  getDurability() {
    return this.durability;
  }

  spawn(x: number, y: number, speedY: number, scale: number, angleDeg: number, durability: number, damagesEnemiesOverride?: boolean) {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    // Clamp + sanitize.
    const d = Phaser.Math.Clamp(Math.round(durability), ASTEROID_MIN_DURABILITY, ASTEROID_MAX_DURABILITY);
    const s = Math.max(0.05, scale);

    this.durability = d;
    this._damagesEnemies = damagesEnemiesOverride ?? (Math.random() < 0.2); // 20% chance (unless overridden)

    this.setFrame(SPRITE_FRAMES.asteroid01Base);
    this.setScale(s);
    this.setAngle(angleDeg);

    // Keep within bounds after scaling.
    const halfW = (this.displayWidth || this.width) * 0.5;
    const clampedX = Phaser.Math.Clamp(x, halfW + 4, GAME_WIDTH - halfW - 4);

    this.setPosition(clampedX, y);
    this.setActive(true);
    this.setVisible(true);

    body.enable = true;
    body.reset(clampedX, y);
    body.allowGravity = false;

    // No horizontal movement.
    this.setVelocity(0, speedY);

    // Forgiving hitbox that matches the *trimmed* visible area.
    // Important: Arcade Body sizes / offsets are in *source pixels* (unscaled).
    // The Body applies the Game Object scale automatically.
    const fw = this.frame.width;
    const fh = this.frame.height;
    const hitW = Math.max(6, fw * 0.75);
    const hitH = Math.max(6, fh * 0.75);

    // For trimmed atlas frames, `frame.x` / `frame.y` are the destination offset (spriteSourceSize).
    const offX = this.frame.x + (fw - hitW) * 0.5;
    const offY = this.frame.y + (fh - hitH) * 0.5;

    body.setSize(hitW, hitH, false);
    body.setOffset(offX, offY);
    body.updateFromGameObject();
  }

  /**
   * Returns true if the asteroid is destroyed by this hit.
   */
  takeDamage(damage = 1): boolean {
    if (!this.active) return false;

    const d = Math.max(1, Math.round(damage));
    this.durability = Math.max(0, this.durability - d);
    return this.durability <= 0;
  }

  kill() {
    this.setActive(false);
    this.setVisible(false);
    this.anims.stop();
    this.durability = ASTEROID_MIN_DURABILITY;
    this.setScale(1);
    this.setAngle(0);

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

