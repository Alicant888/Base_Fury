/**
 * Persists player progress between levels using localStorage.
 *
 * Saved between levels:
 *  - current level number
 *  - collected weapons (auto cannons, rockets, zapper, big space gun)
 *  - active engine type
 *  - highest score achieved
 */

const SAVE_KEY = "space_shooter_save";

export interface SaveData {
  currentLevel: number;
  hasAutoCannons: boolean;
  hasRockets: boolean;
  hasZapper: boolean;
  hasBigSpaceGun: boolean;
  activeEngineType: "base" | "supercharged" | "burst" | "bigPulse" | null;
  highScore: number;
  /** Accumulated XP (score) carried across levels. */
  score: number;
  /** Main weapon fire-rate multiplier (1 = default, 0.25 = 300% cap). */
  fireRateMultiplier: number;
  /** Per-weapon animation speed multipliers (1 = default, max 3 = +200%). */
  weaponBonusRateAutoCannons: number;
  weaponBonusRateRockets: number;
  weaponBonusRateZapper: number;
  weaponBonusRateBigSpaceGun: number;
  /** Whether fan (spread) shooting is active. */
  hasFanShot: boolean;
  /** Fan bullets fire-rate multiplier (1 = base, 0.5 = +100% cap). */
  fanFireRateMultiplier: number;
  // --- Drone (satellite) ---
  /** Whether the drone is active (persists between levels). */
  hasDrone: boolean;
  /** Drone hidden HP (default 4). */
  droneHp: number;
  /** Drone fire-rate multiplier (1 = base, 1/3 = +200% cap). */
  droneFireRateMultiplier: number;
  // --- Shop packs (purchased once, persist forever) ---
  /** XP Pack: ETH-only purchase, adds +5 Main Ship durability. */
  packXp: boolean;
  /** Base Pack: unlocks Auto Cannons + Base Engine drops (points or ETH). Req level 2. */
  packBase: boolean;
  /** Medium Pack: unlocks Rocket + Supercharged Engine drops (points or ETH). Req level 5. */
  packMedium: boolean;
  /** Big Pack: unlocks Zapper + Burst Engine drops (points or ETH). Req level 9. */
  packBig: boolean;
  /** Maxi Pack: unlocks Big Space Gun + Big Pulse Engine drops (points or ETH). Req level 12. */
  packMaxi: boolean;
  /** Drone Pack: unlocks Drone (satellite) pickup drops (points or ETH). Req level 2. */
  packDrone: boolean;
}

const DEFAULT_SAVE: SaveData = {
  currentLevel: 1,
  hasAutoCannons: false,
  hasRockets: false,
  hasZapper: false,
  hasBigSpaceGun: false,
  activeEngineType: null,
  highScore: 0,
  score: 0,
  fireRateMultiplier: 1,
  weaponBonusRateAutoCannons: 1,
  weaponBonusRateRockets: 1,
  weaponBonusRateZapper: 1,
  weaponBonusRateBigSpaceGun: 1,
  hasFanShot: false,
  fanFireRateMultiplier: 1,
  hasDrone: false,
  droneHp: 0,
  droneFireRateMultiplier: 1,
  packXp: false,
  packBase: false,
  packMedium: false,
  packBig: false,
  packMaxi: false,
  packDrone: false,
};

export class SaveManager {
  /** Persist save data to localStorage. */
  static save(data: SaveData): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // localStorage unavailable (e.g. incognito quota)
    }
  }

  /** Load save data (returns defaults if nothing stored). */
  static load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULT_SAVE };
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return { ...DEFAULT_SAVE, ...parsed };
    } catch {
      return { ...DEFAULT_SAVE };
    }
  }

  /** Returns true when a saved game exists. */
  static hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  /** Delete saved game (new game). */
  static clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
  }
}
