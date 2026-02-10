import Phaser from "phaser";
import { EnemyBullet } from "./EnemyBullet";
import { ATLAS_KEYS, AUDIO_KEYS, GAME_HEIGHT, SPRITE_FRAMES } from "../config";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private engineFx: Phaser.GameObjects.Sprite;
  private shieldFx: Phaser.GameObjects.Sprite;
  private weaponFx: Phaser.GameObjects.Sprite;
  private enemyBullets?: Phaser.Physics.Arcade.Group;

  private nextFireAt = 0;
  private isFiring = false;
  private shieldHp = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ATLAS_KEYS.enemy, SPRITE_FRAMES.enemyBase);

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(4);

    // Visual FX sprites (not part of the physics body).
    this.engineFx = scene.add
      .sprite(x, y, ATLAS_KEYS.enemy, `${SPRITE_FRAMES.enemyEnginePrefix}${SPRITE_FRAMES.enemyEngineStart}${SPRITE_FRAMES.enemyEngineSuffix}`)
      .setOrigin(0.5, 1)
      .setDepth(3)
      .setVisible(false);

    this.shieldFx = scene.add
      .sprite(x, y, ATLAS_KEYS.enemy, `${SPRITE_FRAMES.enemyShieldPrefix}${SPRITE_FRAMES.enemyShieldStart}${SPRITE_FRAMES.enemyShieldSuffix}`)
      .setDepth(6)
      .setVisible(false);

    this.weaponFx = scene.add
      .sprite(x, y, ATLAS_KEYS.enemy, `${SPRITE_FRAMES.enemyWeaponPrefix}${SPRITE_FRAMES.enemyWeaponStart}${SPRITE_FRAMES.enemyWeaponSuffix}`)
      .setDepth(5)
      .setVisible(false);
  }

  spawn(
    x: number,
    y: number,
    speedY: number,
    enemyBullets: Phaser.Physics.Arcade.Group,
    hasShield: boolean,
  ) {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    this.enemyBullets = enemyBullets;

    this.setFrame(SPRITE_FRAMES.enemyBase);
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setFlipY(true); // face downward

    body.enable = true;
    body.reset(x, y);

    body.allowGravity = false;
    this.setVelocity(0, speedY);

    // Smaller, forgiving hitbox.
    body.setSize(this.width * 0.7, this.height * 0.7, true);

    // Engine loop.
    this.engineFx.setVisible(true);
    this.engineFx.setFlipY(true);
    this.engineFx.play("enemy_engine", true);

    // Shield (optional). If present: 1 hit to break.
    this.shieldHp = hasShield ? 1 : 0;
    if (hasShield) {
      this.shieldFx.setVisible(true);
      this.shieldFx.setFlipY(true);
      this.shieldFx.play("enemy_shield", true);
    } else {
      this.shieldFx.setVisible(false);
      this.shieldFx.anims.stop();
    }

    // Weapon FX is off until firing.
    this.weaponFx.setVisible(false);
    this.weaponFx.setFlipY(true);
    this.weaponFx.anims.stop();
    this.weaponFx.removeAllListeners();

    this.isFiring = false;
    this.nextFireAt = this.scene.time.now + Phaser.Math.Between(850, 1400);

    // IMPORTANT: This enemy is pooled and its FX sprites are separate GameObjects.
    // Sync their positions immediately on spawn to avoid a 1-frame "flicker" at the
    // previous pooled position (especially noticeable for shielded enemies).
    this.syncFxPositions();
  }

  kill() {
    this.setActive(false);
    this.setVisible(false);

    this.isFiring = false;
    this.shieldHp = 0;
    this.engineFx.setVisible(false);
    this.shieldFx.setVisible(false);
    this.shieldFx.anims.stop();
    this.weaponFx.setVisible(false);
    this.weaponFx.anims.stop();
    this.weaponFx.removeAllListeners();

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.stop();
      body.enable = false;
    }
  }

  update(time: number) {
    if (!this.active) return;
    this.syncFxPositions();

    if (!this.isFiring && this.enemyBullets && time >= this.nextFireAt) {
      this.startFiringSequence();
    }
    if (this.y > GAME_HEIGHT + 48) this.kill();
  }

  override destroy(fromScene?: boolean) {
    this.engineFx.destroy();
    this.shieldFx.destroy();
    this.weaponFx.destroy();
    super.destroy(fromScene);
  }

  /**
   * Returns true if the enemy should be destroyed by this hit.
   * The first hit breaks the shield (1 HP), the second destroys the enemy.
   */
  onPlayerBulletHit(): boolean {
    if (!this.active) return false;

    if (this.shieldHp > 0) {
      this.shieldHp = 0;
      this.breakShield();
      return false;
    }

    return true;
  }

  private syncFxPositions() {
    // Anchor engine FX close to the enemy body.
    // Engine frames are trimmed inside a larger "real" frame, so we position
    // relative to the enemy bounds (not engineFx displayHeight) to avoid detaching.
    const top = this.getTopCenter();
    // With origin (0.5, 1) this pins the bottom of the flame to the top of the ship.
    // Engine frames have a lot of transparent space (trim) below the visible flame,
    // so we push the sprite down to keep the visible pixels tight to the ship.
    this.engineFx.setPosition(top.x, top.y + 32);

    this.shieldFx.setPosition(this.x, this.y);

    // Weapon frames are trimmed differently; placing it at the same position prevents it
    // from looking like a second ship that spawns ahead of the enemy.
    this.weaponFx.setPosition(this.x, this.y);
  }

  private breakShield() {
    this.shieldFx.setVisible(false);
    this.shieldFx.anims.stop();

    // Tiny feedback flash.
    this.setTintFill(0x7df9ff);
    this.scene.time.delayedCall(70, () => {
      if (!this.active) return;
      this.clearTint();
    });
  }

  private startFiringSequence() {
    if (!this.enemyBullets) return;

    this.isFiring = true;
    this.weaponFx.setVisible(true);
    this.weaponFx.removeAllListeners();

    // Flame animation before shot.
    this.weaponFx.play("enemy_weapon_flame", true);

    this.weaponFx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.weaponFx.setVisible(false);
      this.spawnBullet();

      this.isFiring = false;
      this.nextFireAt = this.scene.time.now + Phaser.Math.Between(900, 1600);
    });
  }

  private spawnBullet() {
    if (!this.enemyBullets) return;

    const x = this.x;
    const y = this.y + (this.displayHeight || 24) * 0.85;
    const bullet = this.enemyBullets.get(x, y) as EnemyBullet | null;
    if (!bullet) return;

    bullet.fire(x, y);

    if (this.scene.registry.get("audioUnlocked")) {
      try {
        this.scene.sound.play(AUDIO_KEYS.laserScout, { volume: 0.35 });
      } catch {
        // ignore
      }
    }
  }
}

