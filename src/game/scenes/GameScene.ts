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
import { ATLAS_KEYS, AUDIO_KEYS, BG_FRAMES, GAME_HEIGHT, GAME_WIDTH, SPRITE_FRAMES, UI_FRAMES } from "../config";
import { Button } from "../ui/Button";

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
const ACTIVE_BG_SET: "asteroids" | "planets" = "asteroids";

// Base background (always visible).
const BG_SCROLL_SPEED_BCG = 0.01;

// Asteroids set (reserved for certain levels).
const ASTEROIDS_SCROLL_SPEED_L4 = 0.1;
const ASTEROIDS_SCROLL_SPEED_L5 = 0.2;
const ASTEROIDS_SCROLL_SPEED_L6 = 0.4;


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
const BIG_SPACE_GUN_DAMAGE = 5;
const BIG_SPACE_GUN_WEAPON_OFFSET_X = 0;
const BIG_SPACE_GUN_WEAPON_OFFSET_Y = -2;
const BIG_SPACE_GUN_PROJECTILE_FROM_WEAPON_OFFSET_X = 0;
const BIG_SPACE_GUN_PROJECTILE_FROM_WEAPON_OFFSET_Y = -10;
// Fire a single centered projectile on this weapon frame:
const BIG_SPACE_GUN_WEAPON_FIRE_FRAME = `${SPRITE_FRAMES.bigSpaceGunWeaponPrefix}7${SPRITE_FRAMES.bigSpaceGunWeaponSuffix}`;

// TUNE PICKUP DROP CHANCES HERE (0.0..1.0)
const DROP_CHANCE_BIG_SPACE_GUN = 0.3;
const DROP_CHANCE_ZAPPER = 0.01;
const DROP_CHANCE_ROCKET = 0.01;
const DROP_CHANCE_AUTO_CANNONS = 0.01;
const DROP_CHANCE_BASE_ENGINE = 0.01;
const DROP_CHANCE_SUPERCHARGED_ENGINE = 0.01;
const DROP_CHANCE_BURST_ENGINE = 0.01;
const DROP_CHANCE_BIG_PULSE_ENGINE = 0.01;
const DROP_CHANCE_HEALTH = 0.03;
const DROP_CHANCE_FIRING_RATE = 0.04;
const DROP_CHANCE_SHIELD = 0.04;

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

  constructor() {
    super("GameScene");
  }

  create() {
    this.scale.scaleMode = Phaser.Scale.FIT;
    this.scale.resize(GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBackgroundColor("#000000");

    // Reset run state (Scene instances are reused between starts).
    this.hp = this.maxHp;
    this.kills = 0;
    this.score = 0;
    this.isGameOver = false;
    this.shieldHits = 0;
    this.fireRateMultiplier = 1;
    this.moveSpeedMultiplier = 1;
    this.draggingPointerId = null;
    this.hasDragTarget = false;
    this.activeEngineType = null;
    this.hasAutoCannons = false;
    this.hasRockets = false;
    this.hasZapper = false;
    this.hasBigSpaceGun = false;

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
    this.currentTrackIndex = 0;

    this.destroyPlayerEngineFx();
    this.destroyPlayerWeaponFx();

    // Background (parallax).
    // Base layer: always BCG.
    // Keep all background layers below gameplay objects (bullets, enemies, player, etc).
    this.bgDust = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, BG_FRAMES.bcg).setOrigin(0).setDepth(-10);

    // Overlay set: Asteroids (L4-L6) or Planets (L0-L3).
    // NOTE: Currently active set is "Planets", so L4/L5/L6 are disabled.
    const overlays = BG_OVERLAY_LAYERS[ACTIVE_BG_SET];
    this.bgNebula = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, overlays[0].frame).setOrigin(0).setDepth(-9);
    this.bgStar = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, overlays[1].frame).setOrigin(0).setDepth(-8);
    this.bgL6 = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, overlays[2].frame).setOrigin(0).setDepth(-7);

    const topLayer = overlays[3];
    const topLayerFrame = topLayer ? topLayer.frame : overlays[2].frame;
    this.bgL3 = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, topLayerFrame).setOrigin(0).setDepth(-6);
    this.bgL3.setVisible(!!topLayer);

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
    this.asteroidSpawner = new AsteroidSpawner(this, this.asteroids);

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

    // Game music (starts after START click / audio unlock).
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
  }

  update(time: number, delta: number) {
    if (this.isGameOver) return;
    if (this.isPausedByInput) return;

    // Provide player X for boss AI (safe + cheap).
    this.registry.set("playerX", this.player.x);

    const t = delta / 16.666;
    // Subtract to make the texture appear to move "down".
    this.bgDust.tilePositionY -= BG_SCROLL_SPEED_BCG * t; // BCG (base)

    const overlays = BG_OVERLAY_LAYERS[ACTIVE_BG_SET];
    const planetsOneShot = ACTIVE_BG_SET === "planets";

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

  private onBulletHitsEnemy(bulletObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const bullet = bulletObj as unknown as { active: boolean; kill: () => void };
    const enemy = enemyObj as Enemy;

    if (!bullet.active || !enemy.active) return;

    bullet.kill();
    const destroyed = enemy.onPlayerBulletHit();

    if (destroyed) {
      enemy.kill();

      this.spawnExplosion(enemy.x, enemy.y, enemy.getKind());
      this.playSfx(AUDIO_KEYS.explosionScout, 0.55);
      this.kills += 1;
      this.score += getEnemyXp(enemy.getKind());
      this.scoreText.setText(`${this.score}`);

      this.maybeSpawnPickup(enemy.x, enemy.y);
    }
  }

  private onRocketHitsEnemy(rocketObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const rocket = rocketObj as RocketProjectile;
    const enemy = enemyObj as Enemy;

    if (!rocket.active || !enemy.active) return;

    rocket.kill();
    const destroyed = enemy.onPlayerBulletHit(ROCKET_DAMAGE_MULTIPLIER);

    if (destroyed) {
      enemy.kill();

      this.spawnExplosion(enemy.x, enemy.y, enemy.getKind());
      this.playSfx(AUDIO_KEYS.explosionScout, 0.55);
      this.kills += 1;
      this.score += getEnemyXp(enemy.getKind());
      this.scoreText.setText(`${this.score}`);

      this.maybeSpawnPickup(enemy.x, enemy.y);
    }
  }

  private onZapperHitsEnemy(projObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const proj = projObj as ZapperProjectile;
    const enemy = enemyObj as Enemy;

    if (!proj.active || !enemy.active) return;

    proj.kill();
    const destroyed = enemy.onPlayerBulletHit(ZAPPER_DAMAGE);

    if (destroyed) {
      enemy.kill();

      this.spawnExplosion(enemy.x, enemy.y, enemy.getKind());
      this.playSfx(AUDIO_KEYS.explosionScout, 0.55);
      this.kills += 1;
      this.score += getEnemyXp(enemy.getKind());
      this.scoreText.setText(`${this.score}`);

      this.maybeSpawnPickup(enemy.x, enemy.y);
    }
  }

  private onBigSpaceGunHitsEnemy(projObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const proj = projObj as BigSpaceGunProjectile;
    const enemy = enemyObj as Enemy;

    if (!proj.active || !enemy.active) return;

    proj.kill();
    const destroyed = enemy.onPlayerBulletHit(BIG_SPACE_GUN_DAMAGE);

    if (destroyed) {
      enemy.kill();

      this.spawnExplosion(enemy.x, enemy.y, enemy.getKind());
      this.playSfx(AUDIO_KEYS.explosionScout, 0.55);
      this.kills += 1;
      this.score += getEnemyXp(enemy.getKind());
      this.scoreText.setText(`${this.score}`);

      this.maybeSpawnPickup(enemy.x, enemy.y);
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
    // Stack firing rate increase up to 100% (double speed => 0.5 delay multiplier).
    // Each pickup reduces delay by 0.1 (10%).
    const newMultiplier = Math.max(0.5, this.fireRateMultiplier - 0.1);
    this.setFireRateMultiplier(newMultiplier);
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

  private maybeSpawnPickup(x: number, y: number) {
    if (this.isGameOver) return;

    // Spawn at most one pickup (cumulative thresholds).
    const r = Phaser.Math.FloatBetween(0, 1);
    let threshold = 0;

    threshold += DROP_CHANCE_BIG_SPACE_GUN;
    if (r < threshold) return this.spawnBigSpaceGunPickup(x, y);

    threshold += DROP_CHANCE_ZAPPER;
    if (r < threshold) return this.spawnZapperPickup(x, y);

    threshold += DROP_CHANCE_ROCKET;
    if (r < threshold) return this.spawnRocketPickup(x, y);

    threshold += DROP_CHANCE_AUTO_CANNONS;
    if (r < threshold) return this.spawnAutoCannonsPickup(x, y);

    threshold += DROP_CHANCE_BASE_ENGINE;
    if (r < threshold) return this.spawnBaseEnginePickup(x, y);

    threshold += DROP_CHANCE_SUPERCHARGED_ENGINE;
    if (r < threshold) return this.spawnSuperchargedEnginePickup(x, y);

    threshold += DROP_CHANCE_BURST_ENGINE;
    if (r < threshold) return this.spawnBurstEnginePickup(x, y);

    threshold += DROP_CHANCE_BIG_PULSE_ENGINE;
    if (r < threshold) return this.spawnBigPulseEnginePickup(x, y);

    threshold += DROP_CHANCE_HEALTH;
    if (r < threshold) return this.spawnHealthPickup(x, y);

    threshold += DROP_CHANCE_FIRING_RATE;
    if (r < threshold) return this.spawnFiringRatePickup(x, y);

    threshold += DROP_CHANCE_SHIELD;
    if (r < threshold) return this.spawnShieldPickup(x, y);
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

    // Hide pause button
    if (this.pauseBtn) this.pauseBtn.setVisible(false);

    const depth = 100;
    const padding = 18;

    // Interactive dim blocks clicks to underlying UI (e.g. back button).
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0).setDepth(depth).setInteractive();

    const panel = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, ATLAS_KEYS.ui, UI_FRAMES.panelWindow).setDepth(depth + 1);

    this.add
      .text(GAME_WIDTH / 2, panel.y - panel.displayHeight / 2 + 36, "GAME OVER", {
        fontFamily: "Orbitron",
        fontSize: "32px",
        color: "#ff0000",
        stroke: "#000000",
        strokeThickness: 6,
        shadow: { color: "#ff0000", blur: 10, fill: true, stroke: true }
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);

    this.add
      .text(GAME_WIDTH / 2, panel.y + 10, `ENEMIES DESTROYED: ${this.kills}`, {
        fontFamily: "Orbitron",
        fontSize: "18px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
        padding: { x: 8, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);

    const btnY = GAME_HEIGHT - padding - 80; // Moved up a bit

    const playAgainBtn = new Button({
      scene: this,
      x: GAME_WIDTH / 2 - 80, // Offset left
      y: btnY,
      text: "RETRY",
      width: 140,
      height: 50,
      type: "ok",
      onClick: () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        dim.destroy();
        panel.destroy();
        this.scene.restart();
      }
    }).setDepth(depth + 2);

    const exitBtn = new Button({
      scene: this,
      x: GAME_WIDTH / 2 + 80, // Offset right
      y: btnY,
      text: "EXIT",
      width: 140,
      height: 50,
      type: "danger",
      onClick: () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        dim.destroy();
        panel.destroy();
        this.gameMusic?.stop();
        this.scene.start("MenuScene");
      }
    }).setDepth(depth + 2);
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
      18,
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
    const btnY = GAME_HEIGHT - 40;
    
    // Center Pause button
    const rightX = GAME_WIDTH / 2;

    // Pause (Center)
    this.pauseBtn = new Button({
      scene: this,
      x: rightX,
      y: btnY,
      icon: UI_FRAMES.iconPause,
      width: 80,
      height: 60,
      iconScale: 0.8,
      onClick: () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);
        if (this.isPausedByInput) {
          this.resumeGame();
        } else {
          this.pauseGame();
        }
      }
    });
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

  private createConfirmationDialog(text: string, onYes: () => void, onNo: () => void) {
    const depth = 200;
    const container = this.add.container(0, 0).setDepth(depth);

    // Blocker
    const blocker = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setOrigin(0)
      .setInteractive();
    container.add(blocker);

    // Dialog Box
    const dialogX = GAME_WIDTH / 2;
    const dialogY = GAME_HEIGHT / 2;
    const dialogWidth = 320;
    const dialogHeight = 250;

    const dialogBg = this.add.rectangle(dialogX, dialogY, dialogWidth, dialogHeight, 0x000000)
      .setStrokeStyle(4, 0xffffff);
    container.add(dialogBg);

    const message = this.add.text(dialogX, dialogY - 40, text, {
      fontFamily: "Orbitron",
      fontSize: "28px",
      color: "#ffffff",
      align: "center"
    }).setOrigin(0.5);
    container.add(message);

    const yesBtn = new Button({
      scene: this,
      x: dialogX - 70, // Slightly closer to center
      y: dialogY + 50,
      text: "YES",
      width: 120,
      height: 50,
      type: "ok",
      fontSize: 20,
      onClick: () => {
        onYes();
        container.destroy();
      }
    });

    const noBtn = new Button({
      scene: this,
      x: dialogX + 70, // Slightly closer to center
      y: dialogY + 50,
      text: "NO",
      width: 120,
      height: 50,
      type: "danger",
      fontSize: 20,
      onClick: () => {
        onNo();
        container.destroy();
      }
    });

    container.add([yesBtn, noBtn]);
  }

  private createPauseUI() {
    const depth = 100;
    // Music controls at 25% from bottom (GAME_HEIGHT * 0.75).
    const y = GAME_HEIGHT * 0.75;
    const spacing = 80;

    this.pauseUIContainer = this.add.container(0, 0).setDepth(depth);

    // Dim background
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5).setOrigin(0).setInteractive();
    this.pauseUIContainer.add(dim);

    const pausedText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "PAUSED", {
        fontFamily: "Orbitron",
        fontSize: "48px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
    }).setOrigin(0.5);
    this.pauseUIContainer.add(pausedText);

    // Prev Button (Left)
    const prevBtn = new Button({
      scene: this,
      x: GAME_WIDTH / 2 - spacing,
      y: y,
      icon: UI_FRAMES.iconBack,
      width: 77,
      height: 60,
      iconScale: 0.8,
      onClick: () => {
         this.playSfx(AUDIO_KEYS.click, 0.7);
         this.playPrevTrack();
      }
    });
    this.pauseUIContainer.add(prevBtn);

    // Toggle Button (Center)
    const toggleBtn = new Button({
      scene: this,
      x: GAME_WIDTH / 2,
      y: y,
      icon: this.isMusicOn ? UI_FRAMES.iconSoundOn : UI_FRAMES.iconSoundOff,
      width: 77,
      height: 60,
      iconScale: 0.8,
      onClick: () => {
         this.playSfx(AUDIO_KEYS.click, 0.7);
         this.toggleMusic();
         toggleBtn.setIcon(this.isMusicOn ? UI_FRAMES.iconSoundOn : UI_FRAMES.iconSoundOff);
      }
    });
    // Add Note icon in middle (using text for now as requested)
    const note = this.add.text(0, 0, "♫", { 
        fontFamily: "Orbitron", 
        fontSize: "24px", 
        color: "#00ffff",
        stroke: "#000000",
        strokeThickness: 2
    }).setOrigin(0.5);
    toggleBtn.add(note);
    this.pauseUIContainer.add(toggleBtn);

    // Next Button (Right)
    const nextBtn = new Button({
      scene: this,
      x: GAME_WIDTH / 2 + spacing,
      y: y,
      icon: UI_FRAMES.iconBack,
      width: 77,
      height: 60,
      iconScale: 0.8,
      onClick: () => {
         this.playSfx(AUDIO_KEYS.click, 0.7);
         this.playNextTrack();
      }
    });
    const nextIcon = nextBtn.getIcon();
    if (nextIcon) nextIcon.setFlipX(true); // Flip back arrow for Next
    this.pauseUIContainer.add(nextBtn);

    // Menu Button (Below controls, centered, wide)
    const menuBtnY = y + 80;
    const menuBtn = new Button({
      scene: this,
      x: GAME_WIDTH / 2,
      y: menuBtnY,
      text: "MENU",
      width: 240,
      height: 60,
      fontSize: 24,
      onClick: () => {
        this.playSfx(AUDIO_KEYS.click, 0.7);

        this.createConfirmationDialog("Are you sure?", () => {
            this.gameMusic?.stop();
            this.scene.start("MenuScene");
        }, () => {
            // Do nothing, just close dialog
        });
      }
    });
    this.pauseUIContainer.add(menuBtn);
  }

  private destroyPauseUI() {
      if (this.pauseUIContainer) {
          this.pauseUIContainer.destroy();
          this.pauseUIContainer = undefined;
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
    this.destroyPauseUI();
  }
}
