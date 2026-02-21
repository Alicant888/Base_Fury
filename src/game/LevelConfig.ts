import type { EnemyKind } from "./entities/Enemy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Which parallax overlay set to show behind gameplay. */
export type BgSet = "none" | "asteroids" | "planets";

/** Spawn-weight + shield probability for one enemy kind inside a level. */
export interface EnemySpawnRate {
  kind: EnemyKind;
  /** Relative weight (normalised at runtime). */
  weight: number;
  /** Probability that this kind spawns with a shield (0..1). */
  shieldChance: number;
}

/** A single escort wave during the boss fight. */
export interface EscortWave {
  enemies: { kind: EnemyKind; count: number; hasShield: boolean }[];
}

/** Drop-chance table for pickups (each value 0..1). */
export interface DropChances {
  health: number;
  shield: number;
  firingRate: number;
  autoCannons: number;
  rocket: number;
  zapper: number;
  bigSpaceGun: number;
  baseEngine: number;
  superchargedEngine: number;
  burstEngine: number;
  bigPulseEngine: number;
}

/** Full configuration for a single level. */
export interface LevelConfig {
  level: number;
  /** How long the player must survive (seconds). 0 = boss fight (ends on boss death). */
  durationSec: number;
  bgSet: BgSet;
  /** Asteroid spawn-frequency multiplier (0 = off, 1 = base rate, max 4). */
  asteroidMultiplier: number;
  /** Enemy spawn interval range [min, max] milliseconds. */
  spawnInterval: [number, number];
  /** Enemy vertical speed range [min, max] px/sec. */
  enemySpeed: [number, number];
  /** Weighted enemy distribution for this level. */
  enemies: EnemySpawnRate[];
  /** Pickup drop-chance table. */
  drops: DropChances;

  // --- Boss-level fields (level 10) ---
  isBossLevel: boolean;
  bossHp?: number;
  bossShieldHp?: number;
  /** Interval between escort waves (ms). */
  escortWaveIntervalMs?: number;
  /** Ordered list of escort waves (cycles after the last). */
  escortWaves?: EscortWave[];
}

// ---------------------------------------------------------------------------
// Level definitions (1 – 10)
// ---------------------------------------------------------------------------

export const LEVELS: LevelConfig[] = [
  // -----------------------------------------------------------------------
  // Level 1 – Easy intro (scouts only, no shields, BCG background)
  // -----------------------------------------------------------------------
  {
    level: 1,
    durationSec: 60,
    bgSet: "none",
    asteroidMultiplier: 0,
    spawnInterval: [800, 1200],
    enemySpeed: [70, 120],
    enemies: [
      { kind: "scout", weight: 1.0, shieldChance: 0 },
    ],
    drops: {
      health: 0.05, shield: 0.03, firingRate: 0.03,
      autoCannons: 0, rocket: 0, zapper: 0, bigSpaceGun: 0,
      baseEngine: 0, superchargedEngine: 0, burstEngine: 0, bigPulseEngine: 0,
    },
    isBossLevel: false,
  },

  // -----------------------------------------------------------------------
  // Level 2 – Fighters appear, still no shields
  // -----------------------------------------------------------------------
  {
    level: 2,
    durationSec: 70,
    bgSet: "none",
    asteroidMultiplier: 0,
    spawnInterval: [750, 1100],
    enemySpeed: [75, 130],
    enemies: [
      { kind: "scout", weight: 0.85, shieldChance: 0 },
      { kind: "fighter", weight: 0.15, shieldChance: 0 },
    ],
    drops: {
      health: 0.05, shield: 0.04, firingRate: 0.04,
      autoCannons: 0, rocket: 0, zapper: 0, bigSpaceGun: 0,
      baseEngine: 0.02, superchargedEngine: 0, burstEngine: 0, bigPulseEngine: 0,
    },
    isBossLevel: false,
  },

  // -----------------------------------------------------------------------
  // Level 3 – First shields, auto cannons unlock
  // -----------------------------------------------------------------------
  {
    level: 3,
    durationSec: 80,
    bgSet: "none",
    asteroidMultiplier: 0,
    spawnInterval: [700, 1050],
    enemySpeed: [80, 140],
    enemies: [
      { kind: "scout", weight: 0.65, shieldChance: 0.05 },
      { kind: "fighter", weight: 0.35, shieldChance: 0 },
    ],
    drops: {
      health: 0.05, shield: 0.04, firingRate: 0.05,
      autoCannons: 0.02, rocket: 0, zapper: 0, bigSpaceGun: 0,
      baseEngine: 0.03, superchargedEngine: 0, burstEngine: 0, bigPulseEngine: 0,
    },
    isBossLevel: false,
  },

  // -----------------------------------------------------------------------
  // Level 4 – Asteroids background, torpedo & frigate intro
  // -----------------------------------------------------------------------
  {
    level: 4,
    durationSec: 90,
    bgSet: "asteroids",
    asteroidMultiplier: 1.0,
    spawnInterval: [650, 1000],
    enemySpeed: [85, 150],
    enemies: [
      { kind: "scout", weight: 0.45, shieldChance: 0.05 },
      { kind: "fighter", weight: 0.30, shieldChance: 0.10 },
      { kind: "torpedo", weight: 0.15, shieldChance: 0.10 },
      { kind: "frigate", weight: 0.10, shieldChance: 0.15 },
    ],
    drops: {
      health: 0.04, shield: 0.04, firingRate: 0.04,
      autoCannons: 0.03, rocket: 0, zapper: 0, bigSpaceGun: 0,
      baseEngine: 0.02, superchargedEngine: 0, burstEngine: 0.02, bigPulseEngine: 0,
    },
    isBossLevel: false,
  },

  // -----------------------------------------------------------------------
  // Level 5 – Rockets unlock, stronger shields
  // -----------------------------------------------------------------------
  {
    level: 5,
    durationSec: 100,
    bgSet: "asteroids",
    asteroidMultiplier: 1.5,
    spawnInterval: [600, 950],
    enemySpeed: [90, 155],
    enemies: [
      { kind: "scout", weight: 0.30, shieldChance: 0.10 },
      { kind: "fighter", weight: 0.30, shieldChance: 0.20 },
      { kind: "torpedo", weight: 0.20, shieldChance: 0.25 },
      { kind: "frigate", weight: 0.20, shieldChance: 0.30 },
    ],
    drops: {
      health: 0.04, shield: 0.05, firingRate: 0.04,
      autoCannons: 0.03, rocket: 0.02, zapper: 0, bigSpaceGun: 0,
      baseEngine: 0.02, superchargedEngine: 0, burstEngine: 0.02, bigPulseEngine: 0,
    },
    isBossLevel: false,
  },

  // -----------------------------------------------------------------------
  // Level 6 – Supercharged engine, heavier enemies
  // -----------------------------------------------------------------------
  {
    level: 6,
    durationSec: 110,
    bgSet: "asteroids",
    asteroidMultiplier: 2.0,
    spawnInterval: [600, 900],
    enemySpeed: [90, 160],
    enemies: [
      { kind: "scout", weight: 0.20, shieldChance: 0.10 },
      { kind: "fighter", weight: 0.25, shieldChance: 0.25 },
      { kind: "torpedo", weight: 0.25, shieldChance: 0.30 },
      { kind: "frigate", weight: 0.30, shieldChance: 0.40 },
    ],
    drops: {
      health: 0.04, shield: 0.05, firingRate: 0.04,
      autoCannons: 0.03, rocket: 0.03, zapper: 0, bigSpaceGun: 0,
      baseEngine: 0, superchargedEngine: 0.02, burstEngine: 0.02, bigPulseEngine: 0,
    },
    isBossLevel: false,
  },

  // -----------------------------------------------------------------------
  // Level 7 – Battlecruiser intro, zapper unlock
  // -----------------------------------------------------------------------
  {
    level: 7,
    durationSec: 120,
    bgSet: "asteroids",
    asteroidMultiplier: 2.5,
    spawnInterval: [550, 850],
    enemySpeed: [95, 165],
    enemies: [
      { kind: "scout", weight: 0.15, shieldChance: 0.15 },
      { kind: "fighter", weight: 0.20, shieldChance: 0.30 },
      { kind: "torpedo", weight: 0.25, shieldChance: 0.40 },
      { kind: "frigate", weight: 0.30, shieldChance: 0.50 },
      { kind: "battlecruiser", weight: 0.10, shieldChance: 0.20 },
    ],
    drops: {
      health: 0.05, shield: 0.05, firingRate: 0.03,
      autoCannons: 0.02, rocket: 0.03, zapper: 0.02, bigSpaceGun: 0,
      baseEngine: 0, superchargedEngine: 0.02, burstEngine: 0.02, bigPulseEngine: 0,
    },
    isBossLevel: false,
  },

  // -----------------------------------------------------------------------
  // Level 8 – Heavy combat, big pulse engine
  // -----------------------------------------------------------------------
  {
    level: 8,
    durationSec: 130,
    bgSet: "asteroids",
    asteroidMultiplier: 3.0,
    spawnInterval: [500, 800],
    enemySpeed: [100, 170],
    enemies: [
      { kind: "scout", weight: 0.10, shieldChance: 0.20 },
      { kind: "fighter", weight: 0.20, shieldChance: 0.40 },
      { kind: "torpedo", weight: 0.20, shieldChance: 0.50 },
      { kind: "frigate", weight: 0.30, shieldChance: 0.60 },
      { kind: "battlecruiser", weight: 0.20, shieldChance: 0.30 },
    ],
    drops: {
      health: 0.05, shield: 0.05, firingRate: 0.03,
      autoCannons: 0, rocket: 0.03, zapper: 0.03, bigSpaceGun: 0,
      baseEngine: 0, superchargedEngine: 0.02, burstEngine: 0, bigPulseEngine: 0.02,
    },
    isBossLevel: false,
  },

  // -----------------------------------------------------------------------
  // Level 9 – Big Space Gun unlock, maximum intensity
  // -----------------------------------------------------------------------
  {
    level: 9,
    durationSec: 140,
    bgSet: "asteroids",
    asteroidMultiplier: 3.5,
    spawnInterval: [500, 750],
    enemySpeed: [100, 175],
    enemies: [
      { kind: "scout", weight: 0.05, shieldChance: 0.25 },
      { kind: "fighter", weight: 0.15, shieldChance: 0.50 },
      { kind: "torpedo", weight: 0.20, shieldChance: 0.60 },
      { kind: "frigate", weight: 0.30, shieldChance: 0.70 },
      { kind: "battlecruiser", weight: 0.30, shieldChance: 0.50 },
    ],
    drops: {
      health: 0.05, shield: 0.05, firingRate: 0.03,
      autoCannons: 0, rocket: 0.02, zapper: 0.03, bigSpaceGun: 0.03,
      baseEngine: 0, superchargedEngine: 0, burstEngine: 0, bigPulseEngine: 0.02,
    },
    isBossLevel: false,
  },

  // -----------------------------------------------------------------------
  // Level 10 – Boss fight (Dreadnought HP 200 / Shield 200 + escort waves)
  // -----------------------------------------------------------------------
  {
    level: 10,
    durationSec: 0, // no timer – fight ends when Dreadnought dies
    bgSet: "planets",
    asteroidMultiplier: 4.0,
    spawnInterval: [800, 1200],
    enemySpeed: [90, 150],
    enemies: [
      { kind: "scout", weight: 0.30, shieldChance: 0.30 },
      { kind: "fighter", weight: 0.30, shieldChance: 0.40 },
      { kind: "frigate", weight: 0.40, shieldChance: 0.50 },
    ],
    drops: {
      health: 0.06, shield: 0.06, firingRate: 0.03,
      autoCannons: 0, rocket: 0.03, zapper: 0.03, bigSpaceGun: 0.04,
      baseEngine: 0, superchargedEngine: 0, burstEngine: 0, bigPulseEngine: 0.02,
    },
    isBossLevel: true,
    bossHp: 200,
    bossShieldHp: 200,
    escortWaveIntervalMs: 15_000,
    escortWaves: [
      { enemies: [{ kind: "scout", count: 3, hasShield: false }] },
      { enemies: [{ kind: "scout", count: 2, hasShield: false }, { kind: "fighter", count: 1, hasShield: true }] },
      { enemies: [{ kind: "fighter", count: 2, hasShield: true }, { kind: "torpedo", count: 1, hasShield: true }] },
      { enemies: [{ kind: "fighter", count: 1, hasShield: true }, { kind: "torpedo", count: 1, hasShield: true }, { kind: "frigate", count: 1, hasShield: true }] },
      { enemies: [{ kind: "fighter", count: 2, hasShield: true }, { kind: "frigate", count: 1, hasShield: true }] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Retrieve the config for a given level (clamped to valid range). */
export function getLevelConfig(level: number): LevelConfig {
  const idx = Math.max(0, Math.min(level - 1, LEVELS.length - 1));
  return LEVELS[idx];
}

/** Total number of levels in the game. */
export const TOTAL_LEVELS = LEVELS.length;
