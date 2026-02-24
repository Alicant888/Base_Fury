import * as Phaser from "phaser";
import { BaseEnginePickup } from "../entities/BaseEnginePickup";
import { AutoCannonBullet } from "../entities/AutoCannonBullet";
import { AutoCannonsPickup } from "../entities/AutoCannonsPickup";
import { BigPulseEnginePickup } from "../entities/BigPulseEnginePickup";
import { BigSpaceGunPickup } from "../entities/BigSpaceGunPickup";
import { BigSpaceGunProjectile } from "../entities/BigSpaceGunProjectile";
import { Bullet } from "../entities/Bullet";
import { BurstEnginePickup } from "../entities/BurstEnginePickup";
import { Asteroid } from "../entities/Asteroid";
import { Enemy, type EnemyKind, getEnemyXp } from "../entities/Enemy";
import { EnemyBullet } from "../entities/EnemyBullet";
import { FiringRatePickup } from "../entities/FiringRatePickup";
import { FiringRate2Pickup } from "../entities/FiringRate2Pickup";
import { HealthPickup } from "../entities/HealthPickup";
import { RocketPickup } from "../entities/RocketPickup";
import { RocketProjectile } from "../entities/RocketProjectile";
import { ZapperPickup } from "../entities/ZapperPickup";
import { ZapperProjectile } from "../entities/ZapperProjectile";
import { SuperchargedEnginePickup } from "../entities/SuperchargedEnginePickup";
import { Player } from "../entities/Player";
import { ShieldPickup } from "../entities/ShieldPickup";
import { AsteroidSpawner } from "../systems/AsteroidSpawner";
import { EnemySpawner } from "../systems/EnemySpawner";
import { ATLAS_KEYS, AUDIO_KEYS, BG_FRAMES, GAME_HEIGHT, GAME_WIDTH, IMAGE_KEYS, SPRITE_FRAMES, UI_FRAMES, UI_SCALE } from "../config";
import { Button } from "../ui/Button";
import { getLevelConfig, TOTAL_LEVELS, type LevelConfig, type BgSet } from "../LevelConfig";
import { SaveManager, type SaveData } from "../systems/SaveManager";

const BASE_FIRE_RATE_MS = 375; // ~2.67 shots/sec
const BASE_MOVE_SPEED_PX_PER_SEC = 280;
const BASE_MOVE_SPEED_MULTIPLIER = 0.8; // Main Ship is 20% slower by default.

const DEPTH_PLAYER = 5;
// Flames should render above the engine, but still below the shield.
const DEPTH_ENGINE_FLAMES = 6.5;
const DEPTH_ENGINE = 6;
const DEPTH_SHIELD = 7;
const DEPTH_WEAPON = 4.8; // under the ship, still under the shield.

// TUNE BACKGROUND SCROLL SPEEDS HERE (px per ~60fps frame).
//
// Background sets (overlays; BCG is always the base layer):
// - Asteroids: L4 + L5 + L6 (reserved for some levels)
// - Planets: L0 (static) + L1 + L2 + L3 (currently active for testing)
// Background set is now driven by LevelConfig (per-level).
// The constant below is only a fallback; activeBgSet on the scene instance is authoritative.
const DEFAULT_BG_SET: BgSet = "asteroids";

// Base background (always visible).
const BG_SCROLL_SPEED_BCG = 0.015;

// Asteroids set (reserved for certain levels).
const ASTEROIDS_SCROLL_SPEED_L4 = 0.3;
const ASTEROIDS_SCROLL_SPEED_L5 = 0.6;
const ASTEROIDS_SCROLL_SPEED_L6 = 1.2;


const PLANETS_SCROLL_SPEED_L0 = 0.02;
const PLANETS_SCROLL_SPEED_L1 = 0.03;
const PLANETS_SCROLL_SPEED_L2 = 0.04;
const PLANETS_SCROLL_SPEED_L3 = 0.06;

const BG_OVERLAY_LAYERS = {
  asteroids: [
    { frame: BG_FRAMES.l4, speed: ASTEROIDS_SCROLL_SPEED_L4 },
    { frame: BG_FRAMES.l5, speed: ASTEROIDS_SCROLL_SPEED_L5 },
    { frame: BG_FRAMES.l6, speed: ASTEROIDS_SCROLL_SPEED_L6 },
  ],
  planets: [
    { frame: BG_FRAMES.l0, speed: PLANETS_SCROLL_SPEED_L0 },
    { frame: BG_FRAMES.l1, speed: PLANETS_SCROLL_SPEED_L1 },
    { frame: BG_FRAMES.l2, speed: PLANETS_SCROLL_SPEED_L2 },
    { frame: BG_FRAMES.l3, speed: PLANETS_SCROLL_SPEED_L3 },
  ],
} as const;

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

// TUNE WEAPON OFFSETS HERE (Rockets):
// - Two weapon sprites: left (even frames) and right (odd frames).
// - Two projectiles spawn in parallel.
const ROCKET_DAMAGE_MULTIPLIER = 3;
// Rocket fire rate is controlled by the weapon animation speed (see ROCKET_WEAPON_FIRE_FRAME).
const ROCKET_WEAPON_OFFSET_X_L = -12;
const ROCKET_WEAPON_OFFSET_Y_L = -6;
const ROCKET_WEAPON_OFFSET_X_R = 12;
const ROCKET_WEAPON_OFFSET_Y_R = -6;
const ROCKET_PROJECTILE_FROM_WEAPON_OFFSET_X = 0;
const ROCKET_PROJECTILE_FROM_WEAPON_OFFSET_Y = -8;
// Reduce distance between launched rockets by 20% (spawn points move toward center).
const ROCKET_PROJECTILE_SPREAD_MULTIPLIER = 0.7;
// Rocket firing is synced to the Rockets weapon animation:
// - Frame ...Rockets-4 => fire a pair (left+right) in parallel
const ROCKET_WEAPON_FIRE_FRAME = `${SPRITE_FRAMES.rocketsWeaponPrefix}4${SPRITE_FRAMES.rocketsWeaponSuffix}`;

// TUNE WEAPON OFFSETS HERE (Zapper):
// - Weapon sprite position is relative to the player.
// - Projectile spawn is relative to the weapon sprite (muzzles).
const ZAPPER_DAMAGE = 4;
const ZAPPER_WEAPON_OFFSET_X = 0;
const ZAPPER_WEAPON_OFFSET_Y = -2;
const ZAPPER_PROJECTILE_FROM_WEAPON_OFFSET_Y = -6;
const ZAPPER_PROJECTILE_FROM_WEAPON_OFFSET_X_L = -7;
const ZAPPER_PROJECTILE_FROM_WEAPON_OFFSET_X_R = 7;

// Zapper firing is synced to the weapon animation frames:
// - Frame ...Zapper-7 => fire both projectiles (left + right) simultaneously
const ZAPPER_WEAPON_FIRE_FRAME = `${SPRITE_FRAMES.zapperWeaponPrefix}7${SPRITE_FRAMES.zapperWeaponSuffix}`;

// TUNE WEAPON OFFSETS HERE (Big Space Gun):
const BIG_SPACE_GUN_DAMAGE = 8;
const BIG_SPACE_GUN_WEAPON_OFFSET_X = 0;
const BIG_SPACE_GUN_WEAPON_OFFSET_Y = -2;
const BIG_SPACE_GUN_PROJECTILE_FROM_WEAPON_OFFSET_X = 0;
const BIG_SPACE_GUN_PROJECTILE_FROM_WEAPON_OFFSET_Y = -10;
// Fire a single centered projectile on this weapon frame:
const BIG_SPACE_GUN_WEAPON_FIRE_FRAME = `${SPRITE_FRAMES.bigSpaceGunWeaponPrefix}7${SPRITE_FRAMES.bigSpaceGunWeaponSuffix}`;

// Pickup drop chances are now in LevelConfig (per-level).
// Fallback defaults are only used if levelConfig is somehow missing.
const DEFAULT_DROPS = {
  bigSpaceGun: 0.01, zapper: 0.01, rocket: 0.01, autoCannons: 0.01,
  baseEngine: 0.01, superchargedEngine: 0.01, burstEngine: 0.01, bigPulseEngine: 0.01,
  health: 0.03, firingRate: 0.05, shield: 0.20, firingRate2: 0.04,
} as const;

export class GameScene extends Phaser.Scene {
  private bgStar!: Phaser.GameObjects.TileSprite;
  private bgNebula!: Phaser.GameObjects.TileSprite;
  private bgDust!: Phaser.GameObjects.TileSprite;
  private bgL6!: Phaser.GameObjects.TileSprite;
  private bgL3!: Phaser.GameObjects.TileSprite;
  private bgOverlayMaxScrollY: [number, number, number, number] = [0, 0, 0, 0];

  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private autoCannonBullets!: Phaser.Physics.Arcade.Group;
  private rocketProjectiles!: Phaser.Physics.Arcade.Group;
  private zapperProjectiles!: Phaser.Physics.Arcade.Group;
  private bigSpaceGunProjectiles!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private asteroids!: Phaser.Physics.Arcade.Group;
  private shieldPickups!: Phaser.Physics.Arcade.Group;
  private healthPickups!: Phaser.Physics.Arcade.Group;
  private firingRatePickups!: Phaser.Physics.Arcade.Group;
  private firingRate2Pickups!: Phaser.Physics.Arcade.Group;
  private autoCannonsPickups!: Phaser.Physics.Arcade.Group;
  private rocketPickups!: Phaser.Physics.Arcade.Group;
  private zapperPickups!: Phaser.Physics.Arcade.Group;
  private bigSpaceGunPickups!: Phaser.Physics.Arcade.Group;
  private baseEnginePickups!: Phaser.Physics.Arcade.Group;
  private superchargedEnginePickups!: Phaser.Physics.Arcade.Group;
  private burstEnginePickups!: Phaser.Physics.Arcade.Group;
  private bigPulseEnginePickups!: Phaser.Physics.Arcade.Group;
  private spawner!: EnemySpawner;
  private asteroidSpawner!: AsteroidSpawner;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private draggingPointerId: number | null = null;
  private dragOffset = new Phaser.Math.Vector2();
  private dragTarget = new Phaser.Math.Vector2();
  private hasDragTarget = false;

  private hp = 5;
  private readonly maxHp = 5;
  private kills = 0;
  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private menuBtn!: Phaser.GameObjects.Container;
  private pauseBtn!: Phaser.GameObjects.Container;
  private bottomUIButtons: Phaser.GameObjects.GameObject[] = [];
  private isMusicOn = true;
  private isGameOver = false;
  private shieldHits = 0;
  private shieldFx?: Phaser.GameObjects.Sprite;
  private moveSpeedMultiplier = 1;

  private engineSprite?: Phaser.GameObjects.Image;
  private engineFlameL?: Phaser.GameObjects.Sprite;
  private engineFlameR?: Phaser.GameObjects.Sprite;
  private activeEngineType: "base" | "supercharged" | "burst" | "bigPulse" | null = null;
  private fireRateMultiplier = 1;
  /** Per-weapon animation speed multipliers (stacks after fire-rate cap). */
  private weaponBonusRateAutoCannons = 1;
  private weaponBonusRateRockets = 1;
  private weaponBonusRateZapper = 1;
  private weaponBonusRateBigSpaceGun = 1;

  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private fireEvent?: Phaser.Time.TimerEvent;
  private gameMusic?: Phaser.Sound.BaseSound;
  private musicTracks: string[] = [];
  private currentTrackIndex = 0;
  private pauseUIContainer?: Phaser.GameObjects.Container;

  private hasAutoCannons = false;
  private hasRockets = false;
  private hasZapper = false;
  private hasBigSpaceGun = false;
  private autoCannonWeaponSprite?: Phaser.GameObjects.Sprite;
  private rocketWeaponL?: Phaser.GameObjects.Sprite;
  private rocketWeaponR?: Phaser.GameObjects.Sprite;
  private zapperWeaponSprite?: Phaser.GameObjects.Sprite;
  private bigSpaceGunWeaponSprite?: Phaser.GameObjects.Sprite;
  private lastRocketShotAt = 0;

  private isPausedByInput = false;
  private pausedText?: Phaser.GameObjects.Text;

  // --- Level system ---
  private currentLevel = 1;
  private levelConfig!: LevelConfig;
  private activeBgSet: BgSet = "none";
  private isLevelComplete = false;
  private distanceTraveled = 0;
  private levelProgressText?: Phaser.GameObjects.Text;

  constructor() {
    super("GameScene");
  }

  /** Phaser init callback – receives scene data (e.g. { level: 3, save: SaveData }). */
  init(data?: { level?: number; save?: SaveData; showMenu?: boolean }) {
    this.currentLevel = data?.level ?? 1;
    this.levelConfig = getLevelConfig(this.currentLevel);
    this.activeBgSet = this.levelConfig.bgSet;

    // Track whether to open the main menu overlay immediately.
    this._openMenuOnStart = data?.showMenu === true;
    // Show play.png (not resume.png) when it's a fresh game with no save.
    this._showPlayBtn = data?.showMenu === true && !data?.save;

    // Restore weapons / engine from save data if provided.
    if (data?.save) {
      this._pendingSave = data.save;
    } else {
      this._pendingSave = undefined;
    }
  }

  /** Temporary storage for save data to apply in create(). */
  private _pendingSave?: SaveData;
  /** When true: open pause menu immediately on create() (launched from MenuScene). */
  private _openMenuOnStart = false;
  /** When true: show play.png instead of resume.png in the pause (main) menu. */
  private _showPlayBtn = false;
  /** When true: boss phase triggered by bossAfterDistance mechanic. */
  private _bossPhaseActive = false;

  // --- Purchased shop packs (loaded fresh each scene) ---
  private packXp = false;
  private packBase = false;
  private packMedium = false;
  private packBig = false;
  private packMaxi = false;

  create() {
    this.scale.scaleMode = Phaser.Scale.FIT;
    this.scale.resize(GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBackgroundColor("#000000");

    // Reset run state (Scene instances are reused between starts).
    this.hp = this.maxHp;
    this.kills = 0;
    this.score = 0;
    this.isGameOver = false;
    this.isLevelComplete = false;
    this.distanceTraveled = 0;
    this.shieldHits = 0;
    this.fireRateMultiplier = 1;
    this.weaponBonusRateAutoCannons = 1;
    this.weaponBonusRateRockets = 1;
    this.weaponBonusRateZapper = 1;
    this.weaponBonusRateBigSpaceGun = 1;
    this.moveSpeedMultiplier = 1;
    this.draggingPointerId = null;
    this.hasDragTarget = false;
    this.activeEngineType = null;
    this.hasAutoCannons = false;
    this.hasRockets = false;
    this.hasZapper = false;
    this.hasBigSpaceGun = false;
    this._bossPhaseActive = false;

    // Reset pause state
    this.isPausedByInput = false;
    this.pauseUIContainer = undefined;
    this.bottomUIButtons = [];
    this.physics.resume();
    this.anims.resumeAll();
    this.tweens.resumeAll();
    this.time.paused = false;

    // Music tracks.
    this.musicTracks = [
      AUDIO_KEYS.music1,
      AUDIO_KEYS.music2,
      AUDIO_KEYS.music3,
      AUDIO_KEYS.music4,
      AUDIO_KEYS.music5,
      AUDIO_KEYS.music6,
      AUDIO_KEYS.music7,
      AUDIO_KEYS.music8,
    ];
    // Start on a random track each level.
    this.currentTrackIndex = Phaser.Math.Between(0, this.musicTracks.length - 1);

    this.destroyPlayerEngineFx();
    this.destroyPlayerWeaponFx();

    // Background (parallax).
    // Base layer: always BCG.
    // Keep all background layers below gameplay objects (bullets, enemies, player, etc).
    this.bgDust = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, BG_FRAMES.bcg).setOrigin(0).setDepth(-10);

    // Overlay set depends on the current level (none / asteroids / planets).
    const useBgOverlays = this.activeBgSet !== "none";
    const bgSetKey = useBgOverlays ? this.activeBgSet as ("asteroids" | "planets") : "asteroids";
    const overlays = BG_OVERLAY_LAYERS[bgSetKey];
    this.bgNebula = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, overlays[0].frame).setOrigin(0).setDepth(-9);
    this.bgStar = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, overlays[1].frame).setOrigin(0).setDepth(-8);
    this.bgL6 = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, overlays[2].frame).setOrigin(0).setDepth(-7);

    const topLayer = overlays[3];
    const topLayerFrame = topLayer ? topLayer.frame : overlays[2].frame;
    this.bgL3 = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, topLayerFrame).setOrigin(0).setDepth(-6);
    this.bgL3.setVisible(useBgOverlays && !!topLayer);

    // Hide overlay layers when bgSet is "none" (early levels: only BCG visible).
    if (!useBgOverlays) {
      this.bgNebula.setVisible(false);
      this.bgStar.setVisible(false);
      this.bgL6.setVisible(false);
      this.bgL3.setVisible(false);
    }

    // For Planets: scroll only once (no looping). Clamp to the largest offset that still
    // shows a continuous portion of the texture without wrapping within the viewport.
    const maxScrollForFrame = (frameName: string): number => {
      const frame = this.textures.getFrame(ATLAS_KEYS.bg, frameName);
      const h = frame?.height ?? GAME_HEIGHT;
      return Math.max(0, h - GAME_HEIGHT);
    };
    this.bgOverlayMaxScrollY = [
      maxScrollForFrame(overlays[0].frame),
      maxScrollForFrame(overlays[1].frame),
      maxScrollForFrame(overlays[2].frame),
      topLayer ? maxScrollForFrame(topLayer.frame) : 0,
    ];

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

    this.rocketProjectiles = this.physics.add.group({
      classType: RocketProjectile,
      maxSize: 80,
      runChildUpdate: true,
    });

    this.zapperProjectiles = this.physics.add.group({
      classType: ZapperProjectile,
      maxSize: 120,
      runChildUpdate: true,
    });

    this.bigSpaceGunProjectiles = this.physics.add.group({
      classType: BigSpaceGunProjectile,
      maxSize: 80,
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

    this.firingRate2Pickups = this.physics.add.group({
      classType: FiringRate2Pickup,
      maxSize: 12,
      runChildUpdate: true,
    });

    this.autoCannonsPickups = this.physics.add.group({
      classType: AutoCannonsPickup,
      maxSize: 12,
      runChildUpdate: true,
    });

    this.rocketPickups = this.physics.add.group({
      classType: RocketPickup,
      maxSize: 12,
      runChildUpdate: true,
    });

    this.zapperPickups = this.physics.add.group({
      classType: ZapperPickup,
      maxSize: 12,
      runChildUpdate: true,
    });

    this.bigSpaceGunPickups = this.physics.add.group({
      classType: BigSpaceGunPickup,
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

    this.asteroids = this.physics.add.group({
      classType: Asteroid,
      maxSize: 30,
      runChildUpdate: true,
    });

    // Player.
    // Start higher (20% margin from bottom = 80% of height).
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.8);
    this.player.setDepth(DEPTH_PLAYER);
    this.updatePlayerDamageAppearance();

    // Input.
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.setupPointerDrag();

    // Spawning.
    this.spawner = new EnemySpawner(this, this.enemies, this.enemyBullets);
    this.spawner.setLevelConfig(this.levelConfig);
    this.asteroidSpawner = new AsteroidSpawner(this, this.asteroids);
    this.asteroidSpawner.setMultiplier(this.levelConfig.asteroidMultiplier);

    // Reset distance counter for new level.
    this.distanceTraveled = 0;

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
      this.rocketProjectiles,
      this.enemies,
      this.onRocketHitsEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.zapperProjectiles,
      this.enemies,
      this.onZapperHitsEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.bigSpaceGunProjectiles,
      this.enemies,
      this.onBigSpaceGunHitsEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    // Asteroids (FX atlas) are hazards.
    this.physics.add.overlap(
      this.bullets,
      this.asteroids,
      this.onBulletHitsAsteroid as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.autoCannonBullets,
      this.asteroids,
      this.onBulletHitsAsteroid as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.rocketProjectiles,
      this.asteroids,
      this.onRocketHitsAsteroid as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.zapperProjectiles,
      this.asteroids,
      this.onZapperHitsAsteroid as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.bigSpaceGunProjectiles,
      this.asteroids,
      this.onBigSpaceGunHitsAsteroid as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.asteroids,
      this.onAsteroidHitsPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );
    // 20% of asteroids can damage non-boss enemies.
    this.physics.add.overlap(
      this.asteroids,
      this.enemies,
      this.onAsteroidHitsEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
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
      this.firingRate2Pickups,
      this.onFiringRate2Pickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
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
      this.rocketPickups,
      this.onRocketPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.zapperPickups,
      this.onZapperPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.bigSpaceGunPickups,
      this.onBigSpaceGunPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
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

    // ----- Level UI -----
    // Level number + distance progress (bottom-right corner, 10px padding).
    this.levelProgressText = this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 10, "", {
      fontFamily: "Orbitron",
      fontSize: "24px",
      color: "#00FF9C",
      stroke: "#000000",
      strokeThickness: 3,
      align: "right",
    }).setOrigin(1, 1).setDepth(50).setScrollFactor(0);

    // Set initial level text (boss levels show only "LV X BOSS").
    if (this.levelConfig.isBossLevel) {
      this.levelProgressText.setText(`LV ${this.currentLevel}  BOSS`);
    } else {
      this.levelProgressText.setText(`LV ${this.currentLevel}  0%`);
    }

    // ----- Restore saved weapons / engine -----
    if (this._pendingSave) {
      if (this._pendingSave.hasAutoCannons) this.activateAutoCannons();
      if (this._pendingSave.hasRockets) this.activateRockets();
      if (this._pendingSave.hasZapper) this.activateZapper();
      if (this._pendingSave.hasBigSpaceGun) this.activateBigSpaceGun();
      switch (this._pendingSave.activeEngineType) {
        case "base": this.activateBaseEngine(); break;
        case "supercharged": this.activateSuperchargedEngine(); break;
        case "burst": this.activateBurstEngine(); break;
        case "bigPulse": this.activateBigPulseEngine(); break;
      }
      // Restore XP from previous level.
      if (this._pendingSave.score > 0) {
        this.score = this._pendingSave.score;
        this.scoreText.setText(`${this.score}`);
      }
      // Restore fire-rate multipliers.
      if (this._pendingSave.fireRateMultiplier < 1) {
        this.fireRateMultiplier = this._pendingSave.fireRateMultiplier;
        this.setFireRateMultiplier(this.fireRateMultiplier);
      }
      this.weaponBonusRateAutoCannons = this._pendingSave.weaponBonusRateAutoCannons;
      this.weaponBonusRateRockets = this._pendingSave.weaponBonusRateRockets;
      this.weaponBonusRateZapper = this._pendingSave.weaponBonusRateZapper;
      this.weaponBonusRateBigSpaceGun = this._pendingSave.weaponBonusRateBigSpaceGun;
      this.applyWeaponBonusRate();
      this._pendingSave = undefined;
    }

    // Load purchased packs from persistent save (always fresh, independent of level save).
    {
      const sv = SaveManager.load();
      this.packXp   = sv.packXp;
      this.packBase = sv.packBase;
      this.packMedium = sv.packMedium;
      this.packBig  = sv.packBig;
      this.packMaxi = sv.packMaxi;
    }
    if (this.registry.get("audioUnlocked") && this.isMusicOn) {
      try {
        this.playMusicTrack(this.currentTrackIndex);
      } catch {
        // ignore
      }
    }

    // Handle resizing (FIT simulation).
    const resize = (gameSize: Phaser.Structs.Size) => {
      const width = gameSize.width;
      const height = gameSize.height;

      this.cameras.main.setViewport(0, 0, width, height);

      const scaleY = height / GAME_HEIGHT;

      // User requested to remove "resize by width" in game scene, so we scale by height only.
      // This ensures the game always fills the vertical space, even if it means cropping width on very narrow screens.
      const scale = scaleY;

      this.cameras.main.setZoom(scale);
      this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    };

    // Initial resize.
    resize(this.scale.gameSize);

    this.scale.on(Phaser.Scale.Events.RESIZE, resize);

    // Cleanup on scene shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, resize);

      this.destroyWeaponFireEvents();

      this.gameMusic?.stop();
      this.gameMusic?.destroy();
      this.gameMusic = undefined;

      this.shieldFx?.destroy();
      this.shieldFx = undefined;

      this.destroyPlayerEngineFx();
      this.destroyPlayerWeaponFx();
    });

    // If launched from the main menu, show the main menu overlay immediately.
    if (this._openMenuOnStart) {
      this._openMenuOnStart = false;
      this.pauseGame();
    }
  }

  update(time: number, delta: number) {
    if (this.isGameOver) return;
    if (this.isLevelComplete) return;
    if (this.isPausedByInput) return;

    // --- Level distance / boss check ---
    if (this.levelConfig.isBossLevel || this._bossPhaseActive) {
      // Boss level (or post-distance boss phase) ends when boss is defeated.
      if (this.spawner.isBossDefeated()) {
        this.onLevelComplete();
        return;
      }
    } else if (this.levelConfig.distanceGoal > 0) {
      const t0 = delta / 16.666;
      this.distanceTraveled += BG_SCROLL_SPEED_BCG * t0;
      const pct = Math.min(100, Math.floor((this.distanceTraveled / this.levelConfig.distanceGoal) * 100));
      if (this.levelProgressText) {
        this.levelProgressText.setText(`LV ${this.currentLevel}  ${pct}%`);
      }
      if (this.distanceTraveled >= this.levelConfig.distanceGoal) {
        if (this.levelConfig.bossAfterDistance) {
          // Trigger boss spawn once, then wait for defeat (handled in the branch above).
          if (!this._bossPhaseActive) {
            this._bossPhaseActive = true;
            if (this.levelProgressText) {
              this.levelProgressText.setText(`LV ${this.currentLevel}  BOSS`);
            }
            this.spawner.triggerBossPhase(time);
          }
        } else {
          this.onLevelComplete();
          return;
        }
      }
    }

    // Provide player X for boss AI (safe + cheap).
    this.registry.set("playerX", this.player.x);

    const t = delta / 16.666;
    // Subtract to make the texture appear to move "down".
    this.bgDust.tilePositionY -= BG_SCROLL_SPEED_BCG * t; // BCG (base)

    if (this.activeBgSet !== "none") {
      const bgSetKey = this.activeBgSet as ("asteroids" | "planets");
      const overlays = BG_OVERLAY_LAYERS[bgSetKey];
      const planetsOneShot = this.activeBgSet === "planets";

      const scrollLayerOnce = (ts: Phaser.GameObjects.TileSprite, speed: number, maxScroll: number) => {
        if (speed === 0) return;
        const next = ts.tilePositionY - speed * t;
        ts.tilePositionY = Math.max(-maxScroll, next);
      };

      if (planetsOneShot) {
        scrollLayerOnce(this.bgNebula, overlays[0].speed, this.bgOverlayMaxScrollY[0]);
        scrollLayerOnce(this.bgStar, overlays[1].speed, this.bgOverlayMaxScrollY[1]);
        scrollLayerOnce(this.bgL6, overlays[2].speed, this.bgOverlayMaxScrollY[2]);
        const topLayer = overlays[3];
        if (topLayer) scrollLayerOnce(this.bgL3, topLayer.speed, this.bgOverlayMaxScrollY[3]);
      } else {
        this.bgNebula.tilePositionY -= overlays[0].speed * t;
        this.bgStar.tilePositionY -= overlays[1].speed * t;
        this.bgL6.tilePositionY -= overlays[2].speed * t;
        const topLayer = overlays[3];
        if (topLayer) this.bgL3.tilePositionY -= topLayer.speed * t;
      }
    }

    // Pointer drag takes priority; keyboard works when not dragging.
    if (this.draggingPointerId !== null && this.hasDragTarget) {
      this.updateDragMovement(delta);
    } else {
      this.updateKeyboardMovement(delta);
    }

    this.asteroidSpawner.update(time);
    this.spawner.update(time);

    if (this.shieldFx) {
      this.shieldFx.setPosition(this.player.x, this.player.y);
    }

    this.syncPlayerWeaponFx();
    this.syncPlayerEngineFx();
  }

  private playMusicTrack(index: number) {
    if (this.gameMusic) {
      this.gameMusic.stop();
      this.gameMusic.destroy();
    }
    const key = this.musicTracks[index];
    this.gameMusic = this.sound.add(key, { loop: true, volume: 0.5 });
    if (this.isMusicOn) {
      this.gameMusic.play();
    }
  }

  private playPrevTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.musicTracks.length) % this.musicTracks.length;
    this.playMusicTrack(this.currentTrackIndex);
  }

  private playNextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicTracks.length;
    this.playMusicTrack(this.currentTrackIndex);
  }

  private toggleMusic() {
    this.isMusicOn = !this.isMusicOn;
    if (this.isMusicOn) {
      if (!this.gameMusic) {
        this.playMusicTrack(this.currentTrackIndex);
      } else if (!this.gameMusic.isPlaying) {
        this.gameMusic.play(); // Use play() to restart if needed, or resume if paused?
        // Logic in playMusicTrack handles new instance.
        // If track exists but stopped/paused:
        // Actually playMusicTrack destroys and recreates.
        // But if I just toggle, I might want to resume?
        // User said "button disables music...".
        // If I toggle off, I pause/stop.
        // If I toggle on, I resume/play.
      }
    } else {
      this.gameMusic?.pause();
    }
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
      // Ignore clicks on UI elements
      const gameObjects = this.input.hitTestPointer(pointer);
      const clickedUI = gameObjects.some((obj) => this.bottomUIButtons.includes(obj));

      if (clickedUI) return;
      if (this.isPausedByInput) return;

      // Auto-resume removed. Use the specific Pause/Resume button.
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
        // Auto-pause removed
      }
    };

    const onPointerMove = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.draggingPointerId) return;
      if (!pointer.isDown) return;

      const halfW = this.player.displayWidth * 0.5;
      const halfH = this.player.displayHeight * 0.5;
      const tx = Phaser.Math.Clamp(pointer.x - this.dragOffset.x, halfW, GAME_WIDTH - halfW);
      const ty = Phaser.Math.Clamp(pointer.y - this.dragOffset.y, halfH, GAME_HEIGHT - halfH);
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

  private spawnRocketProjectile(x: number, y: number): boolean {
    const rocket = this.rocketProjectiles.get(x, y) as RocketProjectile | null;
    if (!rocket) return false;
    rocket.fire(x, y);
    return true;
  }

  private spawnZapperProjectile(x: number, y: number): boolean {
    const proj = this.zapperProjectiles.get(x, y) as ZapperProjectile | null;
    if (!proj) return false;
    proj.fire(x, y);
    return true;
  }

  private spawnBigSpaceGunProjectile(x: number, y: number): boolean {
    const proj = this.bigSpaceGunProjectiles.get(x, y) as BigSpaceGunProjectile | null;
    if (!proj) return false;
    proj.fire(x, y);
    return true;
  }

  private fireZapperBarrel(side: "left" | "right") {
    if (this.isGameOver) return;
    if (!this.player.active) return;
    if (!this.hasZapper) return;

    const wx = this.zapperWeaponSprite?.visible ? this.zapperWeaponSprite.x : this.player.x + ZAPPER_WEAPON_OFFSET_X;
    const wy = this.zapperWeaponSprite?.visible ? this.zapperWeaponSprite.y : this.player.y + ZAPPER_WEAPON_OFFSET_Y;

    const xOffset = side === "left" ? ZAPPER_PROJECTILE_FROM_WEAPON_OFFSET_X_L : ZAPPER_PROJECTILE_FROM_WEAPON_OFFSET_X_R;
    const x = wx + xOffset;
    const y = wy + ZAPPER_PROJECTILE_FROM_WEAPON_OFFSET_Y;

    const fired = this.spawnZapperProjectile(x, y);
    if (fired && side === "left") {
      this.playSfx(AUDIO_KEYS.zpShot, 0.3);
    }
  }

  private fireZapperPair() {
    this.fireZapperBarrel("left");
    this.fireZapperBarrel("right");
  }

  private fireBigSpaceGunShot() {
    if (this.isGameOver) return;
    if (!this.player.active) return;
    if (!this.hasBigSpaceGun) return;

    const wx = this.bigSpaceGunWeaponSprite?.visible ? this.bigSpaceGunWeaponSprite.x : this.player.x + BIG_SPACE_GUN_WEAPON_OFFSET_X;
    const wy = this.bigSpaceGunWeaponSprite?.visible ? this.bigSpaceGunWeaponSprite.y : this.player.y + BIG_SPACE_GUN_WEAPON_OFFSET_Y;

    const x = wx + BIG_SPACE_GUN_PROJECTILE_FROM_WEAPON_OFFSET_X;
    const y = wy + BIG_SPACE_GUN_PROJECTILE_FROM_WEAPON_OFFSET_Y;

    const fired = this.spawnBigSpaceGunProjectile(x, y);
    if (fired) this.playSfx(AUDIO_KEYS.bigsShot, 0.63);
  }

  private fireRocketsPair() {
    if (this.isGameOver) return;
    if (!this.player.active) return;
    if (!this.hasRockets) return;

    const lBaseX = this.rocketWeaponL?.visible ? this.rocketWeaponL.x : this.player.x + ROCKET_WEAPON_OFFSET_X_L;
    const lBaseY = this.rocketWeaponL?.visible ? this.rocketWeaponL.y : this.player.y + ROCKET_WEAPON_OFFSET_Y_L;
    const rBaseX = this.rocketWeaponR?.visible ? this.rocketWeaponR.x : this.player.x + ROCKET_WEAPON_OFFSET_X_R;
    const rBaseY = this.rocketWeaponR?.visible ? this.rocketWeaponR.y : this.player.y + ROCKET_WEAPON_OFFSET_Y_R;

    const lx = this.player.x + (lBaseX - this.player.x) * ROCKET_PROJECTILE_SPREAD_MULTIPLIER + ROCKET_PROJECTILE_FROM_WEAPON_OFFSET_X;
    const ly = lBaseY + ROCKET_PROJECTILE_FROM_WEAPON_OFFSET_Y;
    const rx = this.player.x + (rBaseX - this.player.x) * ROCKET_PROJECTILE_SPREAD_MULTIPLIER + ROCKET_PROJECTILE_FROM_WEAPON_OFFSET_X;
    const ry = rBaseY + ROCKET_PROJECTILE_FROM_WEAPON_OFFSET_Y;

    const firedL = this.spawnRocketProjectile(lx, ly);
    const firedR = this.spawnRocketProjectile(rx, ry);
    if (firedL || firedR) {
      this.playSfx(AUDIO_KEYS.torpedoShot, 0.18);
    }
  }

  private fireAutoCannonBarrel(side: "left" | "right") {
    if (this.isGameOver) return;
    if (!this.player.active) return;
    if (!this.hasAutoCannons) return;

    const wx = this.autoCannonWeaponSprite?.visible ? this.autoCannonWeaponSprite.x : this.player.x + AUTO_CANNON_WEAPON_OFFSET_X;
    const wy = this.autoCannonWeaponSprite?.visible ? this.autoCannonWeaponSprite.y : this.player.y + AUTO_CANNON_WEAPON_OFFSET_Y;

    const xOffset = side === "left" ? AUTO_CANNON_BULLET_FROM_WEAPON_OFFSET_X_L : AUTO_CANNON_BULLET_FROM_WEAPON_OFFSET_X_R;
    const x = wx + xOffset;
    const y = wy + AUTO_CANNON_BULLET_FROM_WEAPON_OFFSET_Y;

    const fired = this.spawnAutoCannonBullet(x, y);
    if (fired) {
      // Auto Cannons SFX is tied to actual fire frames (left and right).
      this.playSfx(AUDIO_KEYS.gShot, 0.1);
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
    if (animation.key === "auto_cannon_weapon") {
      if (!this.hasAutoCannons) return;
      if (frameKey === AUTO_CANNON_WEAPON_FIRE_LEFT_FRAME) this.fireAutoCannonBarrel("left");
      else if (frameKey === AUTO_CANNON_WEAPON_FIRE_RIGHT_FRAME) this.fireAutoCannonBarrel("right");
      return;
    }

    if (animation.key === "zapper_weapon") {
      if (!this.hasZapper) return;
      if (frameKey === ZAPPER_WEAPON_FIRE_FRAME) this.fireZapperPair();
      return;
    }

    if (animation.key === "big_space_gun_weapon") {
      if (!this.hasBigSpaceGun) return;
      if (frameKey === BIG_SPACE_GUN_WEAPON_FIRE_FRAME) this.fireBigSpaceGunShot();
    }
  }

  private onRocketsAnimationUpdate(
    animation: Phaser.Animations.Animation,
    _frame: Phaser.Animations.AnimationFrame,
    _gameObject: Phaser.GameObjects.Sprite,
    frameKey: string,
  ) {
    if (this.isGameOver) return;
    if (!this.player.active) return;
    if (!this.hasRockets) return;
    if (animation.key !== "rockets_weapon_left") return;
    if (frameKey !== ROCKET_WEAPON_FIRE_FRAME) return;

    // Defensive debounce: animationupdate can emit multiple times per game frame at high rates.
    const now = this.time.now;
    if (now - this.lastRocketShotAt < 40) return;
    this.lastRocketShotAt = now;

    this.fireRocketsPair();
  }

  /** XP earned when killing an enemy. Includes packXp bonus (+5) when purchased. */
  private getXpForKill(kind: EnemyKind): number {
    return getEnemyXp(kind) + (this.packXp ? 5 : 0);
  }

  private onBulletHitsEnemy(bulletObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const bullet = bulletObj as unknown as { active: boolean; kill: () => void };
    const enemy = enemyObj as Enemy;

    if (!bullet.active || !enemy.active) return;

    bullet.kill();
    const destroyed = enemy.onPlayerBulletHit();

    if (destroyed) {
      const hadShield = enemy.spawnedWithShield;
      const wasMiniBoss = enemy.isMiniBoss;
      enemy.kill();

      this.spawnExplosion(enemy.x, enemy.y, enemy.getKind());
      this.playSfx(AUDIO_KEYS.explosionScout, 0.55);
      this.kills += 1;
      this.score += this.getXpForKill(enemy.getKind());
      this.scoreText.setText(`${this.score}`);

      if (wasMiniBoss) {
        this.spawnHealthPickup(enemy.x, enemy.y);
      } else {
        this.maybeSpawnPickup(enemy.x, enemy.y, hadShield);
      }
    }
  }

  private onRocketHitsEnemy(rocketObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const rocket = rocketObj as RocketProjectile;
    const enemy = enemyObj as Enemy;

    if (!rocket.active || !enemy.active) return;

    rocket.kill();
    const destroyed = enemy.onPlayerBulletHit(ROCKET_DAMAGE_MULTIPLIER);

    if (destroyed) {
      const hadShield = enemy.spawnedWithShield;
      const wasMiniBoss = enemy.isMiniBoss;
      enemy.kill();

      this.spawnExplosion(enemy.x, enemy.y, enemy.getKind());
      this.playSfx(AUDIO_KEYS.explosionScout, 0.55);
      this.kills += 1;
      this.score += this.getXpForKill(enemy.getKind());
      this.scoreText.setText(`${this.score}`);

      if (wasMiniBoss) {
        this.spawnHealthPickup(enemy.x, enemy.y);
      } else {
        this.maybeSpawnPickup(enemy.x, enemy.y, hadShield);
      }
    }
  }

  private onZapperHitsEnemy(projObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const proj = projObj as ZapperProjectile;
    const enemy = enemyObj as Enemy;

    if (!proj.active || !enemy.active) return;

    proj.kill();
    const destroyed = enemy.onPlayerBulletHit(ZAPPER_DAMAGE);

    if (destroyed) {
      const hadShield = enemy.spawnedWithShield;
      const wasMiniBoss = enemy.isMiniBoss;
      enemy.kill();

      this.spawnExplosion(enemy.x, enemy.y, enemy.getKind());
      this.playSfx(AUDIO_KEYS.explosionScout, 0.55);
      this.kills += 1;
      this.score += getEnemyXp(enemy.getKind());
      this.scoreText.setText(`${this.score}`);

      if (wasMiniBoss) {
        this.spawnHealthPickup(enemy.x, enemy.y);
      } else {
        this.maybeSpawnPickup(enemy.x, enemy.y, hadShield);
      }
    }
  }

  private onBigSpaceGunHitsEnemy(projObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const proj = projObj as BigSpaceGunProjectile;
    const enemy = enemyObj as Enemy;

    if (!proj.active || !enemy.active) return;

    proj.kill();
    const destroyed = enemy.onPlayerBulletHit(BIG_SPACE_GUN_DAMAGE);

    if (destroyed) {
      const hadShield = enemy.spawnedWithShield;
      const wasMiniBoss = enemy.isMiniBoss;
      enemy.kill();

      this.spawnExplosion(enemy.x, enemy.y, enemy.getKind());
      this.playSfx(AUDIO_KEYS.explosionScout, 0.55);
      this.kills += 1;
      this.score += this.getXpForKill(enemy.getKind());
      this.scoreText.setText(`${this.score}`);

      if (wasMiniBoss) {
        this.spawnHealthPickup(enemy.x, enemy.y);
      } else {
        this.maybeSpawnPickup(enemy.x, enemy.y, hadShield);
      }
    }
  }

  private spawnAsteroidExplosion(x: number, y: number, scale: number, angleDeg: number) {
    const frame = `${SPRITE_FRAMES.asteroid01ExplodePrefix}${SPRITE_FRAMES.asteroid01ExplodeStart}${SPRITE_FRAMES.asteroid01ExplodeSuffix}`;
    const boom = this.add.sprite(x, y, ATLAS_KEYS.fx, frame).setDepth(6);
    boom.setScale(scale);
    boom.setAngle(angleDeg);
    boom.play("asteroid_explode");
    boom.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => boom.destroy());
  }

  private onBulletHitsAsteroid(bulletObj: Phaser.GameObjects.GameObject, asteroidObj: Phaser.GameObjects.GameObject) {
    const bullet = bulletObj as unknown as { active: boolean; kill: () => void };
    const asteroid = asteroidObj as Asteroid;
    if (!bullet.active || !asteroid.active) return;

    bullet.kill();
    const destroyed = asteroid.takeDamage(1);
    if (!destroyed) return;

    const { x, y, scaleX, angle } = asteroid;
    asteroid.kill();
    this.spawnAsteroidExplosion(x, y, scaleX, angle);
    this.playSfx(AUDIO_KEYS.explosionScout, 0.45);
  }

  private onRocketHitsAsteroid(rocketObj: Phaser.GameObjects.GameObject, asteroidObj: Phaser.GameObjects.GameObject) {
    const rocket = rocketObj as RocketProjectile;
    const asteroid = asteroidObj as Asteroid;
    if (!rocket.active || !asteroid.active) return;

    rocket.kill();
    const destroyed = asteroid.takeDamage(ROCKET_DAMAGE_MULTIPLIER);
    if (!destroyed) return;

    const { x, y, scaleX, angle } = asteroid;
    asteroid.kill();
    this.spawnAsteroidExplosion(x, y, scaleX, angle);
    this.playSfx(AUDIO_KEYS.explosionScout, 0.45);
  }

  private onZapperHitsAsteroid(projObj: Phaser.GameObjects.GameObject, asteroidObj: Phaser.GameObjects.GameObject) {
    const proj = projObj as ZapperProjectile;
    const asteroid = asteroidObj as Asteroid;
    if (!proj.active || !asteroid.active) return;

    proj.kill();
    const destroyed = asteroid.takeDamage(ZAPPER_DAMAGE);
    if (!destroyed) return;

    const { x, y, scaleX, angle } = asteroid;
    asteroid.kill();
    this.spawnAsteroidExplosion(x, y, scaleX, angle);
    this.playSfx(AUDIO_KEYS.explosionScout, 0.45);
  }

  private onBigSpaceGunHitsAsteroid(projObj: Phaser.GameObjects.GameObject, asteroidObj: Phaser.GameObjects.GameObject) {
    const proj = projObj as BigSpaceGunProjectile;
    const asteroid = asteroidObj as Asteroid;
    if (!proj.active || !asteroid.active) return;

    proj.kill();
    const destroyed = asteroid.takeDamage(BIG_SPACE_GUN_DAMAGE);
    if (!destroyed) return;

    const { x, y, scaleX, angle } = asteroid;
    asteroid.kill();
    this.spawnAsteroidExplosion(x, y, scaleX, angle);
    this.playSfx(AUDIO_KEYS.explosionScout, 0.45);
  }

  private onEnemyHitsPlayer(_playerObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const enemy = enemyObj as Enemy;
    if (!enemy.active) return;

    const damage = enemy.getCollisionDamage();
    enemy.kill();
    this.takeHit(damage);
  }

  private onAsteroidHitsPlayer(_playerObj: Phaser.GameObjects.GameObject, asteroidObj: Phaser.GameObjects.GameObject) {
    const asteroid = asteroidObj as Asteroid;
    if (!asteroid.active) return;

    const damage = asteroid.getDurability();
    const { x, y, scaleX, angle } = asteroid;
    asteroid.kill();
    this.spawnAsteroidExplosion(x, y, scaleX, angle);
    this.takeHit(damage);
  }

  private onAsteroidHitsEnemy(asteroidObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const asteroid = asteroidObj as Asteroid;
    const enemy = enemyObj as Enemy;
    if (!asteroid.active || !enemy.active) return;
    if (!asteroid.damagesEnemies) return;
    // Don't damage boss enemies (dreadnought).
    if (enemy.getKind() === "dreadnought") return;

    const damage = asteroid.getDurability();
    const { x, y, scaleX, angle } = asteroid;
    asteroid.kill();
    this.spawnAsteroidExplosion(x, y, scaleX, angle);

    const destroyed = enemy.onPlayerBulletHit(damage);
    if (destroyed) {
      const hadShield = enemy.spawnedWithShield;
      const wasMiniBoss = enemy.isMiniBoss;
      enemy.kill();

      this.spawnExplosion(enemy.x, enemy.y, enemy.getKind());
      this.playSfx(AUDIO_KEYS.explosionScout, 0.55);
      this.kills += 1;
      this.score += this.getXpForKill(enemy.getKind());
      this.scoreText.setText(`${this.score}`);

      if (wasMiniBoss) {
        this.spawnHealthPickup(enemy.x, enemy.y);
      } else {
        this.maybeSpawnPickup(enemy.x, enemy.y, hadShield);
      }
    }
  }

  private onEnemyBulletHitsPlayer(_playerObj: Phaser.GameObjects.GameObject, bulletObj: Phaser.GameObjects.GameObject) {
    const bullet = bulletObj as EnemyBullet;
    if (!bullet.active) return;

    const damage = bullet.getDamage();
    bullet.kill();
    this.takeHit(damage);
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
    // Additive +10% from base (1.0) per pickup.
    // fireRateMultiplier goes from 1.0 down; lower = faster.
    // Cap depends on current level tier.
    const minMultiplier = this.getFireRateFloor();
    if (this.fireRateMultiplier > minMultiplier) {
      const newMultiplier = Math.max(minMultiplier, this.fireRateMultiplier - 0.1);
      this.setFireRateMultiplier(newMultiplier);
    }
  }

  private onFiringRate2Pickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as FiringRate2Pickup;
    if (!pickup.active) return;

    pickup.kill();
    // Boost active weapon animation speed (+20% per pickup, max +200% = 3.0).
    const MAX_WEAPON_BONUS = 3; // +200%
    const currentRate = this.getActiveWeaponBonusRate();
    if (currentRate < MAX_WEAPON_BONUS) {
      this.setActiveWeaponBonusRate(Math.min(MAX_WEAPON_BONUS, currentRate + 0.2));
      this.applyWeaponBonusRate();
    }
  }

  private deactivateAllAdditionalWeapons() {
    this.hasAutoCannons = false;
    this.hasRockets = false;
    this.hasZapper = false;
    this.hasBigSpaceGun = false;
  }

  private onAutoCannonsPickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as AutoCannonsPickup;
    if (!pickup.active) return;

    pickup.kill();
    this.activateAutoCannons();
  }

  private onRocketPickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as RocketPickup;
    if (!pickup.active) return;

    pickup.kill();
    this.activateRockets();
  }

  private onZapperPickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as ZapperPickup;
    if (!pickup.active) return;

    pickup.kill();
    this.activateZapper();
  }

  private onBigSpaceGunPickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as BigSpaceGunPickup;
    if (!pickup.active) return;

    pickup.kill();
    this.activateBigSpaceGun();
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

  private takeHit(damage = 1) {
    if (this.isGameOver) return;

    this.playSfx(AUDIO_KEYS.impactSmall, 0.45);

    let remaining = Math.max(1, Math.round(damage));

    if (this.shieldHits > 0 && remaining > 0) {
      const shieldBefore = this.shieldHits;
      this.shieldHits = Math.max(0, this.shieldHits - remaining);
      remaining = Math.max(0, remaining - shieldBefore);

      this.flashShield();
      if (this.shieldHits === 0) {
        this.disableShield();
      }
      if (remaining === 0) return;
    }

    this.hp = Math.max(0, this.hp - remaining);
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

  private spawnFiringRate2Pickup(x: number, y: number) {
    const pickup = this.firingRate2Pickups.get(x, y) as FiringRate2Pickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private spawnAutoCannonsPickup(x: number, y: number) {
    const pickup = this.autoCannonsPickups.get(x, y) as AutoCannonsPickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private spawnRocketPickup(x: number, y: number) {
    const pickup = this.rocketPickups.get(x, y) as RocketPickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private spawnZapperPickup(x: number, y: number) {
    const pickup = this.zapperPickups.get(x, y) as ZapperPickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private spawnBigSpaceGunPickup(x: number, y: number) {
    const pickup = this.bigSpaceGunPickups.get(x, y) as BigSpaceGunPickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private maybeSpawnPickup(x: number, y: number, hadShield = false) {
    if (this.isGameOver) return;

    const d = this.levelConfig?.drops ?? DEFAULT_DROPS;
    // Weapon/engine drops are gated by purchased shop packs.
    // Each pack unlocks a pair of drops at a fixed base rate.
    const WPN = 0.03; // weapon drop rate per pack
    const ENG = 0.02; // engine drop rate per pack

    const r = Phaser.Math.FloatBetween(0, 1);
    let threshold = 0;

    // Pack: Maxi – Big Space Gun + Big Pulse Engine
    if (this.packMaxi) {
      threshold += WPN; if (r < threshold) return this.spawnBigSpaceGunPickup(x, y);
      threshold += ENG; if (r < threshold) return this.spawnBigPulseEnginePickup(x, y);
    }
    // Pack: Big – Zapper + Burst Engine
    if (this.packBig) {
      threshold += WPN; if (r < threshold) return this.spawnZapperPickup(x, y);
      threshold += ENG; if (r < threshold) return this.spawnBurstEnginePickup(x, y);
    }
    // Pack: Medium – Rocket + Supercharged Engine
    if (this.packMedium) {
      threshold += WPN; if (r < threshold) return this.spawnRocketPickup(x, y);
      threshold += ENG; if (r < threshold) return this.spawnSuperchargedEnginePickup(x, y);
    }
    // Pack: Base – Auto Cannons + Base Engine
    if (this.packBase) {
      threshold += WPN; if (r < threshold) return this.spawnAutoCannonsPickup(x, y);
      threshold += ENG; if (r < threshold) return this.spawnBaseEnginePickup(x, y);
    }

    // Non-gated drops from LevelConfig (health, firingRate, shield)
    threshold += d.health;
    if (r < threshold) return this.spawnHealthPickup(x, y);

    threshold += d.firingRate;
    if (r < threshold) return this.spawnFiringRatePickup(x, y);

    // firingRate2 — always available (not gated by packXp)
    threshold += d.firingRate2;
    if (r < threshold) return this.spawnFiringRate2Pickup(x, y);

    threshold += d.shield;
    if (r < threshold) {
      if (hadShield) this.spawnShieldPickup(x, y);
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // Level completion
  // ---------------------------------------------------------------------------

  private onLevelComplete() {
    if (this.isLevelComplete || this.isGameOver) return;
    this.isLevelComplete = true;

    // Freeze gameplay.
    this.physics.world.pause();
    this.destroyWeaponFireEvents();

    // Persist progress.
    const save: SaveData = {
      currentLevel: Math.min(this.currentLevel + 1, TOTAL_LEVELS),
      hasAutoCannons: this.hasAutoCannons,
      hasRockets: this.hasRockets,
      hasZapper: this.hasZapper,
      hasBigSpaceGun: this.hasBigSpaceGun,
      activeEngineType: this.activeEngineType,
      highScore: Math.max(this.score, SaveManager.load().highScore),
      score: this.score,
      fireRateMultiplier: this.fireRateMultiplier,
      weaponBonusRateAutoCannons: this.weaponBonusRateAutoCannons,
      weaponBonusRateRockets: this.weaponBonusRateRockets,
      weaponBonusRateZapper: this.weaponBonusRateZapper,
      weaponBonusRateBigSpaceGun: this.weaponBonusRateBigSpaceGun,
      packXp: this.packXp,
      packBase: this.packBase,
      packMedium: this.packMedium,
      packBig: this.packBig,
      packMaxi: this.packMaxi,
    };
    SaveManager.save(save);

    const depth = 100;
    const container = this.add.container(0, 0).setDepth(depth);

    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0).setInteractive();
    container.add(dim);

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const isLastLevel = this.currentLevel >= TOTAL_LEVELS;

    if (!isLastLevel) {
      // ---- Normal level complete screen ----
      container.add(this.add.text(centerX, centerY - 60, `LEVEL ${this.currentLevel} COMPLETE!`, {
        fontFamily: "Orbitron", fontSize: "20px", color: "#00FF9C",
        stroke: "#000000", strokeThickness: 6, align: "center",
        wordWrap: { width: GAME_WIDTH - 20 },
      }).setOrigin(0.5));

      container.add(this.add.text(centerX, centerY + 10, `ENEMIES DESTROYED: ${this.kills}`, {
        fontFamily: "Orbitron", fontSize: "10px", color: "#CFE9F2",
        stroke: "#000000", strokeThickness: 2, align: "center",
      }).setOrigin(0.5));

      container.add(this.add.text(centerX, centerY + 80, "TAP TO CONTINUE", {
        fontFamily: "Orbitron", fontSize: "20px", color: "#CFE9F2",
        stroke: "#000000", strokeThickness: 4, align: "center",
      }).setOrigin(0.5));

      dim.on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        container.destroy();
        this.gameMusic?.stop();
        this.scene.start("GameScene", { level: this.currentLevel + 1, save });
      });
    } else {
      // ---- Final level – Congratulations screen ----
      container.add(this.add.text(centerX, centerY - 60, "Congratulations!", {
        fontFamily: "Orbitron", fontSize: "10px", color: "#00FF9C",
        stroke: "#000000", strokeThickness: 2, align: "center",
      }).setOrigin(0.5));

      container.add(this.add.text(centerX, centerY + 10, `ENEMIES DESTROYED: ${this.kills}`, {
        fontFamily: "Orbitron", fontSize: "10px", color: "#CFE9F2",
        stroke: "#000000", strokeThickness: 2, align: "center",
      }).setOrigin(0.5));

      const menuBtn = this.add.image(centerX, centerY + 80, IMAGE_KEYS.uiMenu)
        .setInteractive({ useHandCursor: true })
        .setScale(UI_SCALE);
      menuBtn.on("pointerover", () => menuBtn.setTint(0xcccccc));
      menuBtn.on("pointerout",  () => menuBtn.clearTint());
      menuBtn.on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        container.destroy();
        this.gameMusic?.stop();
        this.scene.start("MenuScene");
      });
      container.add(menuBtn);
    }
  }

  private triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Persist current progress so score earned this level is not lost.
    const deathSave: SaveData = {
      currentLevel: this.currentLevel,
      hasAutoCannons: this.hasAutoCannons,
      hasRockets: this.hasRockets,
      hasZapper: this.hasZapper,
      hasBigSpaceGun: this.hasBigSpaceGun,
      activeEngineType: this.activeEngineType,
      highScore: Math.max(this.score, SaveManager.load().highScore),
      score: this.score,
      fireRateMultiplier: this.fireRateMultiplier,
      weaponBonusRateAutoCannons: this.weaponBonusRateAutoCannons,
      weaponBonusRateRockets: this.weaponBonusRateRockets,
      weaponBonusRateZapper: this.weaponBonusRateZapper,
      weaponBonusRateBigSpaceGun: this.weaponBonusRateBigSpaceGun,
      packXp: this.packXp,
      packBase: this.packBase,
      packMedium: this.packMedium,
      packBig: this.packBig,
      packMaxi: this.packMaxi,
    };
    SaveManager.save(deathSave);

    // Freeze gameplay systems.
    this.physics.world.pause();
    this.destroyWeaponFireEvents();

    this.gameMusic?.stop();
    this.gameMusic?.destroy();
    this.gameMusic = undefined;

    this.disableShield();

    // Hide pause button
    if (this.pauseBtn) this.pauseBtn.setVisible(false);

    const depth = 100;

    // Interactive dim blocks clicks to underlying UI (e.g. back button).
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0).setDepth(depth).setInteractive();

    // 2d.png (Game Over)
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const gameOverImg = this.add.image(centerX, centerY - 60, IMAGE_KEYS.ui2d).setDepth(depth + 1).setScale(UI_SCALE);

    const btnY = centerY + 120;

    // Position text exactly between the image and the buttons
    // Image Y = centerY - 60
    // Buttons Y = centerY + 120
    // Midpoint = (centerY - 60 + centerY + 120) / 2 = centerY + 30
    this.add
      .text(centerX, centerY + 30, `ENEMIES DESTROYED: ${this.kills}`, {
        fontFamily: "Orbitron",
        fontSize: "24px",
        color: "#CFE9F2",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
        wordWrap: { width: GAME_WIDTH - 40 },
        padding: { x: 8, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);

    // Menu (Left) — opens main menu overlay (not start screen)
    const exitBtn = this.add.image(centerX - 80, btnY, IMAGE_KEYS.uiMenu)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth + 2)
      .setScale(UI_SCALE)
      .on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        dim.destroy();
        const sv = SaveManager.load();
        this.scene.start("GameScene", { level: sv.currentLevel, save: sv, showMenu: true });
      });
    exitBtn.on("pointerover", () => exitBtn.setTint(0xcccccc));
    exitBtn.on("pointerout", () => exitBtn.clearTint());

    // Resume (Right) – restart current level, restoring saved weapons/engine
    const savedProgress = SaveManager.load();
    const restartBtn = this.add.image(centerX + 80, btnY, IMAGE_KEYS.uiResume)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth + 2)
      .setScale(UI_SCALE)
      .on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        dim.destroy();
        this.scene.start("GameScene", { level: this.currentLevel, save: savedProgress });
      });
    restartBtn.on("pointerover", () => restartBtn.setTint(0xcccccc));
    restartBtn.on("pointerout", () => restartBtn.clearTint());
  }

  private spawnExplosion(x: number, y: number, kind: EnemyKind) {
    const frame =
      kind === "fighter"
        ? `${SPRITE_FRAMES.fighterDestructionPrefix}${SPRITE_FRAMES.fighterDestructionStart}${SPRITE_FRAMES.fighterDestructionSuffix}`
        : kind === "dreadnought"
          ? `${SPRITE_FRAMES.dreadnoughtDestructionPrefix}${SPRITE_FRAMES.dreadnoughtDestructionStart}${SPRITE_FRAMES.dreadnoughtDestructionSuffix}`
          : kind === "battlecruiser"
            ? `${SPRITE_FRAMES.battlecruiserDestructionPrefix}${SPRITE_FRAMES.battlecruiserDestructionStart}${SPRITE_FRAMES.battlecruiserDestructionSuffix}`
            : kind === "frigate"
              ? `${SPRITE_FRAMES.frigateDestructionPrefix}${SPRITE_FRAMES.frigateDestructionStart}${SPRITE_FRAMES.frigateDestructionSuffix}`
              : kind === "torpedo"
                ? `${SPRITE_FRAMES.torpedoShipDestructionPrefix}${SPRITE_FRAMES.torpedoShipDestructionStart}${SPRITE_FRAMES.torpedoShipDestructionSuffix}`
                : `${SPRITE_FRAMES.enemyDestructionPrefix}${SPRITE_FRAMES.enemyDestructionStart}${SPRITE_FRAMES.enemyDestructionSuffix}`;

    const boom = this.add.sprite(x, y, ATLAS_KEYS.enemy, frame).setDepth(6);

    const animKey =
      kind === "fighter"
        ? "fighter_explode"
        : kind === "dreadnought"
          ? "dreadnought_explode"
          : kind === "battlecruiser"
            ? "battlecruiser_explode"
            : kind === "frigate"
              ? "frigate_explode"
              : kind === "torpedo"
                ? "torpedo_ship_explode"
                : "enemy_explode";
    boom.play(animKey);
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

    if (!this.anims.exists("fighter_explode")) {
      this.anims.create({
        key: "fighter_explode",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.fighterDestructionStart,
          end: SPRITE_FRAMES.fighterDestructionEnd,
          prefix: SPRITE_FRAMES.fighterDestructionPrefix,
          suffix: SPRITE_FRAMES.fighterDestructionSuffix,
        }),
        frameRate: 20,
        repeat: 0,
      });
    }

    if (!this.anims.exists("torpedo_ship_explode")) {
      this.anims.create({
        key: "torpedo_ship_explode",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.torpedoShipDestructionStart,
          end: SPRITE_FRAMES.torpedoShipDestructionEnd,
          prefix: SPRITE_FRAMES.torpedoShipDestructionPrefix,
          suffix: SPRITE_FRAMES.torpedoShipDestructionSuffix,
        }),
        frameRate: 20,
        repeat: 0,
      });
    }

    if (!this.anims.exists("frigate_explode")) {
      this.anims.create({
        key: "frigate_explode",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.frigateDestructionStart,
          end: SPRITE_FRAMES.frigateDestructionEnd,
          prefix: SPRITE_FRAMES.frigateDestructionPrefix,
          suffix: SPRITE_FRAMES.frigateDestructionSuffix,
        }),
        frameRate: 20,
        repeat: 0,
      });
    }

    if (!this.anims.exists("battlecruiser_explode")) {
      this.anims.create({
        key: "battlecruiser_explode",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.battlecruiserDestructionStart,
          end: SPRITE_FRAMES.battlecruiserDestructionEnd,
          prefix: SPRITE_FRAMES.battlecruiserDestructionPrefix,
          suffix: SPRITE_FRAMES.battlecruiserDestructionSuffix,
        }),
        frameRate: 20,
        repeat: 0,
      });
    }

    if (!this.anims.exists("dreadnought_explode")) {
      this.anims.create({
        key: "dreadnought_explode",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.dreadnoughtDestructionStart,
          end: SPRITE_FRAMES.dreadnoughtDestructionEnd,
          prefix: SPRITE_FRAMES.dreadnoughtDestructionPrefix,
          suffix: SPRITE_FRAMES.dreadnoughtDestructionSuffix,
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

    if (!this.anims.exists("fighter_engine")) {
      this.anims.create({
        key: "fighter_engine",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.fighterEngineStart,
          end: SPRITE_FRAMES.fighterEngineEnd,
          prefix: SPRITE_FRAMES.fighterEnginePrefix,
          suffix: SPRITE_FRAMES.fighterEngineSuffix,
        }),
        frameRate: 14,
        repeat: -1,
      });
    }

    if (!this.anims.exists("torpedo_ship_engine")) {
      this.anims.create({
        key: "torpedo_ship_engine",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.torpedoShipEngineStart,
          end: SPRITE_FRAMES.torpedoShipEngineEnd,
          prefix: SPRITE_FRAMES.torpedoShipEnginePrefix,
          suffix: SPRITE_FRAMES.torpedoShipEngineSuffix,
        }),
        frameRate: 14,
        repeat: -1,
      });
    }

    if (!this.anims.exists("frigate_engine")) {
      this.anims.create({
        key: "frigate_engine",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.frigateEngineStart,
          end: SPRITE_FRAMES.frigateEngineEnd,
          prefix: SPRITE_FRAMES.frigateEnginePrefix,
          suffix: SPRITE_FRAMES.frigateEngineSuffix,
        }),
        frameRate: 14,
        repeat: -1,
      });
    }

    if (!this.anims.exists("dreadnought_engine")) {
      this.anims.create({
        key: "dreadnought_engine",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.dreadnoughtEngineStart,
          end: SPRITE_FRAMES.dreadnoughtEngineEnd,
          prefix: SPRITE_FRAMES.dreadnoughtEnginePrefix,
          suffix: SPRITE_FRAMES.dreadnoughtEngineSuffix,
        }),
        frameRate: 14,
        repeat: -1,
      });
    }

    // Battlecruiser engine flames are 3-part frames: left/middle/right (12 frames total).
    const battlecruiserEngineFrames = 12;
    const battlecruiserEngineL: number[] = [];
    const battlecruiserEngineM: number[] = [];
    const battlecruiserEngineR: number[] = [];
    for (let f = 0; f < battlecruiserEngineFrames; f += 1) {
      battlecruiserEngineL.push(f * 3);
      battlecruiserEngineM.push(f * 3 + 1);
      battlecruiserEngineR.push(f * 3 + 2);
    }

    this.createLoopAnimFromIndices(
      "battlecruiser_engine_left",
      ATLAS_KEYS.enemy,
      SPRITE_FRAMES.battlecruiserEnginePrefix,
      battlecruiserEngineL,
      SPRITE_FRAMES.battlecruiserEngineSuffix,
      14,
    );
    this.createLoopAnimFromIndices(
      "battlecruiser_engine_mid",
      ATLAS_KEYS.enemy,
      SPRITE_FRAMES.battlecruiserEnginePrefix,
      battlecruiserEngineM,
      SPRITE_FRAMES.battlecruiserEngineSuffix,
      14,
    );
    this.createLoopAnimFromIndices(
      "battlecruiser_engine_right",
      ATLAS_KEYS.enemy,
      SPRITE_FRAMES.battlecruiserEnginePrefix,
      battlecruiserEngineR,
      SPRITE_FRAMES.battlecruiserEngineSuffix,
      14,
    );

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

    if (!this.anims.exists("fighter_weapon_flame")) {
      this.anims.create({
        key: "fighter_weapon_flame",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.fighterWeaponStart,
          end: SPRITE_FRAMES.fighterWeaponEnd,
          prefix: SPRITE_FRAMES.fighterWeaponPrefix,
          suffix: SPRITE_FRAMES.fighterWeaponSuffix,
        }),
        frameRate: 22,
        repeat: 0,
      });
    }

    if (!this.anims.exists("frigate_weapon")) {
      this.anims.create({
        key: "frigate_weapon",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.frigateWeaponStart,
          end: SPRITE_FRAMES.frigateWeaponEnd,
          prefix: SPRITE_FRAMES.frigateWeaponPrefix,
          suffix: SPRITE_FRAMES.frigateWeaponSuffix,
        }),
        frameRate: 18,
        repeat: 0,
      });
    }

    if (!this.anims.exists("battlecruiser_weapon")) {
      // Avoid creating an empty animation if the atlas doesn't have the frames yet.
      const tex = this.textures.get(ATLAS_KEYS.enemy);
      const battlecruiserWeaponFrames: Array<{ key: string; frame: string }> = [];
      for (let i = SPRITE_FRAMES.battlecruiserWeaponStart; i <= SPRITE_FRAMES.battlecruiserWeaponEnd; i += 1) {
        const name = `${SPRITE_FRAMES.battlecruiserWeaponPrefix}${i}${SPRITE_FRAMES.battlecruiserWeaponSuffix}`;
        if (tex?.has(name)) battlecruiserWeaponFrames.push({ key: ATLAS_KEYS.enemy, frame: name });
      }

      if (battlecruiserWeaponFrames.length > 0) {
        this.anims.create({
          key: "battlecruiser_weapon",
          frames: battlecruiserWeaponFrames as unknown as Phaser.Types.Animations.AnimationFrame[],
          frameRate: 18,
          repeat: 0,
        });
      }
    }

    if (!this.anims.exists("dreadnought_weapon")) {
      // Avoid creating an empty animation if the atlas doesn't have the frames yet.
      const tex = this.textures.get(ATLAS_KEYS.enemy);
      const dreadnoughtWeaponFrames: Array<{ key: string; frame: string }> = [];
      for (let i = SPRITE_FRAMES.dreadnoughtWeaponStart; i <= SPRITE_FRAMES.dreadnoughtWeaponEnd; i += 1) {
        const name = `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}${i}${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`;
        if (tex?.has(name)) dreadnoughtWeaponFrames.push({ key: ATLAS_KEYS.enemy, frame: name });
      }

      if (dreadnoughtWeaponFrames.length > 0) {
        this.anims.create({
          key: "dreadnought_weapon",
          frames: dreadnoughtWeaponFrames as unknown as Phaser.Types.Animations.AnimationFrame[],
          // 7 weapon frames between shots. At 28fps that is 0.25s,
          // which matches a full cycle of the Ray animation (4 frames @ 16fps).
          frameRate: 28,
          repeat: 0,
        });
      }
    }

    if (!this.anims.exists("torpedo_ship_weapon")) {
      // Avoid creating an empty animation if the atlas doesn't have the frames yet.
      const tex = this.textures.get(ATLAS_KEYS.enemy);
      const torpedoWeaponFrames: Array<{ key: string; frame: string }> = [];
      for (let i = 1; i <= 14; i += 1) {
        const name = `${SPRITE_FRAMES.torpedoShipWeaponPrefix}${i}${SPRITE_FRAMES.torpedoShipWeaponSuffix}`;
        if (tex?.has(name)) torpedoWeaponFrames.push({ key: ATLAS_KEYS.enemy, frame: name });
      }

      if (torpedoWeaponFrames.length > 0) {
        this.anims.create({
          key: "torpedo_ship_weapon",
          // Play after idle (Weapons-0), so start at Weapons-1.
          frames: torpedoWeaponFrames as unknown as Phaser.Types.Animations.AnimationFrame[],
          frameRate: 18,
          repeat: 0,
        });
      }
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

    this.createLoopAnimIfFrames(
      "enemy_torpedo",
      ATLAS_KEYS.enemy,
      SPRITE_FRAMES.torpedoProjectilePrefix,
      SPRITE_FRAMES.torpedoProjectileStart,
      SPRITE_FRAMES.torpedoProjectileEnd,
      SPRITE_FRAMES.torpedoProjectileSuffix,
      18,
    );

    this.createLoopAnimIfFrames(
      "enemy_big_bullet",
      ATLAS_KEYS.enemy,
      SPRITE_FRAMES.bigBulletProjectilePrefix,
      SPRITE_FRAMES.bigBulletProjectileStart,
      SPRITE_FRAMES.bigBulletProjectileEnd,
      SPRITE_FRAMES.bigBulletProjectileSuffix,
      16,
    );

    this.createLoopAnimIfFrames(
      "enemy_wave",
      ATLAS_KEYS.enemy,
      SPRITE_FRAMES.waveProjectilePrefix,
      SPRITE_FRAMES.waveProjectileStart,
      SPRITE_FRAMES.waveProjectileEnd,
      SPRITE_FRAMES.waveProjectileSuffix,
      16,
    );

    this.createLoopAnimIfFrames(
      "enemy_ray",
      ATLAS_KEYS.enemy,
      SPRITE_FRAMES.rayProjectilePrefix,
      SPRITE_FRAMES.rayProjectileStart,
      SPRITE_FRAMES.rayProjectileEnd,
      SPRITE_FRAMES.rayProjectileSuffix,
      16,
    );

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

    if (!this.anims.exists("fighter_shield")) {
      this.anims.create({
        key: "fighter_shield",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.fighterShieldStart,
          end: SPRITE_FRAMES.fighterShieldEnd,
          prefix: SPRITE_FRAMES.fighterShieldPrefix,
          suffix: SPRITE_FRAMES.fighterShieldSuffix,
        }),
        frameRate: 18,
        repeat: -1,
      });
    }

    if (!this.anims.exists("torpedo_ship_shield")) {
      this.anims.create({
        key: "torpedo_ship_shield",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.torpedoShipShieldStart,
          end: SPRITE_FRAMES.torpedoShipShieldEnd,
          prefix: SPRITE_FRAMES.torpedoShipShieldPrefix,
          suffix: SPRITE_FRAMES.torpedoShipShieldSuffix,
        }),
        frameRate: 18,
        repeat: -1,
      });
    }

    if (!this.anims.exists("frigate_shield")) {
      this.anims.create({
        key: "frigate_shield",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.frigateShieldStart,
          end: SPRITE_FRAMES.frigateShieldEnd,
          prefix: SPRITE_FRAMES.frigateShieldPrefix,
          suffix: SPRITE_FRAMES.frigateShieldSuffix,
        }),
        frameRate: 18,
        repeat: -1,
      });
    }

    if (!this.anims.exists("battlecruiser_shield")) {
      this.anims.create({
        key: "battlecruiser_shield",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.battlecruiserShieldStart,
          end: SPRITE_FRAMES.battlecruiserShieldEnd,
          prefix: SPRITE_FRAMES.battlecruiserShieldPrefix,
          suffix: SPRITE_FRAMES.battlecruiserShieldSuffix,
        }),
        frameRate: 18,
        repeat: -1,
      });
    }

    if (!this.anims.exists("dreadnought_shield")) {
      this.anims.create({
        key: "dreadnought_shield",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.dreadnoughtShieldStart,
          end: SPRITE_FRAMES.dreadnoughtShieldEnd,
          prefix: SPRITE_FRAMES.dreadnoughtShieldPrefix,
          suffix: SPRITE_FRAMES.dreadnoughtShieldSuffix,
        }),
        frameRate: 18,
        repeat: -1,
      });
    }

    if (!this.anims.exists("asteroid_explode")) {
      const tex = this.textures.get(ATLAS_KEYS.fx);
      const frames: Array<{ key: string; frame: string }> = [];
      for (let i = SPRITE_FRAMES.asteroid01ExplodeStart; i <= SPRITE_FRAMES.asteroid01ExplodeEnd; i += 1) {
        const name = `${SPRITE_FRAMES.asteroid01ExplodePrefix}${i}${SPRITE_FRAMES.asteroid01ExplodeSuffix}`;
        if (tex?.has(name)) frames.push({ key: ATLAS_KEYS.fx, frame: name });
      }

      if (frames.length > 0) {
        this.anims.create({
          key: "asteroid_explode",
          frames: frames as unknown as Phaser.Types.Animations.AnimationFrame[],
          frameRate: 20,
          repeat: 0,
        });
      }
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
      "firing_rate2_pickup",
      ATLAS_KEYS.fx2,
      SPRITE_FRAMES.firingRate2PickupPrefix,
      SPRITE_FRAMES.firingRate2PickupStart,
      SPRITE_FRAMES.firingRate2PickupEnd,
      SPRITE_FRAMES.firingRate2PickupSuffix,
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
      "rocket_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.rocketPickupPrefix,
      SPRITE_FRAMES.rocketPickupStart,
      SPRITE_FRAMES.rocketPickupEnd,
      SPRITE_FRAMES.rocketPickupSuffix,
      14,
    );

    this.createLoopAnimIfFrames(
      "zapper_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.zapperPickupPrefix,
      SPRITE_FRAMES.zapperPickupStart,
      SPRITE_FRAMES.zapperPickupEnd,
      SPRITE_FRAMES.zapperPickupSuffix,
      14,
    );

    this.createLoopAnimIfFrames(
      "big_space_gun_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.bigSpaceGunPickupPrefix,
      SPRITE_FRAMES.bigSpaceGunPickupStart,
      SPRITE_FRAMES.bigSpaceGunPickupEnd,
      SPRITE_FRAMES.bigSpaceGunPickupSuffix,
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

    this.createLoopAnimIfFrames(
      "rocket_projectile",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.rocketProjectilePrefix,
      SPRITE_FRAMES.rocketProjectileStart,
      SPRITE_FRAMES.rocketProjectileEnd,
      SPRITE_FRAMES.rocketProjectileSuffix,
      18,
    );

    this.createLoopAnimIfFrames(
      "zapper_weapon",
      ATLAS_KEYS.ship,
      SPRITE_FRAMES.zapperWeaponPrefix,
      SPRITE_FRAMES.zapperWeaponStart,
      SPRITE_FRAMES.zapperWeaponEnd,
      SPRITE_FRAMES.zapperWeaponSuffix,
      18,
    );

    this.createLoopAnimIfFrames(
      "zapper_projectile",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.zapperProjectilePrefix,
      SPRITE_FRAMES.zapperProjectileStart,
      SPRITE_FRAMES.zapperProjectileEnd,
      SPRITE_FRAMES.zapperProjectileSuffix,
      16.2, // slowed by 10%
    );

    this.createLoopAnimIfFrames(
      "big_space_gun_weapon",
      ATLAS_KEYS.ship,
      SPRITE_FRAMES.bigSpaceGunWeaponPrefix,
      SPRITE_FRAMES.bigSpaceGunWeaponStart,
      SPRITE_FRAMES.bigSpaceGunWeaponEnd,
      SPRITE_FRAMES.bigSpaceGunWeaponSuffix,
      19.8, // +10% from base 18
    );

    this.createLoopAnimIfFrames(
      "big_space_gun_projectile",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.bigSpaceGunProjectilePrefix,
      SPRITE_FRAMES.bigSpaceGunProjectileStart,
      SPRITE_FRAMES.bigSpaceGunProjectileEnd,
      SPRITE_FRAMES.bigSpaceGunProjectileSuffix,
      18,
    );

    this.createLoopAnimFromIndices(
      "rockets_weapon_left",
      ATLAS_KEYS.ship,
      SPRITE_FRAMES.rocketsWeaponPrefix,
      [0, 2, 4, 6, 8],
      SPRITE_FRAMES.rocketsWeaponSuffix,
      7, // slowed 2x
    );

    this.createLoopAnimFromIndices(
      "rockets_weapon_right",
      ATLAS_KEYS.ship,
      SPRITE_FRAMES.rocketsWeaponPrefix,
      [1, 3, 5, 7, 9],
      SPRITE_FRAMES.rocketsWeaponSuffix,
      7, // slowed 2x
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

  private createLoopAnimFromIndices(
    key: string,
    atlasKey: string,
    prefix: string,
    indices: number[],
    suffix: string,
    frameRate: number,
  ) {
    if (this.anims.exists(key)) return;

    const tex = this.textures.get(atlasKey);
    const frames: Array<{ key: string; frame: string }> = [];
    for (const i of indices) {
      const name = `${prefix}${i}${suffix}`;
      if (tex?.has(name)) frames.push({ key: atlasKey, frame: name });
    }
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
    const uiDepth = 120;

    this.pausedText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "PAUSED", {
        fontFamily: "Orbitron",
        fontSize: "48px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(uiDepth + 1)
      .setVisible(false);

    this.createBottomUI();

    // Lives: 5 mini ship icons. One disappears per hit (HP loss).
    const startX = 20;
    const y = 20;
    const scale = 0.75;
    const spacing = 30;

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

    // Score Text (Top Right)
    this.scoreText = this.add
      .text(GAME_WIDTH - 20, 20, "0", {
        fontFamily: "Orbitron",
        fontSize: "24px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setDepth(uiDepth);
  }

  private createBottomUI() {
    const depth = 120;

    // Home/Pause Button (Bottom Left)
    // 5px padding from left and bottom
    const padding = 5;

    this.pauseBtn = this.add.container(0, 0);

    const homeBtn = this.add.image(0, 0, IMAGE_KEYS.uiHome)
      .setInteractive({ useHandCursor: true })
      .setOrigin(0, 1) // Anchor to bottom-left
      .setScale(UI_SCALE) // Reduce size by 20%
      .on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        if (this.isPausedByInput) {
          this.resumeGame();
        } else {
          this.pauseGame();
        }
      });

    // Position container at padding, GAME_HEIGHT - padding
    // Since button origin is (0,1), placing it at (padding, GAME_HEIGHT - padding)
    // will put its bottom-left corner exactly there.
    homeBtn.setPosition(padding, GAME_HEIGHT - padding);

    // Add simple hover effect
    homeBtn.on("pointerover", () => homeBtn.setTint(0xcccccc));
    homeBtn.on("pointerout", () => homeBtn.clearTint());

    this.pauseBtn.add(homeBtn);
    this.pauseBtn.setDepth(depth);
    this.bottomUIButtons.push(this.pauseBtn);
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
    const floor = this.getFireRateFloor();
    this.fireRateMultiplier = Phaser.Math.Clamp(multiplier, floor, 1);

    if (this.isGameOver) return;
    this.configureWeaponFireEvents();
  }

  /**
   * Returns the minimum fireRateMultiplier allowed for the current level.
   * L1-5:  +100% max bonus => multiplier floor 0.50  (2x speed)
   * L6-10: +200% max bonus => multiplier floor 0.333 (3x speed)
   * L11-16:+300% max bonus => multiplier floor 0.25  (4x speed)
   */
  private getFireRateFloor(): number {
    if (this.currentLevel <= 5)  return 0.50;    // +100%
    if (this.currentLevel <= 10) return 1 / 3;   // +200%
    return 0.25;                                  // +300%
  }

  /** Return the bonus rate of whichever weapon is currently active. */
  private getActiveWeaponBonusRate(): number {
    if (this.hasAutoCannons) return this.weaponBonusRateAutoCannons;
    if (this.hasRockets) return this.weaponBonusRateRockets;
    if (this.hasZapper) return this.weaponBonusRateZapper;
    if (this.hasBigSpaceGun) return this.weaponBonusRateBigSpaceGun;
    return 1;
  }

  /** Set the bonus rate of whichever weapon is currently active. */
  private setActiveWeaponBonusRate(rate: number) {
    if (this.hasAutoCannons) this.weaponBonusRateAutoCannons = rate;
    else if (this.hasRockets) this.weaponBonusRateRockets = rate;
    else if (this.hasZapper) this.weaponBonusRateZapper = rate;
    else if (this.hasBigSpaceGun) this.weaponBonusRateBigSpaceGun = rate;
  }

  /** Apply per-weapon bonus timeScale to each weapon animation. */
  private applyWeaponBonusRate() {
    if (this.autoCannonWeaponSprite?.anims) this.autoCannonWeaponSprite.anims.timeScale = this.weaponBonusRateAutoCannons;
    if (this.rocketWeaponL?.anims) this.rocketWeaponL.anims.timeScale = this.weaponBonusRateRockets;
    if (this.rocketWeaponR?.anims) this.rocketWeaponR.anims.timeScale = this.weaponBonusRateRockets;
    if (this.zapperWeaponSprite?.anims) this.zapperWeaponSprite.anims.timeScale = this.weaponBonusRateZapper;
    if (this.bigSpaceGunWeaponSprite?.anims) this.bigSpaceGunWeaponSprite.anims.timeScale = this.weaponBonusRateBigSpaceGun;
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
    this.deactivateAllAdditionalWeapons();
    this.hasAutoCannons = true;

    const weaponFrame = `${SPRITE_FRAMES.autoCannonWeaponPrefix}${SPRITE_FRAMES.autoCannonWeaponStart}${SPRITE_FRAMES.autoCannonWeaponSuffix}`;

    if (!this.autoCannonWeaponSprite) {
      this.autoCannonWeaponSprite = this.add
        .sprite(this.player.x, this.player.y, ATLAS_KEYS.ship, weaponFrame)
        .setDepth(DEPTH_WEAPON)
        .setScale(1);
    }

    this.autoCannonWeaponSprite.setVisible(true);
    this.autoCannonWeaponSprite.setDepth(DEPTH_WEAPON);
    this.autoCannonWeaponSprite.setFrame(weaponFrame);

    try {
      this.autoCannonWeaponSprite.play("auto_cannon_weapon", true);
    } catch {
      // ignore
    }

    // Sync bullet spawn to animation frames (frame -1 => left, frame -2 => right).
    this.autoCannonWeaponSprite.off(Phaser.Animations.Events.ANIMATION_UPDATE, this.onWeaponAnimationUpdate, this);
    this.autoCannonWeaponSprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.onWeaponAnimationUpdate, this);

    // Shield should render above the weapon.
    if (this.shieldFx) this.shieldFx.setDepth(DEPTH_SHIELD);

    this.syncPlayerWeaponFx();
    this.applyWeaponBonusRate();
  }

  private activateRockets() {
    this.deactivateAllAdditionalWeapons();
    this.hasRockets = true;
    this.lastRocketShotAt = 0;

    const baseFrame = `${SPRITE_FRAMES.rocketsWeaponPrefix}${SPRITE_FRAMES.rocketsWeaponStart}${SPRITE_FRAMES.rocketsWeaponSuffix}`;

    if (!this.rocketWeaponL) {
      this.rocketWeaponL = this.add.sprite(this.player.x, this.player.y, ATLAS_KEYS.ship, baseFrame).setDepth(DEPTH_WEAPON).setScale(0.9);
    }
    if (!this.rocketWeaponR) {
      this.rocketWeaponR = this.add.sprite(this.player.x, this.player.y, ATLAS_KEYS.ship, baseFrame).setDepth(DEPTH_WEAPON).setScale(0.9);
    }

    this.rocketWeaponL.setVisible(true);
    this.rocketWeaponR.setVisible(true);
    this.rocketWeaponL.setDepth(DEPTH_WEAPON);
    this.rocketWeaponR.setDepth(DEPTH_WEAPON);

    try {
      this.rocketWeaponL.play("rockets_weapon_left", true);
      this.rocketWeaponR.play("rockets_weapon_right", true);
    } catch {
      // ignore
    }

    // Sync rocket fire to the weapon animation (frame ...Rockets-4).
    this.rocketWeaponL.off(Phaser.Animations.Events.ANIMATION_UPDATE, this.onRocketsAnimationUpdate, this);
    this.rocketWeaponL.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.onRocketsAnimationUpdate, this);

    if (this.shieldFx) this.shieldFx.setDepth(DEPTH_SHIELD);
    this.syncPlayerWeaponFx();
    this.applyWeaponBonusRate();
  }

  private activateZapper() {
    this.deactivateAllAdditionalWeapons();
    this.hasZapper = true;

    const weaponFrame = `${SPRITE_FRAMES.zapperWeaponPrefix}${SPRITE_FRAMES.zapperWeaponStart}${SPRITE_FRAMES.zapperWeaponSuffix}`;

    if (!this.zapperWeaponSprite) {
      this.zapperWeaponSprite = this.add
        .sprite(this.player.x, this.player.y, ATLAS_KEYS.ship, weaponFrame)
        .setDepth(DEPTH_WEAPON)
        .setScale(1);
    }

    this.zapperWeaponSprite.setVisible(true);
    this.zapperWeaponSprite.setDepth(DEPTH_WEAPON);
    this.zapperWeaponSprite.setFrame(weaponFrame);

    try {
      this.zapperWeaponSprite.play("zapper_weapon", true);
    } catch {
      // ignore
    }

    // Sync zapper shots to animation frames (frame -1 => left, frame -2 => right).
    this.zapperWeaponSprite.off(Phaser.Animations.Events.ANIMATION_UPDATE, this.onWeaponAnimationUpdate, this);
    this.zapperWeaponSprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.onWeaponAnimationUpdate, this);

    if (this.shieldFx) this.shieldFx.setDepth(DEPTH_SHIELD);
    this.syncPlayerWeaponFx();
    this.applyWeaponBonusRate();
  }

  private activateBigSpaceGun() {
    this.deactivateAllAdditionalWeapons();
    this.hasBigSpaceGun = true;

    const weaponFrame = `${SPRITE_FRAMES.bigSpaceGunWeaponPrefix}${SPRITE_FRAMES.bigSpaceGunWeaponStart}${SPRITE_FRAMES.bigSpaceGunWeaponSuffix}`;

    if (!this.bigSpaceGunWeaponSprite) {
      this.bigSpaceGunWeaponSprite = this.add
        .sprite(this.player.x, this.player.y, ATLAS_KEYS.ship, weaponFrame)
        .setDepth(DEPTH_WEAPON)
        .setScale(1);
    }

    this.bigSpaceGunWeaponSprite.setVisible(true);
    this.bigSpaceGunWeaponSprite.setDepth(DEPTH_WEAPON);
    this.bigSpaceGunWeaponSprite.setFrame(weaponFrame);

    try {
      this.bigSpaceGunWeaponSprite.play("big_space_gun_weapon", true);
    } catch {
      // ignore
    }

    this.bigSpaceGunWeaponSprite.off(Phaser.Animations.Events.ANIMATION_UPDATE, this.onWeaponAnimationUpdate, this);
    this.bigSpaceGunWeaponSprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.onWeaponAnimationUpdate, this);

    if (this.shieldFx) this.shieldFx.setDepth(DEPTH_SHIELD);
    this.syncPlayerWeaponFx();
    this.applyWeaponBonusRate();
  }

  private syncPlayerWeaponFx() {
    if (this.autoCannonWeaponSprite) {
      if (!this.hasAutoCannons) {
        this.autoCannonWeaponSprite.setVisible(false);
      } else {
        this.autoCannonWeaponSprite.setVisible(true);
        this.autoCannonWeaponSprite.setDepth(DEPTH_WEAPON);
        this.autoCannonWeaponSprite.setPosition(
          this.player.x + AUTO_CANNON_WEAPON_OFFSET_X,
          this.player.y + AUTO_CANNON_WEAPON_OFFSET_Y,
        );
      }
    }

    if (this.rocketWeaponL && this.rocketWeaponR) {
      if (!this.hasRockets) {
        this.rocketWeaponL.setVisible(false);
        this.rocketWeaponR.setVisible(false);
      } else {
        this.rocketWeaponL.setVisible(true);
        this.rocketWeaponR.setVisible(true);
        this.rocketWeaponL.setDepth(DEPTH_WEAPON);
        this.rocketWeaponR.setDepth(DEPTH_WEAPON);
        this.rocketWeaponL.setPosition(this.player.x + ROCKET_WEAPON_OFFSET_X_L, this.player.y + ROCKET_WEAPON_OFFSET_Y_L);
        this.rocketWeaponR.setPosition(this.player.x + ROCKET_WEAPON_OFFSET_X_R, this.player.y + ROCKET_WEAPON_OFFSET_Y_R);
      }
    }

    if (this.zapperWeaponSprite) {
      if (!this.hasZapper) {
        this.zapperWeaponSprite.setVisible(false);
      } else {
        this.zapperWeaponSprite.setVisible(true);
        this.zapperWeaponSprite.setDepth(DEPTH_WEAPON);
        this.zapperWeaponSprite.setPosition(this.player.x + ZAPPER_WEAPON_OFFSET_X, this.player.y + ZAPPER_WEAPON_OFFSET_Y);
      }
    }

    if (this.bigSpaceGunWeaponSprite) {
      if (!this.hasBigSpaceGun) {
        this.bigSpaceGunWeaponSprite.setVisible(false);
      } else {
        this.bigSpaceGunWeaponSprite.setVisible(true);
        this.bigSpaceGunWeaponSprite.setDepth(DEPTH_WEAPON);
        this.bigSpaceGunWeaponSprite.setPosition(
          this.player.x + BIG_SPACE_GUN_WEAPON_OFFSET_X,
          this.player.y + BIG_SPACE_GUN_WEAPON_OFFSET_Y,
        );
      }
    }
  }

  private destroyPlayerWeaponFx() {
    this.autoCannonWeaponSprite?.destroy();
    this.autoCannonWeaponSprite = undefined;
    this.rocketWeaponL?.destroy();
    this.rocketWeaponL = undefined;
    this.rocketWeaponR?.destroy();
    this.rocketWeaponR = undefined;
    this.zapperWeaponSprite?.destroy();
    this.zapperWeaponSprite = undefined;
    this.bigSpaceGunWeaponSprite?.destroy();
    this.bigSpaceGunWeaponSprite = undefined;
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

  private createExitConfirmation() {
    const depth = 200;
    const container = this.add.container(0, 0).setDepth(depth);

    // Blocker/Dimmer with Blur
    const blocker = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setOrigin(0)
      .setInteractive();
    container.add(blocker);

    // Add blur effect to the camera
    if (this.cameras.main.postFX) {
      this.cameras.main.postFX.addBlur(4, 0, 0, 0.5);
    }

    // 1d.png (Are you sure?)
    const dialogX = GAME_WIDTH / 2;
    const dialogY = GAME_HEIGHT / 2;

    const message = this.add.image(dialogX, dialogY - 50, IMAGE_KEYS.ui1d);
    // Note: 1d.png might need scaling too if it's considered a "button" or UI element, 
    // but the prompt said "reduce buttons". Let's scale it too for consistency or leave as is?
    // "reduce buttons by 20%". 1d is text/dialog. I'll leave it 1.0 unless it looks huge.
    // Actually, let's scale it 0.8 to match the style if it's large.
    message.setScale(UI_SCALE);
    container.add(message);

    // No Button (Return to Pause)
    const noBtn = this.add.image(dialogX - 80, dialogY + 60, IMAGE_KEYS.uiNo)
      .setInteractive({ useHandCursor: true })
      .setScale(UI_SCALE)
      .on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        if (this.cameras.main.postFX) {
          this.cameras.main.postFX.clear();
        }
        container.destroy();
      });
    noBtn.on("pointerover", () => noBtn.setTint(0xcccccc));
    noBtn.on("pointerout", () => noBtn.clearTint());
    container.add(noBtn);

    // Yes Button (Exit Game)
    const yesBtn = this.add.image(dialogX + 80, dialogY + 60, IMAGE_KEYS.uiYes)
      .setInteractive({ useHandCursor: true })
      .setScale(UI_SCALE)
      .on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        if (this.cameras.main.postFX) {
          this.cameras.main.postFX.clear();
        }
        this.gameMusic?.stop();
        this.scene.start("MenuScene");
      });
    yesBtn.on("pointerover", () => yesBtn.setTint(0xcccccc));
    yesBtn.on("pointerout", () => yesBtn.clearTint());
    container.add(yesBtn);
  }

  private createRestartConfirmation() {
    const depth = 200;
    const container = this.add.container(0, 0).setDepth(depth);

    // Blocker/Dimmer with Blur
    const blocker = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setOrigin(0)
      .setInteractive();
    container.add(blocker);

    // Add blur effect to the camera
    if (this.cameras.main.postFX) {
      this.cameras.main.postFX.addBlur(4, 0, 0, 0.5);
    }

    // 1d.png (Are you sure?) - Reusing generic confirmation dialog image
    const dialogX = GAME_WIDTH / 2;
    const dialogY = GAME_HEIGHT / 2;

    const message = this.add.image(dialogX, dialogY - 50, IMAGE_KEYS.ui1d);
    message.setScale(UI_SCALE);
    container.add(message);

    // "Start from the beginning?" label — centred between image (dialogY - 50) and buttons (dialogY + 60)
    const label = this.add.text(dialogX, dialogY + 5, "Start from the beginning?", {
      fontFamily: "Orbitron",
      fontSize: "18px",
      color: "#FFE066",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center",
    }).setOrigin(0.5);
    container.add(label);

    // No Button (Return to Pause)
    const noBtn = this.add.image(dialogX - 80, dialogY + 60, IMAGE_KEYS.uiNo)
      .setInteractive({ useHandCursor: true })
      .setScale(UI_SCALE)
      .on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        if (this.cameras.main.postFX) {
          this.cameras.main.postFX.clear();
        }
        container.destroy();
      });
    noBtn.on("pointerover", () => noBtn.setTint(0xcccccc));
    noBtn.on("pointerout", () => noBtn.clearTint());
    container.add(noBtn);

    // Yes Button (Restart from beginning — clears save, opens main menu)
    const yesBtn = this.add.image(dialogX + 80, dialogY + 60, IMAGE_KEYS.uiYes)
      .setInteractive({ useHandCursor: true })
      .setScale(UI_SCALE)
      .on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        if (this.cameras.main.postFX) {
          this.cameras.main.postFX.clear();
        }
        SaveManager.clear();
        this.scene.start("GameScene", { level: 1, showMenu: true });
      });
    yesBtn.on("pointerover", () => yesBtn.setTint(0xcccccc));
    yesBtn.on("pointerout", () => yesBtn.clearTint());
    container.add(yesBtn);
  }

  private createPauseUI() {
    const depth = 100;
    this.pauseUIContainer = this.add.container(0, 0).setDepth(depth);

    // Pause Menu Background
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, IMAGE_KEYS.pauseBackground)
      .setOrigin(0.5, 0.5)
      .setInteractive();
    bg.displayHeight = GAME_HEIGHT;
    bg.scaleX = bg.scaleY;
    this.pauseUIContainer.add(bg);

    const centerX = GAME_WIDTH / 2;

    // ================================================================== //
    //  TOP: Shop pack buttons (20px below scoreText)                       //
    // ================================================================== //
    const shopBottomY = this.buildShopUI(this.pauseUIContainer);

    // ================================================================== //
    //  Buttons flow top-down                                               //
    // ================================================================== //

    // PLAY / RESUME — 8px below last shop button (xpp)
    const resumeKey = this._showPlayBtn ? IMAGE_KEYS.uiPlayG : IMAGE_KEYS.uiResume;
    const resumeBtn = this.add.image(centerX, 0, resumeKey).setScale(UI_SCALE);
    resumeBtn.y = shopBottomY + 8 + resumeBtn.displayHeight / 2;
    resumeBtn
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this._showPlayBtn = false;
        this.playSfx(AUDIO_KEYS.click, 0.7);
        this.resumeGame();
      });
    resumeBtn.on("pointerover", () => resumeBtn.setTint(0xcccccc));
    resumeBtn.on("pointerout", () => resumeBtn.clearTint());
    this.pauseUIContainer.add(resumeBtn);

    // Pre-measure music-toggle button height for layout.
    const musicProbe = this.add.image(-9999, -9999, this.isMusicOn ? IMAGE_KEYS.uiPause : IMAGE_KEYS.uiPlay).setScale(UI_SCALE);
    const toggleBtnH = musicProbe.displayHeight;
    musicProbe.destroy();

    // MUSIC CONTROLS — 4px below RESUME
    const musicY = resumeBtn.y + resumeBtn.displayHeight / 2 + 4 + toggleBtnH / 2;
    const musicSpacing = 80;

    const prevBtn = this.add.image(centerX - musicSpacing, musicY, IMAGE_KEYS.uiPrev)
      .setInteractive({ useHandCursor: true })
      .setScale(UI_SCALE)
      .on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        this.playPrevTrack();
      });
    prevBtn.on("pointerover", () => prevBtn.setTint(0xcccccc));
    prevBtn.on("pointerout", () => prevBtn.clearTint());
    this.pauseUIContainer.add(prevBtn);

    const toggleBtn = this.add.image(centerX, musicY, this.isMusicOn ? IMAGE_KEYS.uiPause : IMAGE_KEYS.uiPlay)
      .setInteractive({ useHandCursor: true })
      .setScale(UI_SCALE)
      .on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        this.toggleMusic();
        toggleBtn.setTexture(this.isMusicOn ? IMAGE_KEYS.uiPause : IMAGE_KEYS.uiPlay);
      });
    toggleBtn.on("pointerover", () => toggleBtn.setTint(0xcccccc));
    toggleBtn.on("pointerout", () => toggleBtn.clearTint());
    this.pauseUIContainer.add(toggleBtn);

    const nextBtn = this.add.image(centerX + musicSpacing, musicY, IMAGE_KEYS.uiNext)
      .setInteractive({ useHandCursor: true })
      .setScale(UI_SCALE)
      .on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        this.playNextTrack();
      });
    nextBtn.on("pointerover", () => nextBtn.setTint(0xcccccc));
    nextBtn.on("pointerout", () => nextBtn.clearTint());
    this.pauseUIContainer.add(nextBtn);

    // RESTART — 4px below music
    const restartY = musicY + toggleBtn.displayHeight / 2 + 4 + resumeBtn.displayHeight / 2;
    const restartBtn = this.add.image(centerX, restartY, IMAGE_KEYS.uiRestart)
      .setInteractive({ useHandCursor: true })
      .setScale(UI_SCALE)
      .on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        if (this.cameras.main.postFX) this.cameras.main.postFX.clear();
        this.createRestartConfirmation();
      });
    restartBtn.on("pointerover", () => restartBtn.setTint(0xcccccc));
    restartBtn.on("pointerout", () => restartBtn.clearTint());
    this.pauseUIContainer.add(restartBtn);

    // EXIT — centred between restart bottom and screen bottom
    const restartBottom = restartBtn.y + restartBtn.displayHeight / 2;
    const exitY = restartBottom + (GAME_HEIGHT - restartBottom) / 2;
    const exitBtn = this.add.image(centerX, exitY, IMAGE_KEYS.uiExit)
      .setInteractive({ useHandCursor: true })
      .setScale(UI_SCALE)
      .on("pointerdown", () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        if (this.cameras.main.postFX) this.cameras.main.postFX.clear();
        this.gameMusic?.stop();
        this.scene.start("MenuScene");
      });
    exitBtn.on("pointerover", () => exitBtn.setTint(0xcccccc));
    exitBtn.on("pointerout", () => exitBtn.clearTint());
    this.pauseUIContainer.add(exitBtn);
  }

  /**
   * Creates shop-pack buttons at the top of the pause menu, 20px below the
   * in-game scoreText (pts counter). Returns the bottom Y of the last pack
   * button image (xpp) so callers can continue layout.
   */
  private buildShopUI(container: Phaser.GameObjects.Container): number {
    const centerX = GAME_WIDTH / 2;
    // Anchor top of shop grid 20px below the scoreText bottom edge.
    const scoreBottom = this.scoreText.y + 24; // scoreText origin(1,0), fontSize 24
    const shopTopPad  = scoreBottom + 20;

    // --- Pack definitions ---
    interface PackInfo {
      key: string;
      cost: number;
      reqLevel: number;
      saveFlag: keyof import("../systems/SaveManager").SaveData;
    }
    const PACKS: PackInfo[] = [
      { key: IMAGE_KEYS.uiPackBase,   cost: 200,  reqLevel: 2,  saveFlag: "packBase"   },
      { key: IMAGE_KEYS.uiPackMedium, cost: 600,  reqLevel: 5,  saveFlag: "packMedium" },
      { key: IMAGE_KEYS.uiPackBig,    cost: 1800, reqLevel: 9,  saveFlag: "packBig"    },
      { key: IMAGE_KEYS.uiPackMaxi,   cost: 5400, reqLevel: 12, saveFlag: "packMaxi"   },
      { key: IMAGE_KEYS.uiPackXp,     cost: 100,  reqLevel: 1,  saveFlag: "packXp"     },
    ];

    // Measure button half-dims at UI_SCALE.
    const probe = this.add.image(-9999, -9999, PACKS[0].key).setScale(UI_SCALE);
    const halfW = probe.displayWidth  / 2;
    const halfH = probe.displayHeight / 2;
    probe.destroy();

    const gap = 8; // 8px between buttons in both x and y
    const lx  = centerX - halfW - gap / 2;
    const rx  = centerX + halfW + gap / 2;
    const firstRowY = shopTopPad + halfH; // first row: 20px below scoreText
    const rowGap    = halfH * 2 + 8;     // button height + 8px
    const rowY = [firstRowY, firstRowY + rowGap, firstRowY + rowGap * 2];

    // Grid: [basep, mediump], [bigp, maxip], [xpp centred]
    const grid = [
      { pi: 0, x: lx,      y: rowY[0] },
      { pi: 1, x: rx,      y: rowY[0] },
      { pi: 2, x: lx,      y: rowY[1] },
      { pi: 3, x: rx,      y: rowY[1] },
      { pi: 4, x: centerX, y: rowY[2] },
    ];

    type Entry = { img: Phaser.GameObjects.Image; lbl: Phaser.GameObjects.Text; pack: PackInfo; isXp: boolean };
    const entries: Entry[] = [];

    const refreshAll = () => {
      const sv = SaveManager.load();
      for (const { img, lbl, pack, isXp } of entries) {
        const owned  = sv[pack.saveFlag] as boolean;
        const reqMet = sv.currentLevel >= pack.reqLevel;

        img.setAlpha(1);
        img.removeInteractive();
        img.off("pointerdown").off("pointerover").off("pointerout");

        if (owned) {
          if (!isXp) lbl.setText("OWNED").setColor("#44ff44").setVisible(true);
          img.setTint(0x44ff44);
        } else if (!reqMet) {
          if (!isXp) lbl.setText(`LVL ${pack.reqLevel}`).setColor("#888888").setVisible(true);
          img.setTint(0x444444).setAlpha(0.4);
        } else {
          if (!isXp) lbl.setText("available").setColor("#FFD700").setVisible(true);
          img.clearTint().setInteractive({ useHandCursor: true });
          img.on("pointerover", () => img.setTint(0xcccccc));
          img.on("pointerout",  () => img.clearTint());
          img.on("pointerdown", () => {
            const sv2 = SaveManager.load();
            if ((sv2[pack.saveFlag] as boolean) || sv2.score < pack.cost) return;
            this.playSfx(AUDIO_KEYS.bought, 0.7);
            (sv2 as unknown as Record<string, unknown>)[pack.saveFlag as string] = true;
            sv2.score -= pack.cost;
            SaveManager.save(sv2);
            // Sync in-memory score & on-screen pts counter.
            this.score = sv2.score;
            this.scoreText.setText(`${this.score}`);
            this.packXp    = sv2.packXp;
            this.packBase  = sv2.packBase;
            this.packMedium = sv2.packMedium;
            this.packBig   = sv2.packBig;
            this.packMaxi  = sv2.packMaxi;
            refreshAll();
          });
        }
      }
    };

    for (const { pi, x, y } of grid) {
      const pack = PACKS[pi];
      const isXp = pi === 4; // xpp is the last item, no label
      const img = this.add.image(x, y, pack.key).setScale(UI_SCALE);
      const lbl = this.add.text(x, y + halfH + 9, "", {
        fontFamily: "Orbitron",
        fontSize: "8px",
        color: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 2,
        align: "center",
      }).setOrigin(0.5).setVisible(!isXp);
      container.add([img, lbl]);
      entries.push({ img, lbl, pack, isXp });
    }

    refreshAll();

    // Return the bottom Y of the xpp image (no label underneath).
    const lastImg = entries[entries.length - 1].img;
    return lastImg.y + halfH;
  }

  private destroyPauseUI() {
    if (this.pauseUIContainer) {
      this.pauseUIContainer.destroy();
      this.pauseUIContainer = undefined;
    }
    // Clear blur when closing pause menu (Resume)
    if (this.cameras.main.postFX) {
      this.cameras.main.postFX.clear();
    }
  }

  private pauseGame() {
    if (this.isGameOver) return;
    if (this.isPausedByInput) return;
    this.isPausedByInput = true;
    this.physics.pause();
    this.anims.pauseAll();
    this.tweens.pauseAll();
    this.time.paused = true;

    // Hide the home button while pause menu is open.
    if (this.pauseBtn) {
      this.pauseBtn.setVisible(false);
    }

    this.createPauseUI();
  }

  private resumeGame() {
    if (this.isGameOver) return;
    if (!this.isPausedByInput) return;
    this.isPausedByInput = false;
    this.physics.resume();
    this.anims.resumeAll();
    this.tweens.resumeAll();
    this.time.paused = false;

    // Show the home button again.
    if (this.pauseBtn) {
      this.pauseBtn.setVisible(true);
    }

    this.destroyPauseUI();
  }
}
