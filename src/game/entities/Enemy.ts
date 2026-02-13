import Phaser from "phaser";
import { EnemyBullet, type EnemyProjectileFireOptions } from "./EnemyBullet";
import { ATLAS_KEYS, AUDIO_KEYS, GAME_HEIGHT, GAME_WIDTH, SPRITE_FRAMES } from "../config";

export type EnemyKind = "scout" | "fighter" | "torpedo" | "frigate" | "battlecruiser";

const FIGHTER_HP = 2;
const FIGHTER_SHIELD_HP = 2;
const FIGHTER_BULLET_OFFSET_X = 6;
const FIGHTER_WEAPON_FIRE_RIGHT_FRAME = `${SPRITE_FRAMES.fighterWeaponPrefix}1${SPRITE_FRAMES.fighterWeaponSuffix}`;
const FIGHTER_WEAPON_FIRE_LEFT_FRAME = `${SPRITE_FRAMES.fighterWeaponPrefix}3${SPRITE_FRAMES.fighterWeaponSuffix}`;

const TORPEDO_SHIP_HP = 2;
const TORPEDO_SHIP_SHIELD_HP = 2;
const TORPEDO_SHIP_TORPEDO_DAMAGE = 2;
const TORPEDO_SHIP_TORPEDO_DEPTH = 5;
const TORPEDO_SHIP_SALVO_BASE_Y_FACTOR = 0.15;
const TORPEDO_SHIP_ENGINE_EDGE_MARGIN_PX = 6;
const TORPEDO_SHIP_ENGINE_SCALE = 0.7; // -30%
const ENEMY_ENGINE_OFFSET_Y = 28;

const FRIGATE_HP = 3;
const FRIGATE_SHIELD_HP = 3;
const FRIGATE_BULLET_DAMAGE = 2;
const FRIGATE_BULLET_DEPTH = 5;
const FRIGATE_SALVO_BASE_Y_FACTOR = 0.15;
const FRIGATE_BIG_BULLET_SCALE = 0.6;

const BATTLECRUISER_HP = 4;
const BATTLECRUISER_SHIELD_HP = 4;
const BATTLECRUISER_WAVE_DAMAGE = 3;
const BATTLECRUISER_WAVE_DEPTH = 5;
const BATTLECRUISER_FIRE_Y_FACTOR = 0.28;
const BATTLECRUISER_ENGINE_EDGE_MARGIN_PX = 32;
const BATTLECRUISER_ENGINE_OFFSET_Y = 12;

const BATTLECRUISER_WEAPON_FIRE_FRAME_7 = `${SPRITE_FRAMES.battlecruiserWeaponPrefix}7${SPRITE_FRAMES.battlecruiserWeaponSuffix}`;
const BATTLECRUISER_WEAPON_FIRE_FRAME_15 = `${SPRITE_FRAMES.battlecruiserWeaponPrefix}15${SPRITE_FRAMES.battlecruiserWeaponSuffix}`;
const BATTLECRUISER_WEAPON_FIRE_FRAME_22 = `${SPRITE_FRAMES.battlecruiserWeaponPrefix}22${SPRITE_FRAMES.battlecruiserWeaponSuffix}`;

type FrigateShotConfig = {
  frameIndex: number;
  offsetX: number;
  offsetY: number;
};

// Later you can tune each shot position (offsetX/offsetY) and sync frameIndex independently.
const FRIGATE_SALVO_SHOTS: FrigateShotConfig[] = [
  // Left side (2 shots)
  { frameIndex: 1, offsetX: -14, offsetY: 0 },
  { frameIndex: 3, offsetX: -10, offsetY: 0 },
  // Right side (2 shots)
  { frameIndex: 3, offsetX: 10, offsetY: 0 },
  { frameIndex: 1, offsetX: 14, offsetY: 0 },
];

const SCOUT_SHIELD_OFFSET_X = 0;
const SCOUT_SHIELD_OFFSET_Y = 0;
const FIGHTER_SHIELD_OFFSET_X = 0;
const FIGHTER_SHIELD_OFFSET_Y = 0;
const TORPEDO_SHIP_SHIELD_OFFSET_X = 0;
const TORPEDO_SHIP_SHIELD_OFFSET_Y = 10;
const FRIGATE_SHIELD_OFFSET_X = 0;
const FRIGATE_SHIELD_OFFSET_Y = 0;
const BATTLECRUISER_SHIELD_OFFSET_X = 0;
const BATTLECRUISER_SHIELD_OFFSET_Y = 0;

type TorpedoShipShotConfig = {
  frameIndex: number;
  offsetX: number;
  offsetY: number;
};

// Later you can tune each shot position (offsetX/offsetY) and sync frameIndex independently.
const TORPEDO_SHIP_SALVO_SHOTS: TorpedoShipShotConfig[] = [
  // Left side (3 shots)
  { frameIndex: 14, offsetX: -20, offsetY: 0 },
  { frameIndex: 10, offsetX: -14, offsetY: 0 },
  { frameIndex: 6, offsetX: -8, offsetY: 0 },
  // Right side (3 shots)
  { frameIndex: 4, offsetX: 8, offsetY: 0 },
  { frameIndex: 8, offsetX: 14, offsetY: 0 },
  { frameIndex: 12, offsetX: 20, offsetY: 0 },
];

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private engineFx: Phaser.GameObjects.Sprite;
  private engineFxL?: Phaser.GameObjects.Sprite;
  private engineFxR?: Phaser.GameObjects.Sprite;
  private shieldFx: Phaser.GameObjects.Sprite;
  private weaponFx: Phaser.GameObjects.Sprite;
  private enemyBullets?: Phaser.Physics.Arcade.Group;

  private nextFireAt = 0;
  private isFiring = false;
  private kind: EnemyKind = "scout";
  private hp = 1;
  private shieldHp = 0;
  private torpedoSalvoDone = false;

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
    kind: EnemyKind,
    hasShield: boolean,
  ) {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    this.kind = kind;
    this.enemyBullets = enemyBullets;

    const isFighter = this.kind === "fighter";
    const isTorpedo = this.kind === "torpedo";
    const isFrigate = this.kind === "frigate";
    const isBattlecruiser = this.kind === "battlecruiser";

    this.torpedoSalvoDone = false;

    this.hp = isBattlecruiser ? BATTLECRUISER_HP : isFrigate ? FRIGATE_HP : isTorpedo ? TORPEDO_SHIP_HP : isFighter ? FIGHTER_HP : 1;
    this.shieldHp = isBattlecruiser
      ? (hasShield ? BATTLECRUISER_SHIELD_HP : 0)
      : isFrigate
        ? (hasShield ? FRIGATE_SHIELD_HP : 0)
        : isTorpedo
          ? (hasShield ? TORPEDO_SHIP_SHIELD_HP : 0)
          : isFighter
            ? (hasShield ? FIGHTER_SHIELD_HP : 0)
            : hasShield
              ? 1
              : 0;

    this.setFrame(
      isBattlecruiser
        ? SPRITE_FRAMES.battlecruiserBase
        : isFrigate
          ? SPRITE_FRAMES.frigateBase
          : isTorpedo
            ? SPRITE_FRAMES.torpedoShipBase
            : isFighter
              ? SPRITE_FRAMES.fighterBase
              : SPRITE_FRAMES.enemyBase,
    );

    // Keep large enemies (e.g. Torpedo Ship) within bounds.
    const halfW = (this.displayWidth || this.width) * 0.5;
    const clampedX = Phaser.Math.Clamp(x, halfW + 4, GAME_WIDTH - halfW - 4);

    this.setPosition(clampedX, y);
    this.setActive(true);
    this.setVisible(true);
    this.setFlipY(true); // face downward

    body.enable = true;
    body.reset(clampedX, y);

    body.allowGravity = false;
    this.setVelocity(0, speedY);

    // Smaller, forgiving hitbox.
    body.setSize(this.width * 0.7, this.height * 0.7, true);

    // Engine loop.
    const engineFrame = isBattlecruiser
      ? `${SPRITE_FRAMES.battlecruiserEnginePrefix}${SPRITE_FRAMES.battlecruiserEngineStart}${SPRITE_FRAMES.battlecruiserEngineSuffix}`
      : isFrigate
        ? `${SPRITE_FRAMES.frigateEnginePrefix}${SPRITE_FRAMES.frigateEngineStart}${SPRITE_FRAMES.frigateEngineSuffix}`
        : isTorpedo
          ? `${SPRITE_FRAMES.torpedoShipEnginePrefix}${SPRITE_FRAMES.torpedoShipEngineStart}${SPRITE_FRAMES.torpedoShipEngineSuffix}`
          : isFighter
            ? `${SPRITE_FRAMES.fighterEnginePrefix}${SPRITE_FRAMES.fighterEngineStart}${SPRITE_FRAMES.fighterEngineSuffix}`
            : `${SPRITE_FRAMES.enemyEnginePrefix}${SPRITE_FRAMES.enemyEngineStart}${SPRITE_FRAMES.enemyEngineSuffix}`;
    if (isTorpedo) {
      // Torpedo Ship has 2 engine flames at the edges.
      if (!this.engineFxL) {
        this.engineFxL = this.scene.add
          .sprite(x, y, ATLAS_KEYS.enemy, engineFrame)
          .setOrigin(0.5, 1)
          .setDepth(3)
          .setVisible(false);
      }
      if (!this.engineFxR) {
        this.engineFxR = this.scene.add
          .sprite(x, y, ATLAS_KEYS.enemy, engineFrame)
          .setOrigin(0.5, 1)
          .setDepth(3)
          .setVisible(false);
      }

      this.engineFx.setVisible(false);
      this.engineFx.anims.stop();

      this.engineFxL.setFrame(engineFrame);
      this.engineFxR.setFrame(engineFrame);
      this.engineFxL.setVisible(true);
      this.engineFxR.setVisible(true);
      this.engineFxL.setFlipY(true);
      this.engineFxR.setFlipY(true);
      this.engineFxL.setScale(TORPEDO_SHIP_ENGINE_SCALE);
      this.engineFxR.setScale(TORPEDO_SHIP_ENGINE_SCALE);
      this.engineFxL.play("torpedo_ship_engine", true);
      this.engineFxR.play("torpedo_ship_engine", true);
    } else if (isBattlecruiser) {
      // Battlecruiser has 3 engine flames (left / middle / right), animated as 12 frames.
      if (!this.engineFxL) {
        this.engineFxL = this.scene.add
          .sprite(x, y, ATLAS_KEYS.enemy, engineFrame)
          .setOrigin(0.5, 1)
          .setDepth(3)
          .setVisible(false);
      }
      if (!this.engineFxR) {
        this.engineFxR = this.scene.add
          .sprite(x, y, ATLAS_KEYS.enemy, engineFrame)
          .setOrigin(0.5, 1)
          .setDepth(3)
          .setVisible(false);
      }

      const leftFrame = `${SPRITE_FRAMES.battlecruiserEnginePrefix}0${SPRITE_FRAMES.battlecruiserEngineSuffix}`;
      const midFrame = `${SPRITE_FRAMES.battlecruiserEnginePrefix}1${SPRITE_FRAMES.battlecruiserEngineSuffix}`;
      const rightFrame = `${SPRITE_FRAMES.battlecruiserEnginePrefix}2${SPRITE_FRAMES.battlecruiserEngineSuffix}`;

      this.engineFxL.setFrame(leftFrame);
      this.engineFx.setFrame(midFrame);
      this.engineFxR.setFrame(rightFrame);

      this.engineFxL.setVisible(true);
      this.engineFx.setVisible(true);
      this.engineFxR.setVisible(true);

      this.engineFxL.setFlipY(true);
      this.engineFx.setFlipY(true);
      this.engineFxR.setFlipY(true);

      this.engineFxL.setScale(1);
      this.engineFx.setScale(1);
      this.engineFxR.setScale(1);

      this.engineFxL.play("battlecruiser_engine_left", true);
      this.engineFx.play("battlecruiser_engine_mid", true);
      this.engineFxR.play("battlecruiser_engine_right", true);
    } else {
      this.engineFxL?.setVisible(false);
      this.engineFxL?.anims.stop();
      this.engineFxR?.setVisible(false);
      this.engineFxR?.anims.stop();

      this.engineFx.setFrame(engineFrame);
      this.engineFx.setVisible(true);
      this.engineFx.setFlipY(true);
      this.engineFx.setScale(1);
      this.engineFx.play(isFrigate ? "frigate_engine" : isFighter ? "fighter_engine" : "enemy_engine", true);
    }

    // Shield. Scout: optional (1 HP). Fighter/Torpedo Ship: optional (2 HP).
    if (this.shieldHp > 0) {
      const shieldFrame = isBattlecruiser
        ? `${SPRITE_FRAMES.battlecruiserShieldPrefix}${SPRITE_FRAMES.battlecruiserShieldStart}${SPRITE_FRAMES.battlecruiserShieldSuffix}`
        : isFrigate
          ? `${SPRITE_FRAMES.frigateShieldPrefix}${SPRITE_FRAMES.frigateShieldStart}${SPRITE_FRAMES.frigateShieldSuffix}`
          : isTorpedo
            ? `${SPRITE_FRAMES.torpedoShipShieldPrefix}${SPRITE_FRAMES.torpedoShipShieldStart}${SPRITE_FRAMES.torpedoShipShieldSuffix}`
            : isFighter
              ? `${SPRITE_FRAMES.fighterShieldPrefix}${SPRITE_FRAMES.fighterShieldStart}${SPRITE_FRAMES.fighterShieldSuffix}`
              : `${SPRITE_FRAMES.enemyShieldPrefix}${SPRITE_FRAMES.enemyShieldStart}${SPRITE_FRAMES.enemyShieldSuffix}`;
      this.shieldFx.setFrame(shieldFrame);
      this.shieldFx.setVisible(true);
      this.shieldFx.setFlipY(true);
      this.shieldFx.play(
        isBattlecruiser ? "battlecruiser_shield" : isFrigate ? "frigate_shield" : isTorpedo ? "torpedo_ship_shield" : isFighter ? "fighter_shield" : "enemy_shield",
        true,
      );
    } else {
      this.shieldFx.setVisible(false);
      this.shieldFx.anims.stop();
    }

    // Weapon FX is off until firing.
    const weaponFrame = isBattlecruiser
      ? `${SPRITE_FRAMES.battlecruiserWeaponPrefix}${SPRITE_FRAMES.battlecruiserWeaponStart}${SPRITE_FRAMES.battlecruiserWeaponSuffix}`
      : isFrigate
        ? `${SPRITE_FRAMES.frigateWeaponPrefix}${SPRITE_FRAMES.frigateWeaponStart}${SPRITE_FRAMES.frigateWeaponSuffix}`
        : isTorpedo
          ? `${SPRITE_FRAMES.torpedoShipWeaponPrefix}${SPRITE_FRAMES.torpedoShipWeaponStart}${SPRITE_FRAMES.torpedoShipWeaponSuffix}`
          : isFighter
            ? `${SPRITE_FRAMES.fighterWeaponPrefix}${SPRITE_FRAMES.fighterWeaponStart}${SPRITE_FRAMES.fighterWeaponSuffix}`
            : `${SPRITE_FRAMES.enemyWeaponPrefix}${SPRITE_FRAMES.enemyWeaponStart}${SPRITE_FRAMES.enemyWeaponSuffix}`;
    this.weaponFx.setFrame(weaponFrame);
    // Torpedo Ship shows weapon idle (frame 0) on spawn, then hides it on first shot.
    this.weaponFx.setVisible(isTorpedo);
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
    this.hp = 0;
    this.shieldHp = 0;
    this.torpedoSalvoDone = false;
    this.engineFx.setVisible(false);
    this.engineFx.anims.stop();
    this.engineFxL?.setVisible(false);
    this.engineFxL?.anims.stop();
    this.engineFxR?.setVisible(false);
    this.engineFxR?.anims.stop();
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
      // Torpedo Ship fires only once per spawn.
      if (this.kind !== "torpedo" || !this.torpedoSalvoDone) {
        this.startFiringSequence();
      }
    }
    if (this.y > GAME_HEIGHT + 48) this.kill();
  }

  override destroy(fromScene?: boolean) {
    this.engineFx.destroy();
    this.engineFxL?.destroy();
    this.engineFxR?.destroy();
    this.shieldFx.destroy();
    this.weaponFx.destroy();
    super.destroy(fromScene);
  }

  /**
   * Returns true if the enemy should be destroyed by this hit.
   */
  onPlayerBulletHit(damage = 1): boolean {
    if (!this.active) return false;

    let remaining = Math.max(0, damage);

    if (this.shieldHp > 0 && remaining > 0) {
      const shieldBefore = this.shieldHp;
      this.shieldHp = Math.max(0, this.shieldHp - remaining);
      remaining = Math.max(0, remaining - shieldBefore);

      if (this.shieldHp === 0) {
        this.breakShield();
      }
    }

    if (remaining > 0) {
      this.hp = Math.max(0, this.hp - remaining);
    }

    return this.hp <= 0;
  }

  getKind(): EnemyKind {
    return this.kind;
  }

  private syncFxPositions() {
    // Anchor engine FX close to the enemy body.
    // Engine frames are trimmed inside a larger "real" frame, so we position
    // relative to the enemy bounds (not engineFx displayHeight) to avoid detaching.
    const top = this.getTopCenter();
    // With origin (0.5, 1) this pins the bottom of the flame to the top of the ship.
    // Engine frames have a lot of transparent space (trim) below the visible flame,
    // so we push the sprite down to keep the visible pixels tight to the ship.
    const engineY = top.y + ENEMY_ENGINE_OFFSET_Y;

    if (this.kind === "torpedo") {
      const halfW = (this.displayWidth || this.width) * 0.5;
      const dx = Math.max(0, halfW - TORPEDO_SHIP_ENGINE_EDGE_MARGIN_PX);
      this.engineFxL?.setPosition(top.x - dx, engineY);
      this.engineFxR?.setPosition(top.x + dx, engineY);
    } else if (this.kind === "battlecruiser") {
      const y = engineY + BATTLECRUISER_ENGINE_OFFSET_Y;
      const halfW = (this.displayWidth || this.width) * 0.5;
      const dx = Math.max(0, halfW - BATTLECRUISER_ENGINE_EDGE_MARGIN_PX);
      this.engineFxL?.setPosition(top.x - dx, y);
      this.engineFx.setPosition(top.x, y);
      this.engineFxR?.setPosition(top.x + dx, y);
    } else {
      this.engineFx.setPosition(top.x, engineY);
    }

    const shieldOffsetX =
      this.kind === "battlecruiser"
        ? BATTLECRUISER_SHIELD_OFFSET_X
        : this.kind === "torpedo"
          ? TORPEDO_SHIP_SHIELD_OFFSET_X
          : this.kind === "frigate"
            ? FRIGATE_SHIELD_OFFSET_X
            : this.kind === "fighter"
              ? FIGHTER_SHIELD_OFFSET_X
              : SCOUT_SHIELD_OFFSET_X;
    const shieldOffsetY =
      this.kind === "battlecruiser"
        ? BATTLECRUISER_SHIELD_OFFSET_Y
        : this.kind === "torpedo"
          ? TORPEDO_SHIP_SHIELD_OFFSET_Y
          : this.kind === "frigate"
            ? FRIGATE_SHIELD_OFFSET_Y
            : this.kind === "fighter"
              ? FIGHTER_SHIELD_OFFSET_Y
              : SCOUT_SHIELD_OFFSET_Y;
    this.shieldFx.setPosition(this.x + shieldOffsetX, this.y + shieldOffsetY);

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

    if (this.kind === "torpedo") {
      const firedShots = new Array(TORPEDO_SHIP_SALVO_SHOTS.length).fill(false);
      let playedSfx = false;

      const tryPlaySfx = () => {
        if (playedSfx) return;
        playedSfx = true;
        if (!this.scene.registry.get("audioUnlocked")) return;
        try {
          this.scene.sound.play(AUDIO_KEYS.laserScout, { volume: 0.45 });
        } catch {
          // ignore
        }
      };

      // Sync 6 torpedo shots to weapon animation frames (later tunable per-shot).
      this.weaponFx.on(
        Phaser.Animations.Events.ANIMATION_UPDATE,
        (_animation: Phaser.Animations.Animation, _frame: Phaser.Animations.AnimationFrame, _gameObject: Phaser.GameObjects.Sprite, frameKey: string) => {
          if (!this.active) return;
          if (!this.enemyBullets) return;

          const baseY = this.y + (this.displayHeight || 24) * TORPEDO_SHIP_SALVO_BASE_Y_FACTOR;
          const torpedoFrame = `${SPRITE_FRAMES.torpedoProjectilePrefix}${SPRITE_FRAMES.torpedoProjectileStart}${SPRITE_FRAMES.torpedoProjectileSuffix}`;

          for (let i = 0; i < TORPEDO_SHIP_SALVO_SHOTS.length; i += 1) {
            if (firedShots[i]) continue;
            const shot = TORPEDO_SHIP_SALVO_SHOTS[i];
            const fireFrameKey = `${SPRITE_FRAMES.torpedoShipWeaponPrefix}${shot.frameIndex}${SPRITE_FRAMES.torpedoShipWeaponSuffix}`;
            if (frameKey !== fireFrameKey) continue;

            firedShots[i] = true;
            const x = this.x + shot.offsetX;
            const y = baseY + shot.offsetY;

            const fired = this.spawnEnemyBulletAt(x, y, {
              animKey: "enemy_torpedo",
              frame: torpedoFrame,
              damage: TORPEDO_SHIP_TORPEDO_DAMAGE,
              depth: TORPEDO_SHIP_TORPEDO_DEPTH,
            });
            if (fired) tryPlaySfx();
          }
        },
      );

      this.weaponFx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.weaponFx.setVisible(false);
        this.weaponFx.removeAllListeners();

        this.isFiring = false;
        this.torpedoSalvoDone = true;
        this.nextFireAt = Number.MAX_SAFE_INTEGER;
      });

      this.weaponFx.play("torpedo_ship_weapon", true);
      return;
    }

    if (this.kind === "battlecruiser") {
      const waveFrame = `${SPRITE_FRAMES.waveProjectilePrefix}${SPRITE_FRAMES.waveProjectileStart}${SPRITE_FRAMES.waveProjectileSuffix}`;
      const firedFrameKeys = new Set<string>();
      let firedAfter29 = false;
      let playedSfx = false;

      const tryPlaySfx = () => {
        if (playedSfx) return;
        playedSfx = true;
        if (!this.scene.registry.get("audioUnlocked")) return;
        try {
          this.scene.sound.play(AUDIO_KEYS.laserScout, { volume: 0.45 });
        } catch {
          // ignore
        }
      };

      const fireWave = () => {
        if (!this.active) return;
        if (!this.enemyBullets) return;

        const x = this.x;
        const y = this.y + (this.displayHeight || 24) * BATTLECRUISER_FIRE_Y_FACTOR;

        const fired = this.spawnEnemyBulletAt(x, y, {
          animKey: "enemy_wave",
          frame: waveFrame,
          damage: BATTLECRUISER_WAVE_DAMAGE,
          depth: BATTLECRUISER_WAVE_DEPTH,
        });
        if (fired) tryPlaySfx();
      };

      // Sync 3 shots to specific weapon frames, and 1 more after the final frame (29).
      this.weaponFx.on(
        Phaser.Animations.Events.ANIMATION_UPDATE,
        (_animation: Phaser.Animations.Animation, _frame: Phaser.Animations.AnimationFrame, _gameObject: Phaser.GameObjects.Sprite, frameKey: string) => {
          if (!this.active) return;
          if (!this.enemyBullets) return;

          const shouldFire =
            frameKey === BATTLECRUISER_WEAPON_FIRE_FRAME_7 ||
            frameKey === BATTLECRUISER_WEAPON_FIRE_FRAME_15 ||
            frameKey === BATTLECRUISER_WEAPON_FIRE_FRAME_22;

          if (!shouldFire) return;
          if (firedFrameKeys.has(frameKey)) return;

          firedFrameKeys.add(frameKey);
          fireWave();
        },
      );

      this.weaponFx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (!firedAfter29) {
          firedAfter29 = true;
          fireWave();
        }

        this.weaponFx.setVisible(false);
        this.weaponFx.removeAllListeners();

        this.isFiring = false;
        this.nextFireAt = this.scene.time.now + Phaser.Math.Between(900, 1600);
      });

      this.weaponFx.play("battlecruiser_weapon", true);
      return;
    }

    if (this.kind === "frigate") {
      const firedShots = new Array(FRIGATE_SALVO_SHOTS.length).fill(false);
      let playedSfx = false;

      const tryPlaySfx = () => {
        if (playedSfx) return;
        playedSfx = true;
        if (!this.scene.registry.get("audioUnlocked")) return;
        try {
          this.scene.sound.play(AUDIO_KEYS.laserScout, { volume: 0.45 });
        } catch {
          // ignore
        }
      };

      this.weaponFx.on(
        Phaser.Animations.Events.ANIMATION_UPDATE,
        (_animation: Phaser.Animations.Animation, _frame: Phaser.Animations.AnimationFrame, _gameObject: Phaser.GameObjects.Sprite, frameKey: string) => {
          if (!this.active) return;
          if (!this.enemyBullets) return;

          const baseY = this.y + (this.displayHeight || 24) * FRIGATE_SALVO_BASE_Y_FACTOR;
          const bigBulletFrame = `${SPRITE_FRAMES.bigBulletProjectilePrefix}${SPRITE_FRAMES.bigBulletProjectileStart}${SPRITE_FRAMES.bigBulletProjectileSuffix}`;

          for (let i = 0; i < FRIGATE_SALVO_SHOTS.length; i += 1) {
            if (firedShots[i]) continue;
            const shot = FRIGATE_SALVO_SHOTS[i];
            const fireFrameKey = `${SPRITE_FRAMES.frigateWeaponPrefix}${shot.frameIndex}${SPRITE_FRAMES.frigateWeaponSuffix}`;
            if (frameKey !== fireFrameKey) continue;

            firedShots[i] = true;
            const x = this.x + shot.offsetX;
            const y = baseY + shot.offsetY;

            const fired = this.spawnEnemyBulletAt(x, y, {
              animKey: "enemy_big_bullet",
              frame: bigBulletFrame,
              damage: FRIGATE_BULLET_DAMAGE,
              depth: FRIGATE_BULLET_DEPTH,
              scale: FRIGATE_BIG_BULLET_SCALE,
            });
            if (fired) tryPlaySfx();
          }
        },
      );

      this.weaponFx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.weaponFx.setVisible(false);
        this.weaponFx.removeAllListeners();

        this.isFiring = false;
        this.nextFireAt = this.scene.time.now + Phaser.Math.Between(900, 1600);
      });

      this.weaponFx.play("frigate_weapon", true);
      return;
    }

    if (this.kind === "fighter") {
      let firedRight = false;
      let firedLeft = false;
      let playedSfx = false;

      const tryPlaySfx = () => {
        if (playedSfx) return;
        playedSfx = true;
        if (!this.scene.registry.get("audioUnlocked")) return;
        try {
          this.scene.sound.play(AUDIO_KEYS.laserScout, { volume: 0.35 });
        } catch {
          // ignore
        }
      };

      // Sync right/left shots to specific weapon frames.
      this.weaponFx.on(
        Phaser.Animations.Events.ANIMATION_UPDATE,
        (_animation: Phaser.Animations.Animation, _frame: Phaser.Animations.AnimationFrame, _gameObject: Phaser.GameObjects.Sprite, frameKey: string) => {
          if (!this.active) return;
          if (!this.enemyBullets) return;

          const x = this.x;
          const y = this.y + (this.displayHeight || 24) * 0.15;

          if (frameKey === FIGHTER_WEAPON_FIRE_RIGHT_FRAME && !firedRight) {
            firedRight = true;
            const fired = this.spawnEnemyBulletAt(x + FIGHTER_BULLET_OFFSET_X, y);
            if (fired) tryPlaySfx();
            return;
          }

          if (frameKey === FIGHTER_WEAPON_FIRE_LEFT_FRAME && !firedLeft) {
            firedLeft = true;
            const fired = this.spawnEnemyBulletAt(x - FIGHTER_BULLET_OFFSET_X, y);
            if (fired) tryPlaySfx();
          }
        },
      );

      this.weaponFx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.weaponFx.setVisible(false);
        this.weaponFx.removeAllListeners();

        this.isFiring = false;
        this.nextFireAt = this.scene.time.now + Phaser.Math.Between(900, 1600);
      });

      this.weaponFx.play("fighter_weapon_flame", true);
      return;
    }

    // Scout: flame animation before a single shot.
    this.weaponFx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.weaponFx.setVisible(false);
      this.weaponFx.removeAllListeners();
      this.spawnBullets();

      this.isFiring = false;
      this.nextFireAt = this.scene.time.now + Phaser.Math.Between(900, 1600);
    });

    this.weaponFx.play("enemy_weapon_flame", true);
  }

  private spawnEnemyBulletAt(x: number, y: number, options?: EnemyProjectileFireOptions): boolean {
    if (!this.enemyBullets) return false;
    const bullet = this.enemyBullets.get(x, y) as EnemyBullet | null;
    if (!bullet) return false;
    bullet.fire(x, y, options);
    return true;
  }

  private spawnBullets() {
    if (!this.enemyBullets) return;

    const x = this.x;
    const y = this.y + (this.displayHeight || 24) * 0.15;
    const firedAny = this.spawnEnemyBulletAt(x, y);

    if (firedAny && this.scene.registry.get("audioUnlocked")) {
      try {
        this.scene.sound.play(AUDIO_KEYS.laserScout, { volume: 0.35 });
      } catch {
        // ignore
      }
    }
  }
}

