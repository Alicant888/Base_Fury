import type { EnemyKind } from "./entities/Enemy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Which parallax overlay set to show behind gameplay. */
export type BgSet = "none" | "asteroids" | "planets";

/** Enemy spawner "wave modes" used by scripted sections. */
export type EnemyWaveMode = "normal" | "rush" | "formations" | "hazard";

/** Scripted level section (distance-based). */
export type LevelSection =
  | {
      type: "meteorStorm";
      /** Inclusive start distance (scroll units). */
      from: number;
      /** Exclusive end distance (scroll units). */
      to: number;
      /** 1..3 (higher = denser + faster meteors). */
      intensity?: 1 | 2 | 3;
    }
  | {
      type: "asteroidWall";
      from: number;
      to: number;
      /** Time between wall rows (ms). */
      intervalMs?: number;
      /** Gap width in pixels. */
      gapWidthPx?: number;
    }
  | {
      type: "waveMode";
      from: number;
      to: number;
      mode: EnemyWaveMode;
    };

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
  /** Secondary weapon speed boost pickup (FX2 atlas). */
  firingRate2: number;
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
  /** Distance the ship must fly to complete the level (scroll units). 0 = boss fight. */
  distanceGoal: number;
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
  /** Optional scripted sections that modify spawning / hazards. */
  sections?: LevelSection[];

  // --- Boss-level fields (level 10) ---
  isBossLevel: boolean;
  /**
   * When true the level plays as a regular distance-based level, but once the
   * distanceGoal is reached a boss spawns instead of showing the completion
   * screen.  The level ends when the boss is defeated.
   */
  bossAfterDistance?: boolean;
  bossHp?: number;
  bossShieldHp?: number;
  /** Interval between escort waves (ms). */
  escortWaveIntervalMs?: number;
  /** Ordered list of escort waves (cycles after the last). */
  escortWaves?: EscortWave[];
}

// ---------------------------------------------------------------------------
// Level definitions (1 вЂ“ 16)
// Backgrounds:  L1-5  в†’ none  |  L6-11 в†’ asteroids  |  L12-16 в†’ planets
// Weapons/engines always 0 in drops вЂ“ unlocked by shop packs.
// ---------------------------------------------------------------------------

/** Reusable zero block for all weapon/engine drop fields. */
const NWD = {
  autoCannons: 0, rocket: 0, zapper: 0, bigSpaceGun: 0,
  baseEngine: 0, superchargedEngine: 0, burstEngine: 0, bigPulseEngine: 0,
} as const;

export const LEVELS: LevelConfig[] = [
  // -----------------------------------------------------------------------
  // Level 1 вЂ“ Easy intro (scouts only, no shields, no drops)
  // -----------------------------------------------------------------------
  {
    level: 1, distanceGoal: 100, bgSet: "none",
    asteroidMultiplier: 0, spawnInterval: [800, 1200], enemySpeed: [70, 120],
    enemies: [{ kind: "scout", weight: 1.0, shieldChance: 0 }],
    drops: { health: 0, shield: 0, firingRate: 0, firingRate2: 0, ...NWD },
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 2 вЂ“ Fighters appear
  // -----------------------------------------------------------------------
  {
    level: 2, distanceGoal: 400, bgSet: "none",
    asteroidMultiplier: 0, spawnInterval: [750, 1100], enemySpeed: [75, 130],
    enemies: [
      { kind: "scout", weight: 0.85, shieldChance: 0 },
      { kind: "fighter", weight: 0.15, shieldChance: 0 },
    ],
    drops: { health: 0.02, shield: 0.1, firingRate: 0.01, firingRate2: 0.01, ...NWD },
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 3 вЂ“ First shields
  // -----------------------------------------------------------------------
  {
    level: 3, distanceGoal: 400, bgSet: "none",
    asteroidMultiplier: 0, spawnInterval: [700, 1050], enemySpeed: [80, 140],
    enemies: [
      { kind: "scout", weight: 0.60, shieldChance: 0.05 },
      { kind: "fighter", weight: 0.30, shieldChance: 0 },
      { kind: "bomber", weight: 0.10, shieldChance: 1 },
    ],
    drops: { health: 0.02, shield: 0.1, firingRate: 0.01, firingRate2: 0.01, ...NWD },
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 4 вЂ“ Torpedo & frigate intro
  // -----------------------------------------------------------------------
  {
    level: 4, distanceGoal: 400, bgSet: "none",
    asteroidMultiplier: 1.0, spawnInterval: [650, 1000], enemySpeed: [85, 150],
    enemies: [
      { kind: "scout", weight: 0.40, shieldChance: 0.05 },
      { kind: "fighter", weight: 0.25, shieldChance: 0.10 },
      { kind: "torpedo", weight: 0.15, shieldChance: 0.10 },
      { kind: "frigate", weight: 0.10, shieldChance: 0.15 },
      { kind: "bomber", weight: 0.10, shieldChance: 1 },
    ],
    drops: { health: 0.02, shield: 0.10, firingRate: 0.01, firingRate2: 0.01, ...NWD },
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 5 вЂ“ Stronger shields
  // -----------------------------------------------------------------------
  {
    level: 5, distanceGoal: 500, bgSet: "none",
    asteroidMultiplier: 1.5, spawnInterval: [600, 950], enemySpeed: [90, 155],
    enemies: [
      { kind: "scout", weight: 0.25, shieldChance: 0.10 },
      { kind: "fighter", weight: 0.25, shieldChance: 0.20 },
      { kind: "torpedo", weight: 0.20, shieldChance: 0.25 },
      { kind: "frigate", weight: 0.20, shieldChance: 0.30 },
      { kind: "bomber", weight: 0.10, shieldChance: 1 },
    ],
    drops: { health: 0.02, shield: 0.10, firingRate: 0.01, firingRate2: 0.01, ...NWD },
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 6 вЂ“ Asteroids background begins
  // -----------------------------------------------------------------------
  {
    level: 6, distanceGoal: 500, bgSet: "asteroids",
    asteroidMultiplier: 3, spawnInterval: [600, 900], enemySpeed: [90, 160],
    enemies: [
      { kind: "scout", weight: 0.15, shieldChance: 0.10 },
      { kind: "fighter", weight: 0.20, shieldChance: 0.25 },
      { kind: "torpedo", weight: 0.25, shieldChance: 0.30 },
      { kind: "frigate", weight: 0.25, shieldChance: 0.40 },
      { kind: "bomber", weight: 0.15, shieldChance: 1 },
    ],
    drops: { health: 0.02, shield: 0.10, firingRate: 0.01, firingRate2: 0.01, ...NWD },
    sections: [
      { type: "meteorStorm", from: 70, to: 95, intensity: 1 },
      { type: "waveMode", from: 180, to: 220, mode: "formations" },
      { type: "asteroidWall", from: 300, to: 330, intervalMs: 2000, gapWidthPx: 92 },
    ],
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 7 вЂ“ Battlecruiser intro
  // -----------------------------------------------------------------------
  {
    level: 7, distanceGoal: 500, bgSet: "asteroids",
    asteroidMultiplier: 3, spawnInterval: [550, 850], enemySpeed: [95, 165],
    enemies: [
      { kind: "scout", weight: 0.10, shieldChance: 0.15 },
      { kind: "fighter", weight: 0.15, shieldChance: 0.30 },
      { kind: "torpedo", weight: 0.20, shieldChance: 0.40 },
      { kind: "frigate", weight: 0.25, shieldChance: 0.50 },
      { kind: "battlecruiser", weight: 0.10, shieldChance: 0.20 },
      { kind: "bomber", weight: 0.20, shieldChance: 1 },
    ],
    drops: { health: 0.02, shield: 0.10, firingRate: 0.01, firingRate2: 0.01, ...NWD },
    sections: [
      { type: "waveMode", from: 90, to: 140, mode: "rush" },
      { type: "asteroidWall", from: 340, to: 380, intervalMs: 1900, gapWidthPx: 88 },
    ],
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 8 вЂ“ Heavy combat
  // -----------------------------------------------------------------------
  {
    level: 8, distanceGoal: 500, bgSet: "asteroids",
    asteroidMultiplier: 3.0, spawnInterval: [500, 800], enemySpeed: [100, 170],
    enemies: [
      { kind: "scout", weight: 0.10, shieldChance: 0.20 },
      { kind: "fighter", weight: 0.15, shieldChance: 0.40 },
      { kind: "torpedo", weight: 0.15, shieldChance: 0.50 },
      { kind: "frigate", weight: 0.25, shieldChance: 0.60 },
      { kind: "battlecruiser", weight: 0.15, shieldChance: 0.30 },
      { kind: "bomber", weight: 0.20, shieldChance: 1 },
    ],
    drops: { health: 0.02, shield: 0.10, firingRate: 0.01, firingRate2: 0.01, ...NWD },
    sections: [
      { type: "meteorStorm", from: 60, to: 85, intensity: 2 },
      { type: "waveMode", from: 170, to: 230, mode: "formations" },
    ],
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 9 вЂ“ Maximum intensity (asteroids)
  // -----------------------------------------------------------------------
  {
    level: 9, distanceGoal: 500, bgSet: "asteroids",
    asteroidMultiplier: 3.5, spawnInterval: [500, 750], enemySpeed: [100, 175],
    enemies: [
      { kind: "scout", weight: 0.05, shieldChance: 0.25 },
      { kind: "fighter", weight: 0.10, shieldChance: 0.50 },
      { kind: "torpedo", weight: 0.15, shieldChance: 0.60 },
      { kind: "frigate", weight: 0.25, shieldChance: 0.70 },
      { kind: "battlecruiser", weight: 0.25, shieldChance: 0.50 },
      { kind: "bomber", weight: 0.20, shieldChance: 1 },
    ],
    drops: { health: 0.02, shield: 0.10, firingRate: 0.01, firingRate2: 0.01, ...NWD },
    sections: [
      { type: "asteroidWall", from: 200, to: 250, intervalMs: 1650, gapWidthPx: 86 },
      { type: "meteorStorm", from: 330, to: 360, intensity: 3 },
    ],
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 10 вЂ“ Last pure-asteroids level
  // -----------------------------------------------------------------------
  {
    level: 10, distanceGoal: 500, bgSet: "asteroids",
    asteroidMultiplier: 4, spawnInterval: [480, 720], enemySpeed: [105, 180],
    enemies: [
      { kind: "scout", weight: 0.05, shieldChance: 0.30 },
      { kind: "fighter", weight: 0.10, shieldChance: 0.55 },
      { kind: "torpedo", weight: 0.15, shieldChance: 0.65 },
      { kind: "frigate", weight: 0.25, shieldChance: 0.75 },
      { kind: "battlecruiser", weight: 0.25, shieldChance: 0.55 },
      { kind: "bomber", weight: 0.20, shieldChance: 1 },
    ],
    drops: { health: 0.02, shield: 0.10, firingRate: 0.02, firingRate2: 0.02, ...NWD },
    sections: [
      { type: "waveMode", from: 120, to: 180, mode: "formations" },
      { type: "meteorStorm", from: 260, to: 290, intensity: 3 },
    ],
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 11 вЂ“ Still asteroids (planets start at 12)
  // -----------------------------------------------------------------------
  {
    level: 11, distanceGoal: 500, bgSet: "asteroids",
    asteroidMultiplier: 5, spawnInterval: [470, 700], enemySpeed: [105, 180],
    enemies: [
      { kind: "scout", weight: 0.05, shieldChance: 0.35 },
      { kind: "fighter", weight: 0.10, shieldChance: 0.55 },
      { kind: "torpedo", weight: 0.15, shieldChance: 0.70 },
      { kind: "frigate", weight: 0.30, shieldChance: 0.80 },
      { kind: "battlecruiser", weight: 0.25, shieldChance: 0.60 },
      { kind: "bomber", weight: 0.15, shieldChance: 1 },
    ],
    drops: { health: 0.05, shield: 0.20, firingRate: 0.02, firingRate2: 0.02, ...NWD },
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 12 вЂ“ Planets background begins, battlecruiser heavy
  // -----------------------------------------------------------------------
  {
    level: 12, distanceGoal: 500, bgSet: "planets",
    asteroidMultiplier: 3.5, spawnInterval: [460, 680], enemySpeed: [110, 185],
    enemies: [
      { kind: "scout", weight: 0.05, shieldChance: 0.40 },
      { kind: "fighter", weight: 0.10, shieldChance: 0.60 },
      { kind: "torpedo", weight: 0.10, shieldChance: 0.70 },
      { kind: "frigate", weight: 0.30, shieldChance: 0.85 },
      { kind: "battlecruiser", weight: 0.30, shieldChance: 0.65 },
      { kind: "bomber", weight: 0.15, shieldChance: 1 },
    ],
    drops: { health: 0.05, shield: 0.20, firingRate: 0.02, firingRate2: 0.02, ...NWD },
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 13 вЂ“ Elite enemies
  // -----------------------------------------------------------------------
  {
    level: 13, distanceGoal: 500, bgSet: "planets",
    asteroidMultiplier: 3.5, spawnInterval: [450, 660], enemySpeed: [110, 190],
    enemies: [
      { kind: "scout", weight: 0.05, shieldChance: 0.45 },
      { kind: "fighter", weight: 0.10, shieldChance: 0.65 },
      { kind: "torpedo", weight: 0.10, shieldChance: 0.75 },
      { kind: "frigate", weight: 0.30, shieldChance: 0.90 },
      { kind: "battlecruiser", weight: 0.30, shieldChance: 0.70 },
      { kind: "bomber", weight: 0.15, shieldChance: 1 },
    ],
    drops: { health: 0.05, shield: 0.20, firingRate: 0.02, firingRate2: 0.02, ...NWD },
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 14 вЂ“ Pre-boss gauntlet
  // -----------------------------------------------------------------------
  {
    level: 14, distanceGoal: 500, bgSet: "planets",
    asteroidMultiplier: 3.5, spawnInterval: [440, 640], enemySpeed: [115, 195],
    enemies: [
      { kind: "scout", weight: 0.05, shieldChance: 0.50 },
      { kind: "fighter", weight: 0.10, shieldChance: 0.70 },
      { kind: "torpedo", weight: 0.10, shieldChance: 0.80 },
      { kind: "frigate", weight: 0.25, shieldChance: 0.90 },
      { kind: "battlecruiser", weight: 0.35, shieldChance: 0.75 },
      { kind: "bomber", weight: 0.15, shieldChance: 1 },
    ],
    drops: { health: 0.05, shield: 0.20, firingRate: 0.02, firingRate2: 0.02, ...NWD },
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 15 вЂ�� Heavy gauntlet (no boss)
  // -----------------------------------------------------------------------
  {
    level: 15, distanceGoal: 500, bgSet: "planets",
    asteroidMultiplier: 3.5, spawnInterval: [430, 640], enemySpeed: [115, 200],
    enemies: [
      { kind: "scout", weight: 0.05, shieldChance: 0.50 },
      { kind: "fighter", weight: 0.10, shieldChance: 0.70 },
      { kind: "torpedo", weight: 0.10, shieldChance: 0.80 },
      { kind: "frigate", weight: 0.25, shieldChance: 0.90 },
      { kind: "battlecruiser", weight: 0.35, shieldChance: 0.90 },
      { kind: "bomber", weight: 0.15, shieldChance: 1 },
    ],
    drops: { health: 0.05, shield: 0.20, firingRate: 0.1, firingRate2: 0.01, ...NWD },
    isBossLevel: false,
  },
  // -----------------------------------------------------------------------
  // Level 16 вЂ“ Final: regular fight в†’ Dreadnought boss at end of distance
  // -----------------------------------------------------------------------
  {
    level: 16, distanceGoal: 600, bgSet: "planets",
    asteroidMultiplier: 3.5, spawnInterval: [430, 620], enemySpeed: [115, 200],
    enemies: [
      { kind: "scout", weight: 0.05, shieldChance: 1 },
      { kind: "fighter", weight: 0.10, shieldChance: 1 },
      { kind: "torpedo", weight: 0.10, shieldChance: 1 },
      { kind: "frigate", weight: 0.25, shieldChance: 1 },
      { kind: "battlecruiser", weight: 0.35, shieldChance: 1 },
      { kind: "bomber", weight: 0.15, shieldChance: 1 },
    ],
    drops: { health: 0.05, shield: 0.20, firingRate: 0.01, firingRate2: 0.01, ...NWD },
    isBossLevel: false,
    bossAfterDistance: true,
    bossHp: 5000, bossShieldHp: 5000, escortWaveIntervalMs: 4_000,
    escortWaves: [
      { enemies: [{ kind: "scout", count: 10, hasShield: false }] },
      { enemies: [{ kind: "fighter", count: 6, hasShield: true }, { kind: "torpedo", count: 2, hasShield: true }] },
      { enemies: [{ kind: "frigate", count: 4, hasShield: true }, { kind: "battlecruiser", count: 2, hasShield: true }] },
      { enemies: [{ kind: "fighter", count: 6, hasShield: true }, { kind: "frigate", count: 2, hasShield: true }, { kind: "torpedo", count: 1, hasShield: true }] },
      { enemies: [{ kind: "battlecruiser", count: 3, hasShield: true }, { kind: "frigate", count: 3, hasShield: true }] },
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
