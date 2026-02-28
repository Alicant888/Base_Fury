import * as Phaser from "phaser";
import { EnemyBullet, type EnemyProjectileFireOptions } from "./EnemyBullet";
import { ATLAS_KEYS, AUDIO_KEYS, GAME_HEIGHT, GAME_WIDTH, SPRITE_FRAMES } from "../config";

export type EnemyKind = "scout" | "fighter" | "torpedo" | "frigate" | "battlecruiser" | "dreadnought" | "bomber";

// ── Per-enemy-type depth (z-order) ───────────────────────────
// Small / weak ships render ABOVE large ones so they are never hidden.
// Offsets within a type: engine −0.2, body 0, weapon +0.1, shield +0.2.
export const ENEMY_DEPTH: Record<EnemyKind, { engine: number; body: number; weapon: number; shield: number }> = {
  dreadnought: { engine: 1.8, body: 2, weapon: 2.1, shield: 2.2 },
  battlecruiser: { engine: 2.3, body: 2.5, weapon: 2.6, shield: 2.7 },
  frigate: { engine: 2.8, body: 3, weapon: 3.1, shield: 3.2 },
  bomber: { engine: 3.3, body: 3.5, weapon: 3.6, shield: 3.7 },
  torpedo: { engine: 3.8, body: 4, weapon: 4.1, shield: 4.2 },
  fighter: { engine: 4.3, body: 4.5, weapon: 4.6, shield: 4.7 },
  scout: { engine: 4.8, body: 5, weapon: 5.1, shield: 5.2 },
};

const FIGHTER_HP = 2;
const FIGHTER_SHIELD_HP = 2;
const FIGHTER_BULLET_OFFSET_X = 6;
const FIGHTER_WEAPON_FIRE_RIGHT_FRAME = `${SPRITE_FRAMES.fighterWeaponPrefix}1${SPRITE_FRAMES.fighterWeaponSuffix}`;
const FIGHTER_WEAPON_FIRE_LEFT_FRAME = `${SPRITE_FRAMES.fighterWeaponPrefix}3${SPRITE_FRAMES.fighterWeaponSuffix}`;

const TORPEDO_SHIP_HP = 2;
const TORPEDO_SHIP_SHIELD_HP = 2;
const TORPEDO_SHIP_TORPEDO_DAMAGE = 2;
const TORPEDO_SHIP_TORPEDO_DEPTH = ENEMY_DEPTH.torpedo.body;
const TORPEDO_SHIP_SALVO_BASE_Y_FACTOR = 0.15;
const TORPEDO_SHIP_ENGINE_EDGE_MARGIN_PX = 6;
const TORPEDO_SHIP_ENGINE_SCALE = 0.7; // -30%
// TUNE HITBOX MULTIPLIER HERE (Torpedo Ship):
const TORPEDO_SHIP_HITBOX_W_MULT = 0.7;
const TORPEDO_SHIP_HITBOX_H_MULT = 0.1;
const ENEMY_ENGINE_OFFSET_Y = 30;
// Bomber-specific engine flame offset
const BOMBER_ENGINE_OFFSET_Y = 32;
// TUNE HITBOX MULTIPLIER HERE (Fighter):
const FIGHTER_HITBOX_W_MULT = 0.5;
const FIGHTER_HITBOX_H_MULT = 0.1;
// TUNE HITBOX MULTIPLIER HERE (Scout):
const SCOUT_HITBOX_W_MULT = 0.5;
const SCOUT_HITBOX_H_MULT = 0.1;

// Bomber (kamikaze).
const BOMBER_HP = 1;
const BOMBER_SHIELD_HP = 1;
const BOMBER_COLLISION_DAMAGE = 5;
const BOMBER_HITBOX_W_MULT = 0.5;
const BOMBER_HITBOX_H_MULT = 0.1;
const BOMBER_APPROACH_DISTANCE = 180;   // px from top before slowing down
const BOMBER_SLOW_SPEED = 30;           // crawl speed while locking target
const BOMBER_SLOW_DURATION_MS = 600;    // time spent crawling
const BOMBER_CHARGE_SPEED = 550;        // px/s dive speed

const FRIGATE_HP = 3;
const FRIGATE_SHIELD_HP = 3;
const FRIGATE_BULLET_DAMAGE = 2;
const FRIGATE_BULLET_DEPTH = ENEMY_DEPTH.frigate.body;
const FRIGATE_SALVO_BASE_Y_FACTOR = 0.15;
const FRIGATE_BIG_BULLET_SCALE = 0.6;
// TUNE HITBOX MULTIPLIER HERE (Frigate):
const FRIGATE_HITBOX_W_MULT = 0.7;
const FRIGATE_HITBOX_H_MULT = 0.1;

const BATTLECRUISER_HP = 30;
const BATTLECRUISER_SHIELD_HP = 30;
const BATTLECRUISER_WAVE_DAMAGE = 3;
const BATTLECRUISER_WAVE_DEPTH = ENEMY_DEPTH.battlecruiser.body;
const BATTLECRUISER_FIRE_Y_FACTOR = 0.28;
const BATTLECRUISER_ENGINE_EDGE_MARGIN_PX = 32;
const BATTLECRUISER_ENGINE_OFFSET_Y = 12;
// TUNE HITBOX MULTIPLIER HERE (Battlecruiser):
// Reduce height to better match the visible ship.
const BATTLECRUISER_HITBOX_W_MULT = 0.6;
const BATTLECRUISER_HITBOX_H_MULT = 0.1;

const BATTLECRUISER_WEAPON_FIRE_FRAME_7 = `${SPRITE_FRAMES.battlecruiserWeaponPrefix}7${SPRITE_FRAMES.battlecruiserWeaponSuffix}`;
const BATTLECRUISER_WEAPON_FIRE_FRAME_15 = `${SPRITE_FRAMES.battlecruiserWeaponPrefix}15${SPRITE_FRAMES.battlecruiserWeaponSuffix}`;
const BATTLECRUISER_WEAPON_FIRE_FRAME_22 = `${SPRITE_FRAMES.battlecruiserWeaponPrefix}22${SPRITE_FRAMES.battlecruiserWeaponSuffix}`;

const DREADNOUGHT_HP = 100;
const DREADNOUGHT_SHIELD_HP = 100;
const DREADNOUGHT_RAY_DAMAGE = 5;
const DREADNOUGHT_RAY_DEPTH = ENEMY_DEPTH.dreadnought.engine; // under dreadnought body
// With dreadnought_weapon at 28fps and shots every 7 frames (0.25s),
// set relative speed so segments stack seamlessly: 38px (ray height) / 0.25s = 152px/s.
const DREADNOUGHT_RAY_REL_SPEED_Y = 152;
const DREADNOUGHT_FIRE_Y_FACTOR = 0.3; // spawn below the ship
const DREADNOUGHT_ENGINE_OFFSET_Y = 1; // move engine flame closer to the ship
const DREADNOUGHT_HOVER_Y = 160; // upper third of the screen
const DREADNOUGHT_IDLE_DRIFT_SPEED_X = 16;
const DREADNOUGHT_ALIGN_SPEED_X = 180; // medium speed to chase player X before firing
const DREADNOUGHT_ALIGN_EPS_PX = 3;
// Boss is very wide; allow its center closer to edges so the center weapon can still hit the player near screen edges.
const DREADNOUGHT_BOSS_EDGE_PADDING_X = 4;
// Dreadnought front has angled sides; use a narrower hitbox to avoid "early" side hits in transparent corners.
const DREADNOUGHT_HITBOX_W_MULT = 0.55;
const DREADNOUGHT_HITBOX_H_MULT = 0.5;
// Shield is a round bubble and should absorb shots even at the edges.
// Use a circle body while the shield is active (not suppressed).
const DREADNOUGHT_SHIELD_BODY_RADIUS_MULT = 0.9;

const DREADNOUGHT_WEAPON_FIRE_FRAME_27 = `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}27${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`;
const DREADNOUGHT_WEAPON_FIRE_FRAME_34 = `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}34${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`;

const DREADNOUGHT_WEAPON_FIRE_FRAME_41 = `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}41${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`;
const DREADNOUGHT_WEAPON_FIRE_FRAME_48 = `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}48${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`;
const DREADNOUGHT_WEAPON_FIRE_FRAME_55 = `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}55${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`;
const DREADNOUGHT_WEAPON_SFX_FRAME_28 = `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}28${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`;

// Mini-boss behaviour for shielded heavy enemies.
const MINI_BOSS_HOVER_Y = 160;
const MINI_BOSS_DRIFT_SPEED = 25;

// Scout / Fighter / Frigate bullet speed (+50% over default 240).
const SCOUT_FIGHTER_FRIGATE_BULLET_SPEED = 360;

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
const DREADNOUGHT_SHIELD_OFFSET_X = 0;
const DREADNOUGHT_SHIELD_OFFSET_Y = 0;
const BOMBER_SHIELD_OFFSET_X = 0;
const BOMBER_SHIELD_OFFSET_Y = 8;

type TorpedoShipShotConfig = {
  frameIndex: number;
  offsetX: number;
  offsetY: number;
};

type StandardEnemyAiMode = "none" | "zigzag" | "hunt";

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

export const getEnemyXp = (kind: EnemyKind): number => {
  switch (kind) {
    case "scout":
      return 1;
    case "fighter":
      return FIGHTER_HP;
    case "torpedo":
      return TORPEDO_SHIP_HP;
    case "frigate":
      return FRIGATE_HP;
    case "battlecruiser":
      return BATTLECRUISER_HP;
    case "dreadnought":
      return DREADNOUGHT_HP;
    case "bomber":
      return BOMBER_HP;
  }
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  public getKind(): EnemyKind {
    return this.kind;
  }
  /** Whether the enemy was spawned with a shield (read-only). */
  public get spawnedWithShield() { return this._spawnedWithShield; }

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
  private shieldSuppressed = false;
  private _spawnedWithShield = false;
  private _isMiniBoss = false;

  // "Standard" enemy AI (non-bomber / non-boss / non-mini-boss).
  private aiMode: StandardEnemyAiMode = "none";
  private aiZigzagDir: -1 | 1 = 1;
  private aiZigzagSpeedX = 0;
  private aiZigzagNextToggleAt = 0;
  private aiHuntMaxSpeedX = 0;
  private aiHuntK = 0;
  private aiHuntDeadzonePx = 0;
  private aiHuntTargetOffsetX = 0;

  // Pre-fire alignment (used by some kinds before starting their firing animation).
  private preFireState: "none" | "aligning" = "none";
  private preFireTargetX = 0;
  private preFireAlignSpeedX = 0;
  private preFireAlignEpsPx = 0;
  private preFireAlignUntil = 0;

  // Boss-only state (Dreadnought).
  private dreadnoughtState: "idle" | "aligning" | "firing" = "idle";
  private dreadnoughtDriftDir: -1 | 1 = 1;

  // Bomber kamikaze state.
  private bomberPhase: "approach" | "slow" | "charge" = "approach";
  private bomberSlowUntil = 0;
  private bomberTargetX = 0;
  private bomberTargetY = 0;

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
    hpOverride?: number,
    shieldHpOverride?: number,
  ) {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    this.kind = kind;
    this.enemyBullets = enemyBullets;

    const isFighter = this.kind === "fighter";
    const isTorpedo = this.kind === "torpedo";
    const isFrigate = this.kind === "frigate";
    const isBattlecruiser = this.kind === "battlecruiser";
    const isDreadnought = this.kind === "dreadnought";
    const isBomber = this.kind === "bomber";

    this.torpedoSalvoDone = false;
    this.shieldSuppressed = false;
    this.dreadnoughtState = "idle";
    this.dreadnoughtDriftDir = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    this.bomberPhase = "approach";
    this.bomberSlowUntil = 0;

    // Reset standard AI state (pooled enemy).
    this.aiMode = "none";
    this.aiZigzagDir = 1;
    this.aiZigzagSpeedX = 0;
    this.aiZigzagNextToggleAt = 0;
    this.aiHuntMaxSpeedX = 0;
    this.aiHuntK = 0;
    this.aiHuntDeadzonePx = 0;
    this.aiHuntTargetOffsetX = 0;
    this.preFireState = "none";
    this.preFireTargetX = 0;
    this.preFireAlignSpeedX = 0;
    this.preFireAlignEpsPx = 0;
    this.preFireAlignUntil = 0;

    const defaultHp = isDreadnought ? DREADNOUGHT_HP : isBattlecruiser ? BATTLECRUISER_HP : isFrigate ? FRIGATE_HP : isTorpedo ? TORPEDO_SHIP_HP : isFighter ? FIGHTER_HP : isBomber ? BOMBER_HP : 1;
    this.hp = hpOverride ?? defaultHp;

    const defaultShieldHp = isDreadnought
      ? (hasShield ? DREADNOUGHT_SHIELD_HP : 0)
      : isBattlecruiser
        ? (hasShield ? BATTLECRUISER_SHIELD_HP : 0)
        : isFrigate
          ? (hasShield ? FRIGATE_SHIELD_HP : 0)
          : isTorpedo
            ? (hasShield ? TORPEDO_SHIP_SHIELD_HP : 0)
            : isFighter
              ? (hasShield ? FIGHTER_SHIELD_HP : 0)
              : isBomber
                ? BOMBER_SHIELD_HP          // bomber always has shield
                : hasShield
                  ? 1
                  : 0;
    this.shieldHp = shieldHpOverride ?? defaultShieldHp;
    this._spawnedWithShield = hasShield || (shieldHpOverride ?? 0) > 0;
    this._isMiniBoss = false;

    // Bomber lives in FX3 atlas; all others use Enemy atlas.
    if (isBomber) {
      this.setTexture(ATLAS_KEYS.fx3, SPRITE_FRAMES.bomberBase);
    } else {
      this.setTexture(ATLAS_KEYS.enemy);
      this.setFrame(
        isDreadnought
          ? SPRITE_FRAMES.dreadnoughtBase
          : isBattlecruiser
            ? SPRITE_FRAMES.battlecruiserBase
            : isFrigate
              ? SPRITE_FRAMES.frigateBase
              : isTorpedo
                ? SPRITE_FRAMES.torpedoShipBase
                : isFighter
                  ? SPRITE_FRAMES.fighterBase
                  : SPRITE_FRAMES.enemyBase,
      );
    }

    // Keep large enemies within bounds.
    // Dreadnought is a boss: allow it to go partially off-screen so its center weapon can still reach edge players.
    const halfW = (this.displayWidth || this.width) * 0.5;
    const minX = isDreadnought ? DREADNOUGHT_BOSS_EDGE_PADDING_X : halfW + 4;
    const maxX = isDreadnought ? GAME_WIDTH - DREADNOUGHT_BOSS_EDGE_PADDING_X : GAME_WIDTH - halfW - 4;
    const clampedX = Phaser.Math.Clamp(x, minX, maxX);

    const spawnY = isDreadnought ? DREADNOUGHT_HOVER_Y : y;
    this.setPosition(clampedX, spawnY);
    this.setActive(true);
    this.setVisible(true);
    this.setFlipY(true); // face downward

    body.enable = true;
    body.reset(clampedX, spawnY);

    body.allowGravity = false;
    this.setVelocity(0, isDreadnought ? 0 : speedY);

    // Smaller, forgiving hitbox.
    const hitboxWMult = isDreadnought
      ? DREADNOUGHT_HITBOX_W_MULT
      : isBattlecruiser
        ? BATTLECRUISER_HITBOX_W_MULT
        : isFrigate
          ? FRIGATE_HITBOX_W_MULT
          : isTorpedo
            ? TORPEDO_SHIP_HITBOX_W_MULT
            : isFighter
              ? FIGHTER_HITBOX_W_MULT
              : isBomber
                ? BOMBER_HITBOX_W_MULT
                : SCOUT_HITBOX_W_MULT;
    const hitboxHMult = isDreadnought
      ? DREADNOUGHT_HITBOX_H_MULT
      : isBattlecruiser
        ? BATTLECRUISER_HITBOX_H_MULT
        : isFrigate
          ? FRIGATE_HITBOX_H_MULT
          : isTorpedo
            ? TORPEDO_SHIP_HITBOX_H_MULT
            : isFighter
              ? FIGHTER_HITBOX_H_MULT
              : isBomber
                ? BOMBER_HITBOX_H_MULT
                : SCOUT_HITBOX_H_MULT;
    body.setSize(this.width * hitboxWMult, this.height * hitboxHMult, true);
    this.syncDreadnoughtCollisionBody();

    // Engine loop.
    const engineFrame = isBomber
      ? `${SPRITE_FRAMES.bomberEnginePrefix}${SPRITE_FRAMES.bomberEngineStart}${SPRITE_FRAMES.bomberEngineSuffix}`
      : isBattlecruiser
        ? `${SPRITE_FRAMES.battlecruiserEnginePrefix}${SPRITE_FRAMES.battlecruiserEngineStart}${SPRITE_FRAMES.battlecruiserEngineSuffix}`
        : isDreadnought
          ? `${SPRITE_FRAMES.dreadnoughtEnginePrefix}${SPRITE_FRAMES.dreadnoughtEngineStart}${SPRITE_FRAMES.dreadnoughtEngineSuffix}`
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

      // Bomber engine uses FX3 atlas; switch texture before setting frame.
      if (isBomber) {
        this.engineFx.setTexture(ATLAS_KEYS.fx3, engineFrame);
      } else {
        this.engineFx.setTexture(ATLAS_KEYS.enemy, engineFrame);
      }
      this.engineFx.setVisible(true);
      this.engineFx.setFlipY(true);
      this.engineFx.setScale(1);
      this.engineFx.play(isBomber ? "bomber_engine" : isDreadnought ? "dreadnought_engine" : isFrigate ? "frigate_engine" : isFighter ? "fighter_engine" : "enemy_engine", true);
    }

    // Shield. For Dreadnought boss: always starts visible unless broken.
    if (this.shieldHp > 0 && !this.shieldSuppressed) {
      const shieldFrame = isBomber
        ? `${SPRITE_FRAMES.bomberShieldPrefix}${SPRITE_FRAMES.bomberShieldStart}${SPRITE_FRAMES.bomberShieldSuffix}`
        : isDreadnought
          ? `${SPRITE_FRAMES.dreadnoughtShieldPrefix}${SPRITE_FRAMES.dreadnoughtShieldStart}${SPRITE_FRAMES.dreadnoughtShieldSuffix}`
          : isBattlecruiser
            ? `${SPRITE_FRAMES.battlecruiserShieldPrefix}${SPRITE_FRAMES.battlecruiserShieldStart}${SPRITE_FRAMES.battlecruiserShieldSuffix}`
            : isFrigate
              ? `${SPRITE_FRAMES.frigateShieldPrefix}${SPRITE_FRAMES.frigateShieldStart}${SPRITE_FRAMES.frigateShieldSuffix}`
              : isTorpedo
                ? `${SPRITE_FRAMES.torpedoShipShieldPrefix}${SPRITE_FRAMES.torpedoShipShieldStart}${SPRITE_FRAMES.torpedoShipShieldSuffix}`
                : isFighter
                  ? `${SPRITE_FRAMES.fighterShieldPrefix}${SPRITE_FRAMES.fighterShieldStart}${SPRITE_FRAMES.fighterShieldSuffix}`
                  : `${SPRITE_FRAMES.enemyShieldPrefix}${SPRITE_FRAMES.enemyShieldStart}${SPRITE_FRAMES.enemyShieldSuffix}`;
      // Bomber shield uses FX3 atlas.
      if (isBomber) {
        this.shieldFx.setTexture(ATLAS_KEYS.fx3, shieldFrame);
      } else {
        this.shieldFx.setTexture(ATLAS_KEYS.enemy, shieldFrame);
      }
      this.shieldFx.setVisible(true);
      this.shieldFx.setFlipY(true);
      this.shieldFx.play(
        isBomber
          ? "bomber_shield"
          : isDreadnought
            ? "dreadnought_shield"
            : isBattlecruiser
              ? "battlecruiser_shield"
              : isFrigate
                ? "frigate_shield"
                : isTorpedo
                  ? "torpedo_ship_shield"
                  : isFighter
                    ? "fighter_shield"
                    : "enemy_shield",
        true,
      );
    } else {
      this.shieldFx.setVisible(false);
      this.shieldFx.anims.stop();
    }

    // Weapon FX is off until firing. Bomber has no weapon.
    if (!isBomber) {
      const weaponFrame = isDreadnought
        ? `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}${SPRITE_FRAMES.dreadnoughtWeaponStart}${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`
        : isBattlecruiser
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
    } else {
      this.weaponFx.setVisible(false);
    }
    this.weaponFx.setFlipY(true);
    this.weaponFx.anims.stop();
    this.weaponFx.removeAllListeners();

    this.isFiring = false;
    this.nextFireAt = isBomber ? Number.MAX_SAFE_INTEGER : this.scene.time.now + Phaser.Math.Between(isDreadnought ? 400 : 850, isDreadnought ? 633 : 1400);

    // Standard enemies get a small amount of per-spawn movement variety.
    // Keep it lightweight: no pathfinding, just simple lateral modes.
    if (!isBomber && !isDreadnought) {
      if (isFighter) {
        this.aiMode = Phaser.Math.FloatBetween(0, 1) < 0.85 ? "hunt" : "zigzag";
      } else if (isTorpedo) {
        this.aiMode = Phaser.Math.FloatBetween(0, 1) < 0.70 ? "hunt" : "zigzag";
      } else if (this.kind === "scout") {
        this.aiMode = Phaser.Math.FloatBetween(0, 1) < 0.45 ? "zigzag" : "none";
      }

      if (this.aiMode === "zigzag") {
        this.aiZigzagDir = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
        this.aiZigzagSpeedX = isTorpedo ? Phaser.Math.Between(45, 85) : isFighter ? Phaser.Math.Between(70, 125) : Phaser.Math.Between(40, 80);
        this.aiZigzagNextToggleAt = this.scene.time.now + Phaser.Math.Between(280, 520);
      } else if (this.aiMode === "hunt") {
        this.aiHuntMaxSpeedX = isTorpedo ? Phaser.Math.Between(70, 120) : Phaser.Math.Between(90, 150);
        this.aiHuntK = isTorpedo ? Phaser.Math.FloatBetween(1.2, 1.8) : Phaser.Math.FloatBetween(1.6, 2.4);
        this.aiHuntDeadzonePx = Phaser.Math.Between(3, 6);
        const offsetRange = isTorpedo ? 18 : 12;
        this.aiHuntTargetOffsetX = Phaser.Math.Between(-offsetRange, offsetRange);
      }
    }

    // ── Depth (z-order) per enemy type ──
    const d = ENEMY_DEPTH[this.kind];
    this.setDepth(d.body);
    this.engineFx.setDepth(d.engine);
    this.engineFxL?.setDepth(d.engine);
    this.engineFxR?.setDepth(d.engine);
    this.shieldFx.setDepth(d.shield);
    this.weaponFx.setDepth(d.weapon);

    // IMPORTANT: This enemy is pooled and its FX sprites are separate GameObjects.
    // Sync their positions immediately on spawn to avoid a 1-frame "flicker" at the
    // previous pooled position (especially noticeable for shielded enemies).
    this.syncFxPositions();
  }

  kill() {
    this.setActive(false);
    this.setVisible(false);
    this.clearTint();

    this.isFiring = false;
    this.hp = 0;
    this.shieldHp = 0;
    this.torpedoSalvoDone = false;
    this.shieldSuppressed = false;
    this._spawnedWithShield = false;
    this._isMiniBoss = false;
    this.dreadnoughtState = "idle";
    this.bomberPhase = "approach";
    this.bomberSlowUntil = 0;
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

    if (this.kind === "bomber") {
      this.updateBomber(time);
      return;
    }

    if (this.kind === "dreadnought") {
      this.updateDreadnoughtBoss(time);
      return;
    }

    if (this._isMiniBoss) {
      this.updateMiniBoss(time);
      return;
    }

    const isAligning = this.updateStandardEnemyAi(time);

    if (!isAligning && !this.isFiring && this.enemyBullets && time >= this.nextFireAt) {
      // Torpedo Ship fires only once per spawn.
      if (this.kind !== "torpedo" || !this.torpedoSalvoDone) {
        if (this.shouldAlignBeforeFiring()) {
          this.beginPreFireAlign(time);
        } else {
          this.startFiringSequence();
        }
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

    if (this.shieldHp > 0 && remaining > 0 && !this.shieldSuppressed) {
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

    // Dreadnought shield is a round bubble: keep collision body in sync with shield state.
    this.syncDreadnoughtCollisionBody();

    return this.hp <= 0;
  }

  getCollisionDamage(): number {
    if (this.kind === "bomber") return BOMBER_COLLISION_DAMAGE;
    // Collision should hurt based on remaining enemy durability.
    // Shield only counts if it's currently active (not suppressed).
    const shield = this.shieldSuppressed ? 0 : this.shieldHp;
    return Math.max(1, this.hp + shield);
  }

  private syncFxPositions() {
    // Anchor engine FX close to the enemy body.
    // Engine frames are trimmed inside a larger "real" frame, so we position
    // relative to the enemy bounds (not engineFx displayHeight) to avoid detaching.
    const top = this.getTopCenter();
    // With origin (0.5, 1) this pins the bottom of the flame to the top of the ship.
    // Engine frames have a lot of transparent space (trim) below the visible flame,
    // so we push the sprite down to keep the visible pixels tight to the ship.

    // Use bomber-specific offset if needed
    const engineYOffset = this.kind === "bomber" ? BOMBER_ENGINE_OFFSET_Y : ENEMY_ENGINE_OFFSET_Y;
    const engineY = top.y + engineYOffset;

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
    } else if (this.kind === "dreadnought") {
      this.engineFx.setPosition(top.x, engineY + DREADNOUGHT_ENGINE_OFFSET_Y);
    } else {
      this.engineFx.setPosition(top.x, engineY);
    }

    const shieldOffsetX =
      this.kind === "bomber"
        ? BOMBER_SHIELD_OFFSET_X
        : this.kind === "dreadnought"
          ? DREADNOUGHT_SHIELD_OFFSET_X
          : this.kind === "battlecruiser"
            ? BATTLECRUISER_SHIELD_OFFSET_X
            : this.kind === "torpedo"
              ? TORPEDO_SHIP_SHIELD_OFFSET_X
              : this.kind === "frigate"
                ? FRIGATE_SHIELD_OFFSET_X
                : this.kind === "fighter"
                  ? FIGHTER_SHIELD_OFFSET_X
                  : SCOUT_SHIELD_OFFSET_X;
    const shieldOffsetY =
      this.kind === "bomber"
        ? BOMBER_SHIELD_OFFSET_Y
        : this.kind === "dreadnought"
          ? DREADNOUGHT_SHIELD_OFFSET_Y
          : this.kind === "battlecruiser"
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

  private syncDreadnoughtCollisionBody() {
    if (this.kind !== "dreadnought") return;
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    // When shield is active, use a circle body to match the bubble and absorb edge hits.
    if (this.shieldHp > 0 && !this.shieldSuppressed) {
      const w = this.width || 0;
      const h = this.height || 0;
      const baseRadius = Math.max(w, h) * 0.5;
      const radius = Math.max(1, Math.round(baseRadius * DREADNOUGHT_SHIELD_BODY_RADIUS_MULT));
      const offsetX = w * 0.5 - radius + DREADNOUGHT_SHIELD_OFFSET_X;
      const offsetY = h * 0.5 - radius + DREADNOUGHT_SHIELD_OFFSET_Y;
      body.setCircle(radius, offsetX, offsetY);
      body.updateFromGameObject();
      return;
    }

    // Shield down (suppressed) or broken: use a narrower hull rectangle to avoid early corner hits.
    body.setSize(this.width * DREADNOUGHT_HITBOX_W_MULT, this.height * DREADNOUGHT_HITBOX_H_MULT, true);
  }

  private breakShield() {
    this.shieldFx.setVisible(false);
    this.shieldFx.anims.stop();

    // Tiny feedback flash (use setTint instead of setTintFill to avoid solid color fill).
    this.setTint(0x7df9ff);
    // Use a real-time setTimeout so the flash clears even when scene time is paused.
    setTimeout(() => {
      if (!this.active) return;
      this.clearTint();
    }, 70);
  }

  /** Whether this enemy behaves as a mini-boss. */
  public get isMiniBoss() { return this._isMiniBoss; }

  /** Mark this enemy as a mini-boss (hover + drift like Dreadnought). */
  public setMiniBoss(value: boolean) {
    this._isMiniBoss = value;
  }

  private getStandardBoundsX(): { minX: number; maxX: number } {
    const halfW = (this.displayWidth || this.width) * 0.5;
    const minX = halfW + 4;
    const maxX = GAME_WIDTH - halfW - 4;
    return { minX, maxX };
  }

  private updateStandardEnemyAi(time: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return false;

    // Keep enemies readable: don't drift while weapon FX is playing.
    if (this.isFiring) {
      body.velocity.x = 0;
      return false;
    }

    if (this.preFireState === "aligning") {
      return this.updatePreFireAlign(time);
    }

    if (this.aiMode === "zigzag") {
      if (time >= this.aiZigzagNextToggleAt) {
        this.aiZigzagDir = this.aiZigzagDir === 1 ? -1 : 1;
        this.aiZigzagNextToggleAt = time + Phaser.Math.Between(260, 620);
      }
      body.velocity.x = this.aiZigzagDir * this.aiZigzagSpeedX;
    } else if (this.aiMode === "hunt") {
      const playerXRaw = this.scene.registry.get("playerX");
      const playerX = typeof playerXRaw === "number" ? playerXRaw : this.x;
      const { minX, maxX } = this.getStandardBoundsX();
      const targetX = Phaser.Math.Clamp(playerX + this.aiHuntTargetOffsetX, minX, maxX);
      const dx = targetX - this.x;
      if (Math.abs(dx) <= this.aiHuntDeadzonePx) {
        body.velocity.x = 0;
      } else {
        body.velocity.x = Phaser.Math.Clamp(dx * this.aiHuntK, -this.aiHuntMaxSpeedX, this.aiHuntMaxSpeedX);
      }
    } else {
      body.velocity.x = 0;
    }

    // Stay within bounds.
    const { minX, maxX } = this.getStandardBoundsX();
    if (this.x <= minX) {
      this.setX(minX);
      if (body.velocity.x < 0) body.velocity.x = Math.abs(body.velocity.x);
      if (this.aiMode === "zigzag") this.aiZigzagDir = 1;
    } else if (this.x >= maxX) {
      this.setX(maxX);
      if (body.velocity.x > 0) body.velocity.x = -Math.abs(body.velocity.x);
      if (this.aiMode === "zigzag") this.aiZigzagDir = -1;
    }

    return false;
  }

  private shouldAlignBeforeFiring(): boolean {
    if (this.preFireState !== "none") return false;
    // Only for standard enemies (not mini-boss / boss / bomber).
    if (this._isMiniBoss) return false;
    if (this.kind === "bomber" || this.kind === "dreadnought") return false;
    return this.kind === "fighter" || this.kind === "torpedo";
  }

  private beginPreFireAlign(time: number) {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    if (!this.enemyBullets) return;

    const playerXRaw = this.scene.registry.get("playerX");
    const playerX = typeof playerXRaw === "number" ? playerXRaw : this.x;
    const { minX, maxX } = this.getStandardBoundsX();

    const offsetRange = this.kind === "torpedo" ? 18 : 12;
    const targetX = Phaser.Math.Clamp(playerX + Phaser.Math.Between(-offsetRange, offsetRange), minX, maxX);

    this.preFireState = "aligning";
    this.preFireTargetX = targetX;
    this.preFireAlignSpeedX = this.kind === "torpedo" ? Phaser.Math.Between(120, 180) : Phaser.Math.Between(150, 220);
    this.preFireAlignEpsPx = Phaser.Math.Between(4, 8);
    this.preFireAlignUntil = time + Phaser.Math.Between(380, 650);

    const dx = targetX - this.x;
    body.velocity.x = Math.sign(dx || 1) * this.preFireAlignSpeedX;
  }

  private updatePreFireAlign(time: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return false;

    const { minX, maxX } = this.getStandardBoundsX();
    const dx = this.preFireTargetX - this.x;

    // Timeout safety: fire anyway even if alignment never converges.
    if (time >= this.preFireAlignUntil || Math.abs(dx) <= this.preFireAlignEpsPx) {
      this.setX(Phaser.Math.Clamp(this.preFireTargetX, minX, maxX));
      body.velocity.x = 0;
      this.preFireState = "none";
      this.startFiringSequence();
      return false;
    }

    body.velocity.x = Math.sign(dx) * this.preFireAlignSpeedX;

    // Bound safety (avoid drifting off-screen while aligning).
    if (this.x <= minX) {
      this.setX(minX);
      if (body.velocity.x < 0) body.velocity.x = 0;
    } else if (this.x >= maxX) {
      this.setX(maxX);
      if (body.velocity.x > 0) body.velocity.x = 0;
    }

    return true;
  }

  private updateBomber(time: number) {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    if (this.bomberPhase === "approach") {
      // Descend normally until reaching the approach threshold.
      if (this.y >= BOMBER_APPROACH_DISTANCE) {
        this.bomberPhase = "slow";
        this.bomberSlowUntil = time + BOMBER_SLOW_DURATION_MS;
        body.velocity.y = BOMBER_SLOW_SPEED;
        body.velocity.x = 0;
      }
    }

    if (this.bomberPhase === "slow") {
      body.velocity.y = BOMBER_SLOW_SPEED;
      if (time >= this.bomberSlowUntil) {
        // Lock onto current player position and charge.
        const playerXRaw = this.scene.registry.get("playerX");
        const playerYRaw = this.scene.registry.get("playerY");
        this.bomberTargetX = typeof playerXRaw === "number" ? playerXRaw : GAME_WIDTH * 0.5;
        this.bomberTargetY = typeof playerYRaw === "number" ? playerYRaw : GAME_HEIGHT * 0.8;
        this.bomberPhase = "charge";

        // Compute velocity towards target.
        const dx = this.bomberTargetX - this.x;
        const dy = this.bomberTargetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        body.velocity.x = (dx / dist) * BOMBER_CHARGE_SPEED;
        body.velocity.y = (dy / dist) * BOMBER_CHARGE_SPEED;
      }
    }

    // Kill if off-screen.
    if (this.y > GAME_HEIGHT + 48 || this.y < -48 || this.x < -48 || this.x > GAME_WIDTH + 48) {
      this.kill();
    }
  }

  private updateMiniBoss(time: number) {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    // Once at hover Y, stop descending and drift horizontally.
    if (this.y >= MINI_BOSS_HOVER_Y) {
      body.velocity.y = 0;
      this.setY(MINI_BOSS_HOVER_Y);

      const halfW = (this.displayWidth || this.width) * 0.5;
      const minX = halfW + 4;
      const maxX = GAME_WIDTH - halfW - 4;
      if (this.x <= minX) this.dreadnoughtDriftDir = 1;
      if (this.x >= maxX) this.dreadnoughtDriftDir = -1;
      body.velocity.x = this.dreadnoughtDriftDir * MINI_BOSS_DRIFT_SPEED;
    }

    // Fire normally.
    if (!this.isFiring && this.enemyBullets && time >= this.nextFireAt) {
      if (this.kind !== "torpedo" || !this.torpedoSalvoDone) {
        this.startFiringSequence();
      }
    }
  }

  private updateDreadnoughtBoss(time: number) {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    // Hover in the upper third.
    this.setY(DREADNOUGHT_HOVER_Y);
    body.velocity.y = 0;

    const minX = DREADNOUGHT_BOSS_EDGE_PADDING_X;
    const maxX = GAME_WIDTH - DREADNOUGHT_BOSS_EDGE_PADDING_X;

    if (this.dreadnoughtState === "idle") {
      // Slow drift while shield is up.
      if (this.shieldHp > 0 && !this.shieldSuppressed) {
        if (!this.shieldFx.visible) {
          this.shieldFx.setVisible(true);
          this.shieldFx.setFlipY(true);
          this.shieldFx.play("dreadnought_shield", true);
        }
      }

      if (this.x <= minX) this.dreadnoughtDriftDir = 1;
      if (this.x >= maxX) this.dreadnoughtDriftDir = -1;
      body.velocity.x = this.dreadnoughtDriftDir * DREADNOUGHT_IDLE_DRIFT_SPEED_X;

      if (!this.isFiring && this.enemyBullets && time >= this.nextFireAt) {
        this.startFiringSequence();
      }
      return;
    }

    if (this.dreadnoughtState === "aligning") {
      const playerXRaw = this.scene.registry.get("playerX");
      const playerX = typeof playerXRaw === "number" ? playerXRaw : this.x;
      const targetX = Phaser.Math.Clamp(playerX, minX, maxX);
      const dx = targetX - this.x;

      if (Math.abs(dx) <= DREADNOUGHT_ALIGN_EPS_PX) {
        this.setX(targetX);
        body.velocity.x = 0;
        this.beginDreadnoughtVolley();
        return;
      }

      body.velocity.x = Math.sign(dx) * DREADNOUGHT_ALIGN_SPEED_X;
      return;
    }

    // Firing: hold position.
    body.velocity.x = 0;
  }

  private beginDreadnoughtVolley() {
    if (!this.enemyBullets) return;

    const rayFrame = `${SPRITE_FRAMES.rayProjectilePrefix}${SPRITE_FRAMES.rayProjectileStart}${SPRITE_FRAMES.rayProjectileSuffix}`;
    const firedFrameKeys = new Set<string>();
    let playedDnShot = false;

    const playDnShotSfx = () => {
      if (playedDnShot) return;
      playedDnShot = true;
      if (!this.scene.registry.get("audioUnlocked")) return;
      try {
        this.scene.sound.play(AUDIO_KEYS.dnShot, { volume: 0.65 });
      } catch {
        // ignore
      }
    };

    const fireRay = (): boolean => {
      if (!this.active) return false;
      if (!this.enemyBullets) return false;

      const x = this.x;
      const y = this.y + (this.displayHeight || 24) * DREADNOUGHT_FIRE_Y_FACTOR;
      const body = this.body as Phaser.Physics.Arcade.Body | null;
      const shipSpeedY = body?.velocity?.y ?? 0;

      return this.spawnEnemyBulletAt(x, y, {
        animKey: "enemy_ray",
        frame: rayFrame,
        damage: DREADNOUGHT_RAY_DAMAGE,
        depth: DREADNOUGHT_RAY_DEPTH,
        // Keep spacing consistent regardless of any vertical movement.
        speedY: shipSpeedY + DREADNOUGHT_RAY_REL_SPEED_Y,
      });
    };

    this.dreadnoughtState = "firing";
    this.weaponFx.setVisible(true);
    this.weaponFx.removeAllListeners();

    // Sync 5 shots to specific weapon frames.
    this.weaponFx.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (_animation: Phaser.Animations.Animation, _frame: Phaser.Animations.AnimationFrame, _gameObject: Phaser.GameObjects.Sprite, frameKey: string) => {
        if (!this.active) return;
        if (!this.enemyBullets) return;

        if (frameKey === DREADNOUGHT_WEAPON_SFX_FRAME_28) {
          playDnShotSfx();
        }

        const shouldFire =
          frameKey === DREADNOUGHT_WEAPON_FIRE_FRAME_27 ||
          frameKey === DREADNOUGHT_WEAPON_FIRE_FRAME_34 ||
          frameKey === DREADNOUGHT_WEAPON_FIRE_FRAME_41 ||
          frameKey === DREADNOUGHT_WEAPON_FIRE_FRAME_48 ||
          frameKey === DREADNOUGHT_WEAPON_FIRE_FRAME_55;

        if (!shouldFire) return;
        if (firedFrameKeys.has(frameKey)) return;

        firedFrameKeys.add(frameKey);
        fireRay();
      },
    );

    this.weaponFx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.weaponFx.setVisible(false);
      this.weaponFx.removeAllListeners();

      // Shield back up after salvo (but keep remaining shield HP).
      this.shieldSuppressed = false;
      if (this.shieldHp > 0) {
        this.shieldFx.setVisible(true);
        this.shieldFx.setFlipY(true);
        this.shieldFx.play("dreadnought_shield", true);
      }
      this.syncDreadnoughtCollisionBody();

      this.isFiring = false;
      this.dreadnoughtState = "idle";
      this.nextFireAt = this.scene.time.now + Phaser.Math.Between(467, 733);
    });

    this.weaponFx.play("dreadnought_weapon", true);
  }

  private startFiringSequence() {
    if (!this.enemyBullets) return;

    this.isFiring = true;
    this.weaponFx.setVisible(true);
    this.weaponFx.removeAllListeners();

    if (this.kind === "dreadnought") {
      // Boss behavior:
      // - Shield down during the whole salvo (incl. alignment)
      // - Move to player X first, then play weapon animation and fire
      this.shieldSuppressed = true;
      this.shieldFx.setVisible(false);
      this.shieldFx.anims.stop();
      this.syncDreadnoughtCollisionBody();

      this.weaponFx.setVisible(false); // show only when actually firing
      this.dreadnoughtState = "aligning";
      return;
    }

    if (this.kind === "torpedo") {
      const firedShots = new Array(TORPEDO_SHIP_SALVO_SHOTS.length).fill(false);

      const playShotSfx = () => {
        if (!this.scene.registry.get("audioUnlocked")) return;
        try {
          this.scene.sound.play(AUDIO_KEYS.torpedoShot, { volume: 0.15 });
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
            if (fired) playShotSfx();
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

      const playShotSfx = () => {
        if (!this.scene.registry.get("audioUnlocked")) return;
        try {
          this.scene.sound.play(AUDIO_KEYS.bcShot, { volume: 0.55 });
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
        if (fired) playShotSfx();
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
              speedY: SCOUT_FIGHTER_FRIGATE_BULLET_SPEED,
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

      const playShotSfx = () => {
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
            const fired = this.spawnEnemyBulletAt(x + FIGHTER_BULLET_OFFSET_X, y, { speedY: SCOUT_FIGHTER_FRIGATE_BULLET_SPEED, depth: ENEMY_DEPTH.fighter.body });
            if (fired) playShotSfx();
            return;
          }

          if (frameKey === FIGHTER_WEAPON_FIRE_LEFT_FRAME && !firedLeft) {
            firedLeft = true;
            const fired = this.spawnEnemyBulletAt(x - FIGHTER_BULLET_OFFSET_X, y, { speedY: SCOUT_FIGHTER_FRIGATE_BULLET_SPEED, depth: ENEMY_DEPTH.fighter.body });
            if (fired) playShotSfx();
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
    const firedAny = this.spawnEnemyBulletAt(x, y, { speedY: SCOUT_FIGHTER_FRIGATE_BULLET_SPEED, depth: ENEMY_DEPTH.scout.body });

    if (firedAny && this.scene.registry.get("audioUnlocked")) {
      try {
        this.scene.sound.play(AUDIO_KEYS.laserScout, { volume: 0.35 });
      } catch {
        // ignore
      }
    }
  }
}
