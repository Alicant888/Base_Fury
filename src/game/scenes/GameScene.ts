import Phaser from "phaser";
import { BaseEnginePickup } from "../entities/BaseEnginePickup";
import { AutoCannonBullet } from "../entities/AutoCannonBullet";
import { AutoCannonsPickup } from "../entities/AutoCannonsPickup";
import { BigPulseEnginePickup } from "../entities/BigPulseEnginePickup";
import { Bullet } from "../entities/Bullet";
import { BurstEnginePickup } from "../entities/BurstEnginePickup";
import { Enemy } from "../entities/Enemy";
import { EnemyBullet } from "../entities/EnemyBullet";
import { FiringRatePickup } from "../entities/FiringRatePickup";
import { HealthPickup } from "../entities/HealthPickup";
import { SuperchargedEnginePickup } from "../entities/SuperchargedEnginePickup";
import { Player } from "../entities/Player";
import { ShieldPickup } from "../entities/ShieldPickup";
import { EnemySpawner } from "../systems/EnemySpawner";
import { ATLAS_KEYS, AUDIO_KEYS, BG_FRAMES, GAME_HEIGHT, GAME_WIDTH, SPRITE_FRAMES, UI_FRAMES } from "../config";

const BASE_FIRE_RATE_MS = 375; // ~2.67 shots/sec
const BASE_MOVE_SPEED_PX_PER_SEC = 280;
const BASE_MOVE_SPEED_MULTIPLIER = 0.8; // Main Ship is 20% slower by default.

const DEPTH_PLAYER = 5;
// Flames should render above the engine, but still below the shield.
const DEPTH_ENGINE_FLAMES = 6.5;
const DEPTH_ENGINE = 6;
const DEPTH_SHIELD = 7;
const DEPTH_WEAPON = 4.8; // under the ship, still under the shield.

// TUNE ENGINE FX OFFSETS HERE (Base Engine):
// - These values control where the engine sprite and the two flames appear relative to the player.
// - Adjust them to match your art perfectly.
const BASE_ENGINE_OFFSET_Y = 2;
const BASE_ENGINE_FLAME_OFFSET_Y = 17;
const BASE_ENGINE_FLAME_SPACING_X = 7;

// TUNE ENGINE FX OFFSETS HERE (Supercharged Engine):
// - Separate tuning from Base Engine.
const SUPERCHARGED_ENGINE_OFFSET_Y = 2;
const SUPERCHARGED_ENGINE_FLAME_OFFSET_Y = 18;
const SUPERCHARGED_ENGINE_FLAME_SPACING_X = 7;

// TUNE ENGINE FX OFFSETS HERE (Burst Engine):
const BURST_ENGINE_OFFSET_Y = 2;
const BURST_ENGINE_FLAME_OFFSET_Y = 16;
const BURST_ENGINE_FLAME_OFFSET_X = 0; // single flame (center)

// TUNE ENGINE FX OFFSETS HERE (Big Pulse Engine):
const BIG_PULSE_ENGINE_OFFSET_Y = 5;
const BIG_PULSE_ENGINE_FLAME_OFFSET_Y = 20;
const BIG_PULSE_ENGINE_FLAME_OFFSET_X = 0; // single flame (center)

// TUNE WEAPON OFFSETS HERE (Auto Cannons):
// - Weapon sprite position is relative to the player.
// - Bullet spawn is relative to the weapon sprite (muzzles).
const AUTO_CANNON_WEAPON_OFFSET_X = 0;
const AUTO_CANNON_WEAPON_OFFSET_Y = -2;
const AUTO_CANNON_BULLET_FROM_WEAPON_OFFSET_Y = -6;
const AUTO_CANNON_BULLET_FROM_WEAPON_OFFSET_X_L = -10;
const AUTO_CANNON_BULLET_FROM_WEAPON_OFFSET_X_R = 10;

// Auto Cannon firing is synced to the weapon animation frames:
// - Frame ...Auto Cannon-1 => left bullet
// - Frame ...Auto Cannon-2 => right bullet
const AUTO_CANNON_WEAPON_FIRE_LEFT_FRAME = `${SPRITE_FRAMES.autoCannonWeaponPrefix}1${SPRITE_FRAMES.autoCannonWeaponSuffix}`;
const AUTO_CANNON_WEAPON_FIRE_RIGHT_FRAME = `${SPRITE_FRAMES.autoCannonWeaponPrefix}2${SPRITE_FRAMES.autoCannonWeaponSuffix}`;

export class GameScene extends Phaser.Scene {
  private bgStar!: Phaser.GameObjects.TileSprite;
  private bgNebula!: Phaser.GameObjects.TileSprite;
  private bgDust!: Phaser.GameObjects.TileSprite;

  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private autoCannonBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private shieldPickups!: Phaser.Physics.Arcade.Group;
  private healthPickups!: Phaser.Physics.Arcade.Group;
  private firingRatePickups!: Phaser.Physics.Arcade.Group;
  private autoCannonsPickups!: Phaser.Physics.Arcade.Group;
  private baseEnginePickups!: Phaser.Physics.Arcade.Group;
  private superchargedEnginePickups!: Phaser.Physics.Arcade.Group;
  private burstEnginePickups!: Phaser.Physics.Arcade.Group;
  private bigPulseEnginePickups!: Phaser.Physics.Arcade.Group;
  private spawner!: EnemySpawner;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private draggingPointerId: number | null = null;
  private dragOffset = new Phaser.Math.Vector2();
  private dragTarget = new Phaser.Math.Vector2();
  private hasDragTarget = false;

  private hp = 5;
  private readonly maxHp = 5;
  private kills = 0;
  private isGameOver = false;
  private shieldHits = 0;
  private shieldFx?: Phaser.GameObjects.Sprite;
  private moveSpeedMultiplier = 1;

  private engineSprite?: Phaser.GameObjects.Image;
  private engineFlameL?: Phaser.GameObjects.Sprite;
  private engineFlameR?: Phaser.GameObjects.Sprite;
  private activeEngineType: "base" | "supercharged" | "burst" | "bigPulse" | null = null;
  private fireRateMultiplier = 1;

  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private fireEvent?: Phaser.Time.TimerEvent;
  private gameMusic?: Phaser.Sound.BaseSound;

  private activeWeaponType: "default" | "autoCannons" = "default";
  private weaponSprite?: Phaser.GameObjects.Sprite;

  constructor() {
    super("GameScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    // Reset run state (Scene instances are reused between starts).
    this.hp = this.maxHp;
    this.kills = 0;
    this.isGameOver = false;
    this.shieldHits = 0;
    this.fireRateMultiplier = 1;
    this.moveSpeedMultiplier = 1;
    this.draggingPointerId = null;
    this.hasDragTarget = false;
    this.activeEngineType = null;
    this.activeWeaponType = "default";

    this.destroyPlayerEngineFx();
    this.destroyPlayerWeaponFx();

    // Background (parallax).
    this.bgStar = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, BG_FRAMES.starfield).setOrigin(0);
    this.bgNebula = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, BG_FRAMES.nebula).setOrigin(0);
    this.bgDust = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, BG_FRAMES.dust).setOrigin(0);

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.ensureBulletTexture();
    this.ensureAnimations();

    // Pools.
    this.bullets = this.physics.add.group({
      classType: Bullet,
      maxSize: 80,
      runChildUpdate: true,
    });

    this.autoCannonBullets = this.physics.add.group({
      classType: AutoCannonBullet,
      maxSize: 120,
      runChildUpdate: true,
    });

    this.enemyBullets = this.physics.add.group({
      classType: EnemyBullet,
      maxSize: 60,
      runChildUpdate: true,
    });

    this.shieldPickups = this.physics.add.group({
      classType: ShieldPickup,
      maxSize: 20,
      runChildUpdate: true,
    });

    this.healthPickups = this.physics.add.group({
      classType: HealthPickup,
      maxSize: 12,
      runChildUpdate: true,
    });

    this.firingRatePickups = this.physics.add.group({
      classType: FiringRatePickup,
      maxSize: 12,
      runChildUpdate: true,
    });

    this.autoCannonsPickups = this.physics.add.group({
      classType: AutoCannonsPickup,
      maxSize: 12,
      runChildUpdate: true,
    });

    this.baseEnginePickups = this.physics.add.group({
      classType: BaseEnginePickup,
      maxSize: 12,
      runChildUpdate: true,
    });

    this.superchargedEnginePickups = this.physics.add.group({
      classType: SuperchargedEnginePickup,
      maxSize: 12,
      runChildUpdate: true,
    });

    this.burstEnginePickups = this.physics.add.group({
      classType: BurstEnginePickup,
      maxSize: 12,
      runChildUpdate: true,
    });

    this.bigPulseEnginePickups = this.physics.add.group({
      classType: BigPulseEnginePickup,
      maxSize: 12,
      runChildUpdate: true,
    });

    this.enemies = this.physics.add.group({
      classType: Enemy,
      maxSize: 50,
      runChildUpdate: true,
    });

    // Player.
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 80);
    this.player.setDepth(DEPTH_PLAYER);
    this.updatePlayerDamageAppearance();

    // Input.
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.setupPointerDrag();

    // Spawning.
    this.spawner = new EnemySpawner(this, this.enemies, this.enemyBullets);

    // Collisions.
    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      this.onBulletHitsEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.autoCannonBullets,
      this.enemies,
      this.onBulletHitsEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.onEnemyHitsPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.enemyBullets,
      this.onEnemyBulletHitsPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.shieldPickups,
      this.onShieldPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.healthPickups,
      this.onHealthPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.firingRatePickups,
      this.onFiringRatePickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.autoCannonsPickups,
      this.onAutoCannonsPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.baseEnginePickups,
      this.onBaseEnginePickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.superchargedEnginePickups,
      this.onSuperchargedEnginePickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.burstEnginePickups,
      this.onBurstEnginePickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.bigPulseEnginePickups,
      this.onBigPulseEnginePickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    // Auto-fire (weapon-dependent).
    this.configureWeaponFireEvents();

    // UI overlay.
    this.createUI();
    this.updateLivesUI();

    // Game music (starts after START click / audio unlock).
    if (this.registry.get("audioUnlocked")) {
      try {
        this.gameMusic = this.sound.add(AUDIO_KEYS.gameMusic, { loop: true, volume: 0.5 });
        this.gameMusic.play();
      } catch {
        // ignore
      }
    }

    // Cleanup on scene shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroyWeaponFireEvents();

      this.gameMusic?.stop();
      this.gameMusic?.destroy();
      this.gameMusic = undefined;

      this.shieldFx?.destroy();
      this.shieldFx = undefined;

      this.destroyPlayerEngineFx();
      this.destroyPlayerWeaponFx();
    });
  }

  update(time: number, delta: number) {
    if (this.isGameOver) return;

    const t = delta / 16.666;
    // Subtract to make the texture appear to move "down".
    this.bgStar.tilePositionY -= 0.5 * t;
    this.bgNebula.tilePositionY -= 1.1 * t;
    this.bgDust.tilePositionY -= 2.0 * t;

    // Pointer drag takes priority; keyboard works when not dragging.
    if (this.draggingPointerId !== null && this.hasDragTarget) {
      this.updateDragMovement(delta);
    } else {
      this.updateKeyboardMovement(delta);
    }

    this.spawner.update(time);

    if (this.shieldFx) {
      this.shieldFx.setPosition(this.player.x, this.player.y);
    }

    this.syncPlayerWeaponFx();
    this.syncPlayerEngineFx();
  }

  private playSfx(key: string, volume = 1) {
    if (!this.registry.get("audioUnlocked")) return;
    try {
      this.sound.play(key, { volume });
    } catch {
      // ignore
    }
  }

  private setupPointerDrag() {
    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (this.draggingPointerId !== null) return;
      this.draggingPointerId = pointer.id;
      this.dragOffset.set(pointer.x - this.player.x, pointer.y - this.player.y);

      this.dragTarget.set(this.player.x, this.player.y);
      this.hasDragTarget = true;
    };

    const onPointerUp = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.draggingPointerId) {
        this.draggingPointerId = null;
        this.hasDragTarget = false;
      }
    };

    const onPointerMove = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.draggingPointerId) return;
      if (!pointer.isDown) return;

      const halfW = this.player.displayWidth * 0.5;
      const halfH = this.player.displayHeight * 0.5;
      const tx = Phaser.Math.Clamp(pointer.x - this.dragOffset.x, halfW, GAME_WIDTH - halfW);
      const ty = Phaser.Math.Clamp(pointer.y - this.dragOffset.y, GAME_HEIGHT * 0.25, GAME_HEIGHT - halfH);
      this.dragTarget.set(tx, ty);
    };

    this.input.on(Phaser.Input.Events.POINTER_DOWN, onPointerDown);
    this.input.on(Phaser.Input.Events.POINTER_UP, onPointerUp);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, onPointerMove);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, onPointerDown);
      this.input.off(Phaser.Input.Events.POINTER_UP, onPointerUp);
      this.input.off(Phaser.Input.Events.POINTER_MOVE, onPointerMove);
    });
  }

  private updateKeyboardMovement(delta: number) {
    if (!this.cursors) return;

    const speed = this.getMoveSpeed(); // px/sec
    const dt = delta / 1000;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left?.isDown) dx -= 1;
    if (this.cursors.right?.isDown) dx += 1;
    if (this.cursors.up?.isDown) dy -= 1;
    if (this.cursors.down?.isDown) dy += 1;

    if (dx === 0 && dy === 0) return;

    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    this.player.x += dx * speed * dt;
    this.player.y += dy * speed * dt;
    this.player.clampToBounds();
  }

  private updateDragMovement(delta: number) {
    const dt = delta / 1000;
    const speed = this.getMoveSpeed();
    const maxDist = speed * dt;

    const dx = this.dragTarget.x - this.player.x;
    const dy = this.dragTarget.y - this.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.001) return;

    const t = Math.min(1, maxDist / dist);
    this.player.x += dx * t;
    this.player.y += dy * t;
    this.player.clampToBounds();
  }

  private getMoveSpeed() {
    return BASE_MOVE_SPEED_PX_PER_SEC * BASE_MOVE_SPEED_MULTIPLIER * this.moveSpeedMultiplier;
  }

  private fireSingleShot() {
    if (!this.player.active) return;

    const x = this.player.x;
    // Start from under the ship center.
    const y = this.player.y - this.player.displayHeight * 0.1;

    if (this.spawnBullet(x, y)) {
      this.playSfx(AUDIO_KEYS.laserShort, 0.35);
    }
  }

  private spawnBullet(x: number, y: number): boolean {
    const bullet = this.bullets.get(x, y) as Bullet | null;
    if (!bullet) return false;
    bullet.fire(x, y);
    return true;
  }

  private spawnAutoCannonBullet(x: number, y: number): boolean {
    const bullet = this.autoCannonBullets.get(x, y) as AutoCannonBullet | null;
    if (!bullet) return false;
    bullet.fire(x, y);
    return true;
  }

  private fireAutoCannonBarrel(side: "left" | "right") {
    if (this.isGameOver) return;
    if (!this.player.active) return;
    if (this.activeWeaponType !== "autoCannons") return;

    const wx = this.weaponSprite?.visible ? this.weaponSprite.x : this.player.x + AUTO_CANNON_WEAPON_OFFSET_X;
    const wy = this.weaponSprite?.visible ? this.weaponSprite.y : this.player.y + AUTO_CANNON_WEAPON_OFFSET_Y;

    const xOffset = side === "left" ? AUTO_CANNON_BULLET_FROM_WEAPON_OFFSET_X_L : AUTO_CANNON_BULLET_FROM_WEAPON_OFFSET_X_R;
    const x = wx + xOffset;
    const y = wy + AUTO_CANNON_BULLET_FROM_WEAPON_OFFSET_Y;

    const fired = this.spawnAutoCannonBullet(x, y);
    if (fired && side === "left") {
      this.playSfx(AUDIO_KEYS.laserShort, 0.3);
    }
  }

  private onWeaponAnimationUpdate(
    animation: Phaser.Animations.Animation,
    _frame: Phaser.Animations.AnimationFrame,
    _gameObject: Phaser.GameObjects.Sprite,
    frameKey: string,
  ) {
    if (this.isGameOver) return;
    if (!this.player.active) return;
    if (this.activeWeaponType !== "autoCannons") return;
    if (animation.key !== "auto_cannon_weapon") return;

    if (frameKey === AUTO_CANNON_WEAPON_FIRE_LEFT_FRAME) this.fireAutoCannonBarrel("left");
    else if (frameKey === AUTO_CANNON_WEAPON_FIRE_RIGHT_FRAME) this.fireAutoCannonBarrel("right");
  }

  private onBulletHitsEnemy(bulletObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const bullet = bulletObj as unknown as { active: boolean; kill: () => void };
    const enemy = enemyObj as Enemy;

    if (!bullet.active || !enemy.active) return;

    bullet.kill();
    const destroyed = enemy.onPlayerBulletHit();

    if (destroyed) {
      enemy.kill();

      this.spawnExplosion(enemy.x, enemy.y);
      this.playSfx(AUDIO_KEYS.explosionScout, 0.55);
      this.kills += 1;

      this.maybeSpawnPickup(enemy.x, enemy.y);
    }
  }

  private onEnemyHitsPlayer(_playerObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const enemy = enemyObj as Enemy;
    if (!enemy.active) return;

    enemy.kill();
    this.takeHit();
  }

  private onEnemyBulletHitsPlayer(_playerObj: Phaser.GameObjects.GameObject, bulletObj: Phaser.GameObjects.GameObject) {
    const bullet = bulletObj as EnemyBullet;
    if (!bullet.active) return;

    bullet.kill();
    this.takeHit();
  }

  private onShieldPickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as ShieldPickup;
    if (!pickup.active) return;

    pickup.kill();
    this.addShield(5);
  }

  private onHealthPickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as HealthPickup;
    if (!pickup.active) return;

    pickup.kill();
    this.hp = this.maxHp;
    this.updateLivesUI();
    this.updatePlayerDamageAppearance();
  }

  private onFiringRatePickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as FiringRatePickup;
    if (!pickup.active) return;

    pickup.kill();
    // +20% fire rate => delay * 0.8
    this.setFireRateMultiplier(0.8);
  }

  private onAutoCannonsPickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as AutoCannonsPickup;
    if (!pickup.active) return;

    pickup.kill();
    this.activateAutoCannons();
  }

  private onBaseEnginePickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as BaseEnginePickup;
    if (!pickup.active) return;

    pickup.kill();
    this.activateBaseEngine();
  }

  private onSuperchargedEnginePickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as SuperchargedEnginePickup;
    if (!pickup.active) return;

    pickup.kill();
    this.activateSuperchargedEngine();
  }

  private onBurstEnginePickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as BurstEnginePickup;
    if (!pickup.active) return;

    pickup.kill();
    this.activateBurstEngine();
  }

  private onBigPulseEnginePickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as BigPulseEnginePickup;
    if (!pickup.active) return;

    pickup.kill();
    this.activateBigPulseEngine();
  }

  private takeHit() {
    if (this.isGameOver) return;

    this.playSfx(AUDIO_KEYS.impactSmall, 0.45);

    if (this.shieldHits > 0) {
      this.shieldHits = Math.max(0, this.shieldHits - 1);
      this.flashShield();
      if (this.shieldHits === 0) {
        this.disableShield();
      }
      return;
    }

    this.hp = Math.max(0, this.hp - 1);
    this.updateLivesUI();
    this.updatePlayerDamageAppearance();
    this.flashPlayer();

    if (this.hp <= 0) {
      this.triggerGameOver();
    }
  }

  private flashPlayer() {
    this.player.setTintFill(0xffffff);
    this.player.setAlpha(1);

    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      duration: 60,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        this.player.clearTint();
        this.player.setAlpha(1);
      },
    });
  }

  private addShield(hits: number) {
    // No stacking: picking up a new shield just refreshes durability.
    this.shieldHits = hits;
    this.playSfx(AUDIO_KEYS.energyShield, 0.6);
    this.enableShield();
  }

  private enableShield() {
    if (!this.shieldFx) {
      this.shieldFx = this.add
        .sprite(
          this.player.x,
          this.player.y,
          ATLAS_KEYS.ship,
          `${SPRITE_FRAMES.playerShieldPrefix}${SPRITE_FRAMES.playerShieldStart}${SPRITE_FRAMES.playerShieldSuffix}`,
        )
        .setDepth(DEPTH_SHIELD);

      // Optional: make it feel more "energy-like".
      this.shieldFx.setBlendMode(Phaser.BlendModes.ADD);
    }

    this.shieldFx.setVisible(true);
    this.shieldFx.setDepth(DEPTH_SHIELD);
    this.shieldFx.play("player_shield", true);
  }

  private disableShield() {
    if (!this.shieldFx) return;
    this.shieldFx.setVisible(false);
    this.shieldFx.anims.stop();
  }

  private flashShield() {
    if (!this.shieldFx || !this.shieldFx.visible) return;

    this.shieldFx.setTintFill(0xffffff);
    this.tweens.add({
      targets: this.shieldFx,
      alpha: 0.25,
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.shieldFx?.clearTint();
        if (this.shieldFx) this.shieldFx.setAlpha(1);
      },
    });
  }

  private spawnShieldPickup(x: number, y: number) {
    const pickup = this.shieldPickups.get(x, y) as ShieldPickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private spawnHealthPickup(x: number, y: number) {
    const pickup = this.healthPickups.get(x, y) as HealthPickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private spawnFiringRatePickup(x: number, y: number) {
    const pickup = this.firingRatePickups.get(x, y) as FiringRatePickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private spawnAutoCannonsPickup(x: number, y: number) {
    const pickup = this.autoCannonsPickups.get(x, y) as AutoCannonsPickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private maybeSpawnPickup(x: number, y: number) {
    if (this.isGameOver) return;

    // Spawn at most one pickup to avoid clutter, using exact probabilities:
    // - Auto Cannons: 50%
    // - Base engine: 1%
    // - Supercharged engine: 1%
    // - Burst engine: 1%
    // - Big Pulse engine: 1%
    // - Health: 3%
    // - Firing rate: 4%
    // - Shield: 4%
    const r = Phaser.Math.FloatBetween(0, 1);
    if (r < 0.5) this.spawnAutoCannonsPickup(x, y);
    else if (r < 0.51) this.spawnBaseEnginePickup(x, y);
    else if (r < 0.52) this.spawnSuperchargedEnginePickup(x, y);
    else if (r < 0.53) this.spawnBurstEnginePickup(x, y);
    else if (r < 0.54) this.spawnBigPulseEnginePickup(x, y);
    else if (r < 0.57) this.spawnHealthPickup(x, y);
    else if (r < 0.61) this.spawnFiringRatePickup(x, y);
    else if (r < 0.65) this.spawnShieldPickup(x, y);
  }

  private triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Freeze gameplay systems.
    this.physics.world.pause();
    this.destroyWeaponFireEvents();

    this.gameMusic?.stop();
    this.gameMusic?.destroy();
    this.gameMusic = undefined;

    this.disableShield();

    const depth = 100;
    const padding = 18;
    const buttonGap = 14;

    // Interactive dim blocks clicks to underlying UI (e.g. back button).
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0).setDepth(depth).setInteractive();

    const panel = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, ATLAS_KEYS.ui, UI_FRAMES.panelWindow).setDepth(depth + 1);

    this.add
      .text(GAME_WIDTH / 2, panel.y - panel.displayHeight / 2 + 36, "GAME OVER", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);

    this.add
      .text(GAME_WIDTH / 2, panel.y + 10, `ENEMIES DESTROYED: ${this.kills}`, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
        padding: { x: 8, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);

    const btnY = GAME_HEIGHT - padding - 20; // ~button half-height
    const btnFrameW = 128;
    const leftX = GAME_WIDTH / 2 - buttonGap / 2 - btnFrameW / 2;
    const rightX = GAME_WIDTH / 2 + buttonGap / 2 + btnFrameW / 2;

    const playAgainBtn = this.add
      .image(leftX, btnY, ATLAS_KEYS.ui, UI_FRAMES.btnSmallNormal)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth + 1);

    const exitBtn = this.add
      .image(rightX, btnY, ATLAS_KEYS.ui, UI_FRAMES.btnSmallNormal)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth + 1);

    this.add
      .text(playAgainBtn.x, playAgainBtn.y, "PLAY AGAIN", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);

    this.add
      .text(exitBtn.x, exitBtn.y, "EXIT", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);

    const press = (btn: Phaser.GameObjects.Image) => btn.setFrame(UI_FRAMES.btnSmallPressed);
    const release = (btn: Phaser.GameObjects.Image) => btn.setFrame(UI_FRAMES.btnSmallNormal);

    playAgainBtn.on("pointerdown", () => press(playAgainBtn));
    playAgainBtn.on("pointerout", () => release(playAgainBtn));
    playAgainBtn.on("pointerup", () => {
      release(playAgainBtn);
      this.playSfx(AUDIO_KEYS.click, 0.7);
      dim.destroy();
      panel.destroy();
      this.scene.restart();
    });

    exitBtn.on("pointerdown", () => press(exitBtn));
    exitBtn.on("pointerout", () => release(exitBtn));
    exitBtn.on("pointerup", () => {
      release(exitBtn);
      this.playSfx(AUDIO_KEYS.click, 0.7);
      dim.destroy();
      panel.destroy();
      this.scene.start("MenuScene");
    });
  }

  private spawnExplosion(x: number, y: number) {
    const boom = this.add
      .sprite(x, y, ATLAS_KEYS.enemy, `${SPRITE_FRAMES.enemyDestructionPrefix}${SPRITE_FRAMES.enemyDestructionStart}${SPRITE_FRAMES.enemyDestructionSuffix}`)
      .setDepth(6);

    boom.play("enemy_explode");
    // Use negative scale instead of flipY to ensure vertical mirroring applies
    // consistently across trimmed atlas frames.
    boom.setScale(boom.scaleX, -Math.abs(boom.scaleY));
    boom.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => boom.destroy());
  }

  private ensureAnimations() {
    if (!this.anims.exists("enemy_explode")) {
      this.anims.create({
        key: "enemy_explode",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.enemyDestructionStart,
          end: SPRITE_FRAMES.enemyDestructionEnd,
          prefix: SPRITE_FRAMES.enemyDestructionPrefix,
          suffix: SPRITE_FRAMES.enemyDestructionSuffix,
        }),
        frameRate: 20,
        repeat: 0,
      });
    }

    if (!this.anims.exists("enemy_engine")) {
      this.anims.create({
        key: "enemy_engine",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.enemyEngineStart,
          end: SPRITE_FRAMES.enemyEngineEnd,
          prefix: SPRITE_FRAMES.enemyEnginePrefix,
          suffix: SPRITE_FRAMES.enemyEngineSuffix,
        }),
        frameRate: 14,
        repeat: -1,
      });
    }

    if (!this.anims.exists("enemy_weapon_flame")) {
      this.anims.create({
        key: "enemy_weapon_flame",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.enemyWeaponStart,
          end: SPRITE_FRAMES.enemyWeaponEnd,
          prefix: SPRITE_FRAMES.enemyWeaponPrefix,
          suffix: SPRITE_FRAMES.enemyWeaponSuffix,
        }),
        frameRate: 22,
        repeat: 0,
      });
    }

    if (!this.anims.exists("enemy_bullet")) {
      this.anims.create({
        key: "enemy_bullet",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.enemyProjectileStart,
          end: SPRITE_FRAMES.enemyProjectileEnd,
          prefix: SPRITE_FRAMES.enemyProjectilePrefix,
          suffix: SPRITE_FRAMES.enemyProjectileSuffix,
        }),
        frameRate: 16,
        repeat: -1,
      });
    }

    if (!this.anims.exists("enemy_shield")) {
      this.anims.create({
        key: "enemy_shield",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.enemyShieldStart,
          end: SPRITE_FRAMES.enemyShieldEnd,
          prefix: SPRITE_FRAMES.enemyShieldPrefix,
          suffix: SPRITE_FRAMES.enemyShieldSuffix,
        }),
        frameRate: 18,
        repeat: -1,
      });
    }

    this.createLoopAnimIfFrames(
      "shield_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.shieldPickupPrefix,
      SPRITE_FRAMES.shieldPickupStart,
      SPRITE_FRAMES.shieldPickupEnd,
      SPRITE_FRAMES.shieldPickupSuffix,
      14,
    );

    this.createLoopAnimIfFrames(
      "health_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.healthPickupPrefix,
      SPRITE_FRAMES.healthPickupStart,
      SPRITE_FRAMES.healthPickupEnd,
      SPRITE_FRAMES.healthPickupSuffix,
      14,
    );

    this.createLoopAnimIfFrames(
      "firing_rate_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.firingRatePickupPrefix,
      SPRITE_FRAMES.firingRatePickupStart,
      SPRITE_FRAMES.firingRatePickupEnd,
      SPRITE_FRAMES.firingRatePickupSuffix,
      14,
    );

    this.createLoopAnimIfFrames(
      "auto_cannons_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.autoCannonsPickupPrefix,
      SPRITE_FRAMES.autoCannonsPickupStart,
      SPRITE_FRAMES.autoCannonsPickupEnd,
      SPRITE_FRAMES.autoCannonsPickupSuffix,
      14,
    );

    this.createLoopAnimIfFrames(
      "base_engine_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.baseEnginePickupPrefix,
      SPRITE_FRAMES.baseEnginePickupStart,
      SPRITE_FRAMES.baseEnginePickupEnd,
      SPRITE_FRAMES.baseEnginePickupSuffix,
      14,
    );

    this.createLoopAnimIfFrames(
      "supercharged_engine_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.superchargedEnginePickupPrefix,
      SPRITE_FRAMES.superchargedEnginePickupStart,
      SPRITE_FRAMES.superchargedEnginePickupEnd,
      SPRITE_FRAMES.superchargedEnginePickupSuffix,
      14,
    );

    this.createLoopAnimIfFrames(
      "burst_engine_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.burstEnginePickupPrefix,
      SPRITE_FRAMES.burstEnginePickupStart,
      SPRITE_FRAMES.burstEnginePickupEnd,
      SPRITE_FRAMES.burstEnginePickupSuffix,
      14,
    );

    this.createLoopAnimIfFrames(
      "big_pulse_engine_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.bigPulseEnginePickupPrefix,
      SPRITE_FRAMES.bigPulseEnginePickupStart,
      SPRITE_FRAMES.bigPulseEnginePickupEnd,
      SPRITE_FRAMES.bigPulseEnginePickupSuffix,
      14,
    );

    this.createLoopAnimIfFrames(
      "base_engine_flame",
      ATLAS_KEYS.ship,
      SPRITE_FRAMES.baseEngineFlamePrefix,
      SPRITE_FRAMES.baseEngineFlameStart,
      SPRITE_FRAMES.baseEngineFlameEnd,
      SPRITE_FRAMES.baseEngineFlameSuffix,
      18,
    );

    this.createLoopAnimIfFrames(
      "supercharged_engine_flame",
      ATLAS_KEYS.ship,
      SPRITE_FRAMES.superchargedEngineFlamePrefix,
      SPRITE_FRAMES.superchargedEngineFlameStart,
      SPRITE_FRAMES.superchargedEngineFlameEnd,
      SPRITE_FRAMES.superchargedEngineFlameSuffix,
      18,
    );

    this.createLoopAnimIfFrames(
      "burst_engine_flame",
      ATLAS_KEYS.ship,
      SPRITE_FRAMES.burstEngineFlamePrefix,
      SPRITE_FRAMES.burstEngineFlameStart,
      SPRITE_FRAMES.burstEngineFlameEnd,
      SPRITE_FRAMES.burstEngineFlameSuffix,
      18,
    );

    this.createLoopAnimIfFrames(
      "big_pulse_engine_flame",
      ATLAS_KEYS.ship,
      SPRITE_FRAMES.bigPulseEngineFlamePrefix,
      SPRITE_FRAMES.bigPulseEngineFlameStart,
      SPRITE_FRAMES.bigPulseEngineFlameEnd,
      SPRITE_FRAMES.bigPulseEngineFlameSuffix,
      18,
    );

    this.createLoopAnimIfFrames(
      "auto_cannon_weapon",
      ATLAS_KEYS.ship,
      SPRITE_FRAMES.autoCannonWeaponPrefix,
      SPRITE_FRAMES.autoCannonWeaponStart,
      SPRITE_FRAMES.autoCannonWeaponEnd,
      SPRITE_FRAMES.autoCannonWeaponSuffix,
      14.4, // 18fps slowed by 20%
    );

    this.createLoopAnimIfFrames(
      "auto_cannon_bullet",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.autoCannonBulletPrefix,
      SPRITE_FRAMES.autoCannonBulletStart,
      SPRITE_FRAMES.autoCannonBulletEnd,
      SPRITE_FRAMES.autoCannonBulletSuffix,
      18,
    );

    if (!this.anims.exists("player_shield")) {
      this.anims.create({
        key: "player_shield",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.ship, {
          start: SPRITE_FRAMES.playerShieldStart,
          end: SPRITE_FRAMES.playerShieldEnd,
          prefix: SPRITE_FRAMES.playerShieldPrefix,
          suffix: SPRITE_FRAMES.playerShieldSuffix,
        }),
        frameRate: 18,
        repeat: -1,
      });
    }
  }

  private createLoopAnimIfFrames(
    key: string,
    atlasKey: string,
    prefix: string,
    start: number,
    end: number,
    suffix: string,
    frameRate: number,
  ) {
    if (this.anims.exists(key)) return;

    const tex = this.textures.get(atlasKey);
    const frames: Array<{ key: string; frame: string }> = [];
    for (let i = start; i <= end; i += 1) {
      const name = `${prefix}${i}${suffix}`;
      if (tex?.has(name)) frames.push({ key: atlasKey, frame: name });
    }

    // Avoid creating empty animations (can crash on play()) if frame names ever change.
    if (frames.length === 0) return;

    this.anims.create({
      key,
      frames: frames as unknown as Phaser.Types.Animations.AnimationFrame[],
      frameRate,
      repeat: -1,
    });
  }

  private ensureBulletTexture() {
    if (this.textures.exists("bullet")) return;

    const g = this.add.graphics();
    g.fillStyle(0x7df9ff, 1);
    g.fillRect(0, 0, 2, 8);
    g.generateTexture("bullet", 2, 8);
    g.destroy();
  }

  private createUI() {
    const uiDepth = 20;

    const back = this.add
      .image(10, 10, ATLAS_KEYS.ui, UI_FRAMES.iconBack)
      .setOrigin(0, 0)
      .setDepth(uiDepth)
      .setInteractive({ useHandCursor: true });

    back.on("pointerup", () => {
      this.playSfx(AUDIO_KEYS.click, 0.7);
      this.scene.start("MenuScene");
    });

    // Lives: 5 mini ship icons. One disappears per hit (HP loss).
    const startX = 48;
    const y = 14;
    const scale = 0.75;
    const spacing = 20;

    this.lifeIcons.forEach((i) => i.destroy());
    this.lifeIcons = [];

    for (let i = 0; i < this.maxHp; i += 1) {
      const icon = this.add
        .image(startX + i * spacing, y, ATLAS_KEYS.ship, SPRITE_FRAMES.playerShip)
        .setOrigin(0, 0)
        .setDepth(uiDepth)
        .setScale(scale);
      this.lifeIcons.push(icon);
    }
  }

  private updateLivesUI() {
    for (let i = 0; i < this.lifeIcons.length; i += 1) {
      this.lifeIcons[i].setVisible(i < this.hp);
    }
  }

  private updatePlayerDamageAppearance() {
    const hitsTaken = this.maxHp - this.hp;
    let frame: string = SPRITE_FRAMES.playerShip;
    if (hitsTaken >= 4) frame = SPRITE_FRAMES.playerShipVeryDamaged;
    else if (hitsTaken === 3) frame = SPRITE_FRAMES.playerShipDamaged;
    else if (hitsTaken === 2) frame = SPRITE_FRAMES.playerShipSlightDamage;
    else frame = SPRITE_FRAMES.playerShip; // 0-1

    this.player.setFrame(frame);
    // Keep hitbox roughly consistent with the current frame size.
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(this.player.width * 0.6, this.player.height * 0.6, true);
  }

  private destroyWeaponFireEvents() {
    this.fireEvent?.remove(false);
    this.fireEvent = undefined;
  }

  private configureWeaponFireEvents() {
    this.destroyWeaponFireEvents();
    if (this.isGameOver) return;

    // Base weapon (single shot) always stays active.
    this.fireEvent = this.time.addEvent({
      delay: this.getFireDelayMs(),
      loop: true,
      callback: () => this.fireSingleShot(),
    });
  }

  private getFireDelayMs() {
    return Math.round(BASE_FIRE_RATE_MS * this.fireRateMultiplier);
  }

  private setFireRateMultiplier(multiplier: number) {
    this.fireRateMultiplier = Phaser.Math.Clamp(multiplier, 0.2, 2);

    if (this.isGameOver) return;
    this.configureWeaponFireEvents();
  }

  private spawnBaseEnginePickup(x: number, y: number) {
    const pickup = this.baseEnginePickups.get(x, y) as BaseEnginePickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private spawnSuperchargedEnginePickup(x: number, y: number) {
    const pickup = this.superchargedEnginePickups.get(x, y) as SuperchargedEnginePickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private spawnBurstEnginePickup(x: number, y: number) {
    const pickup = this.burstEnginePickups.get(x, y) as BurstEnginePickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private spawnBigPulseEnginePickup(x: number, y: number) {
    const pickup = this.bigPulseEnginePickups.get(x, y) as BigPulseEnginePickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private activateAutoCannons() {
    this.activeWeaponType = "autoCannons";

    const weaponFrame = `${SPRITE_FRAMES.autoCannonWeaponPrefix}${SPRITE_FRAMES.autoCannonWeaponStart}${SPRITE_FRAMES.autoCannonWeaponSuffix}`;

    if (!this.weaponSprite) {
      this.weaponSprite = this.add
        .sprite(this.player.x, this.player.y, ATLAS_KEYS.ship, weaponFrame)
        .setDepth(DEPTH_WEAPON)
        .setScale(1);
    }

    this.weaponSprite.setVisible(true);
    this.weaponSprite.setDepth(DEPTH_WEAPON);
    this.weaponSprite.setFrame(weaponFrame);

    try {
      this.weaponSprite.play("auto_cannon_weapon", true);
    } catch {
      // ignore
    }

    // Sync bullet spawn to animation frames (frame -1 => left, frame -2 => right).
    this.weaponSprite.off(Phaser.Animations.Events.ANIMATION_UPDATE, this.onWeaponAnimationUpdate, this);
    this.weaponSprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.onWeaponAnimationUpdate, this);

    // Shield should render above the weapon.
    if (this.shieldFx) this.shieldFx.setDepth(DEPTH_SHIELD);

    this.syncPlayerWeaponFx();
    this.configureWeaponFireEvents();
  }

  private syncPlayerWeaponFx() {
    if (!this.weaponSprite) return;

    if (this.activeWeaponType !== "autoCannons") {
      this.weaponSprite.setVisible(false);
      return;
    }

    this.weaponSprite.setVisible(true);
    this.weaponSprite.setDepth(DEPTH_WEAPON);
    this.weaponSprite.setPosition(this.player.x + AUTO_CANNON_WEAPON_OFFSET_X, this.player.y + AUTO_CANNON_WEAPON_OFFSET_Y);
  }

  private destroyPlayerWeaponFx() {
    this.weaponSprite?.destroy();
    this.weaponSprite = undefined;
  }

  private activateBaseEngine() {
    // +25% move speed.
    this.moveSpeedMultiplier = 1.25;
    this.activeEngineType = "base";

    // Engine sprite above the ship.
    if (!this.engineSprite) {
      this.engineSprite = this.add
        .image(this.player.x, this.player.y, ATLAS_KEYS.ship, SPRITE_FRAMES.baseEngineSprite)
        .setDepth(DEPTH_ENGINE)
        .setScale(1);
    }
    this.engineSprite.setFrame(SPRITE_FRAMES.baseEngineSprite);
    this.engineSprite.setVisible(true);
    this.engineSprite.setDepth(DEPTH_ENGINE);

    // Two flames behind the engine (parallel).
    const flameFrame = `${SPRITE_FRAMES.baseEngineFlamePrefix}${SPRITE_FRAMES.baseEngineFlameStart}${SPRITE_FRAMES.baseEngineFlameSuffix}`;

    if (!this.engineFlameL) {
      this.engineFlameL = this.add.sprite(this.player.x, this.player.y, ATLAS_KEYS.ship, flameFrame).setDepth(DEPTH_ENGINE_FLAMES).setScale(1);
    }
    if (!this.engineFlameR) {
      this.engineFlameR = this.add.sprite(this.player.x, this.player.y, ATLAS_KEYS.ship, flameFrame).setDepth(DEPTH_ENGINE_FLAMES).setScale(1);
    }

    this.engineFlameL.setVisible(true);
    this.engineFlameR.setVisible(true);
    this.engineFlameL.setDepth(DEPTH_ENGINE_FLAMES);
    this.engineFlameR.setDepth(DEPTH_ENGINE_FLAMES);

    // Play flames if the animation exists (guarded in ensureAnimations).
    try {
      this.engineFlameL.play("base_engine_flame", true);
      this.engineFlameR.play("base_engine_flame", true);
    } catch {
      // ignore
    }

    // Shield should render above the engine.
    if (this.shieldFx) this.shieldFx.setDepth(DEPTH_SHIELD);

    this.syncPlayerEngineFx();
  }

  private activateSuperchargedEngine() {
    // +50% move speed.
    this.moveSpeedMultiplier = 1.5;
    this.activeEngineType = "supercharged";

    if (!this.engineSprite) {
      this.engineSprite = this.add
        .image(this.player.x, this.player.y, ATLAS_KEYS.ship, SPRITE_FRAMES.superchargedEngineSprite)
        .setDepth(DEPTH_ENGINE)
        .setScale(1);
    }
    this.engineSprite.setFrame(SPRITE_FRAMES.superchargedEngineSprite);
    this.engineSprite.setVisible(true);
    this.engineSprite.setDepth(DEPTH_ENGINE);

    const flameFrame = `${SPRITE_FRAMES.superchargedEngineFlamePrefix}${SPRITE_FRAMES.superchargedEngineFlameStart}${SPRITE_FRAMES.superchargedEngineFlameSuffix}`;

    if (!this.engineFlameL) {
      this.engineFlameL = this.add
        .sprite(this.player.x, this.player.y, ATLAS_KEYS.ship, flameFrame)
        .setDepth(DEPTH_ENGINE_FLAMES)
        .setScale(1);
    }
    if (!this.engineFlameR) {
      this.engineFlameR = this.add
        .sprite(this.player.x, this.player.y, ATLAS_KEYS.ship, flameFrame)
        .setDepth(DEPTH_ENGINE_FLAMES)
        .setScale(1);
    }

    this.engineFlameL.setVisible(true);
    this.engineFlameR.setVisible(true);
    this.engineFlameL.setDepth(DEPTH_ENGINE_FLAMES);
    this.engineFlameR.setDepth(DEPTH_ENGINE_FLAMES);

    try {
      this.engineFlameL.play("supercharged_engine_flame", true);
      this.engineFlameR.play("supercharged_engine_flame", true);
    } catch {
      // ignore
    }

    if (this.shieldFx) this.shieldFx.setDepth(DEPTH_SHIELD);
    this.syncPlayerEngineFx();
  }

  private activateBurstEngine() {
    // +75% move speed.
    this.moveSpeedMultiplier = 1.75;
    this.activeEngineType = "burst";

    if (!this.engineSprite) {
      this.engineSprite = this.add
        .image(this.player.x, this.player.y, ATLAS_KEYS.ship, SPRITE_FRAMES.burstEngineSprite)
        .setDepth(DEPTH_ENGINE)
        .setScale(1);
    }
    this.engineSprite.setFrame(SPRITE_FRAMES.burstEngineSprite);
    this.engineSprite.setVisible(true);
    this.engineSprite.setDepth(DEPTH_ENGINE);

    const flameFrame = `${SPRITE_FRAMES.burstEngineFlamePrefix}${SPRITE_FRAMES.burstEngineFlameStart}${SPRITE_FRAMES.burstEngineFlameSuffix}`;

    if (!this.engineFlameL) {
      this.engineFlameL = this.add.sprite(this.player.x, this.player.y, ATLAS_KEYS.ship, flameFrame).setDepth(DEPTH_ENGINE_FLAMES).setScale(1);
    }
    // Burst uses a single flame (centered). Hide the right flame if it exists from another engine.
    if (this.engineFlameR) {
      this.engineFlameR.setVisible(false);
      this.engineFlameR.anims.stop();
    }

    this.engineFlameL.setVisible(true);
    this.engineFlameL.setDepth(DEPTH_ENGINE_FLAMES);

    try {
      this.engineFlameL.play("burst_engine_flame", true);
    } catch {
      // ignore
    }

    if (this.shieldFx) this.shieldFx.setDepth(DEPTH_SHIELD);
    this.syncPlayerEngineFx();
  }

  private activateBigPulseEngine() {
    // +100% move speed.
    this.moveSpeedMultiplier = 2.0;
    this.activeEngineType = "bigPulse";

    if (!this.engineSprite) {
      this.engineSprite = this.add
        .image(this.player.x, this.player.y, ATLAS_KEYS.ship, SPRITE_FRAMES.bigPulseEngineSprite)
        .setDepth(DEPTH_ENGINE)
        .setScale(1);
    }
    this.engineSprite.setFrame(SPRITE_FRAMES.bigPulseEngineSprite);
    this.engineSprite.setVisible(true);
    this.engineSprite.setDepth(DEPTH_ENGINE);

    const flameFrame = `${SPRITE_FRAMES.bigPulseEngineFlamePrefix}${SPRITE_FRAMES.bigPulseEngineFlameStart}${SPRITE_FRAMES.bigPulseEngineFlameSuffix}`;

    if (!this.engineFlameL) {
      this.engineFlameL = this.add.sprite(this.player.x, this.player.y, ATLAS_KEYS.ship, flameFrame).setDepth(DEPTH_ENGINE_FLAMES).setScale(1);
    }
    // Big Pulse uses a single flame (centered). Hide the right flame if it exists from another engine.
    if (this.engineFlameR) {
      this.engineFlameR.setVisible(false);
      this.engineFlameR.anims.stop();
    }

    this.engineFlameL.setVisible(true);
    this.engineFlameL.setDepth(DEPTH_ENGINE_FLAMES);

    try {
      this.engineFlameL.play("big_pulse_engine_flame", true);
    } catch {
      // ignore
    }

    if (this.shieldFx) this.shieldFx.setDepth(DEPTH_SHIELD);
    this.syncPlayerEngineFx();
  }

  private syncPlayerEngineFx() {
    if (!this.engineSprite) return;
    if (!this.engineSprite.visible) return;

    const engineX = this.player.x;

    let engineOffsetY = BASE_ENGINE_OFFSET_Y;
    let flameOffsetY = BASE_ENGINE_FLAME_OFFSET_Y;
    let flameSpacingX = BASE_ENGINE_FLAME_SPACING_X;
    let flameOffsetX = 0;
    let isSingleFlame = false;

    if (this.activeEngineType === "supercharged") {
      engineOffsetY = SUPERCHARGED_ENGINE_OFFSET_Y;
      flameOffsetY = SUPERCHARGED_ENGINE_FLAME_OFFSET_Y;
      flameSpacingX = SUPERCHARGED_ENGINE_FLAME_SPACING_X;
    } else if (this.activeEngineType === "burst") {
      engineOffsetY = BURST_ENGINE_OFFSET_Y;
      flameOffsetY = BURST_ENGINE_FLAME_OFFSET_Y;
      flameOffsetX = BURST_ENGINE_FLAME_OFFSET_X;
      isSingleFlame = true;
    } else if (this.activeEngineType === "bigPulse") {
      engineOffsetY = BIG_PULSE_ENGINE_OFFSET_Y;
      flameOffsetY = BIG_PULSE_ENGINE_FLAME_OFFSET_Y;
      flameOffsetX = BIG_PULSE_ENGINE_FLAME_OFFSET_X;
      isSingleFlame = true;
    }

    const engineY = this.player.y + engineOffsetY;
    this.engineSprite.setPosition(engineX, engineY);

    if (this.engineFlameL) {
      const flameY = this.player.y + flameOffsetY;
      if (isSingleFlame) {
        this.engineFlameL.setPosition(engineX + flameOffsetX, flameY);
        if (this.engineFlameR) {
          this.engineFlameR.setVisible(false);
          this.engineFlameR.anims.stop();
        }
      } else if (this.engineFlameR) {
        this.engineFlameL.setPosition(engineX - flameSpacingX, flameY);
        this.engineFlameR.setPosition(engineX + flameSpacingX, flameY);
        this.engineFlameR.setVisible(true);
      }
    }
  }

  private destroyPlayerEngineFx() {
    this.engineSprite?.destroy();
    this.engineSprite = undefined;
    this.engineFlameL?.destroy();
    this.engineFlameL = undefined;
    this.engineFlameR?.destroy();
    this.engineFlameR = undefined;
    this.activeEngineType = null;
  }
}

