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
  /** Secondary weapon animation speed multiplier (1 = default, max 2 = +100%). */
  weaponBonusRate: number;
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
  weaponBonusRate: 1,
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
