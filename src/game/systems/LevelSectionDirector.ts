import * as Phaser from "phaser";
import type { EnemyWaveMode, LevelConfig, LevelSection } from "../LevelConfig";
import type { EnemySpawner } from "./EnemySpawner";
import type { AsteroidSpawner } from "./AsteroidSpawner";

const WAVE_MODE_PRIORITY: Record<EnemyWaveMode, number> = {
  normal: 0,
  rush: 1,
  formations: 2,
  hazard: 3,
};

export class LevelSectionDirector {
  private levelConfig?: LevelConfig;
  private nextMeteorAt = 0;
  private nextWallAt = 0;
  private appliedWaveMode: EnemyWaveMode = "normal";

  constructor(
    private enemySpawner: EnemySpawner,
    private asteroidSpawner: AsteroidSpawner,
  ) {}

  setLevelConfig(config: LevelConfig) {
    this.levelConfig = config;
    this.nextMeteorAt = 0;
    this.nextWallAt = 0;
    this.applyWaveMode("normal");
  }

  update(time: number, distanceTraveled: number) {
    const sections = this.levelConfig?.sections;
    if (!sections?.length) {
      this.nextMeteorAt = 0;
      this.nextWallAt = 0;
      this.applyWaveMode("normal");
      return;
    }

    const active = sections.filter(s => distanceTraveled >= s.from && distanceTraveled < s.to);

    // --- Wave mode selection (explicit section wins; otherwise hazards imply hazard-mode).
    const explicitWaveMode = this.pickWaveMode(active);
    const hazardActive = active.some(s => s.type === "meteorStorm" || s.type === "asteroidWall");
    const desiredWaveMode: EnemyWaveMode = explicitWaveMode ?? (hazardActive ? "hazard" : "normal");
    this.applyWaveMode(desiredWaveMode);

    // --- Meteor storm (extra fast, small hazards).
    const storm = active.find(s => s.type === "meteorStorm") as Extract<LevelSection, { type: "meteorStorm" }> | undefined;
    if (storm) {
      const intensity = storm.intensity ?? 2;
      if (this.nextMeteorAt === 0) this.nextMeteorAt = time;

      if (time >= this.nextMeteorAt) {
        this.asteroidSpawner.spawnMeteorStormBurst(intensity);
        this.nextMeteorAt = time + this.getMeteorIntervalMs(intensity);
      }
    } else {
      this.nextMeteorAt = 0;
    }

    // --- Asteroid wall (periodic "gate" rows).
    const wall = active.find(s => s.type === "asteroidWall") as Extract<LevelSection, { type: "asteroidWall" }> | undefined;
    if (wall) {
      const intervalMs = Phaser.Math.Clamp(wall.intervalMs ?? 1900, 1000, 5000);
      const gapWidthPx = Phaser.Math.Clamp(wall.gapWidthPx ?? 88, 64, 140);

      if (this.nextWallAt === 0) this.nextWallAt = time;

      if (time >= this.nextWallAt) {
        this.asteroidSpawner.spawnAsteroidWall({ gapWidthPx });
        const jitter = Phaser.Math.FloatBetween(0.85, 1.15);
        this.nextWallAt = time + Math.round(intervalMs * jitter);
      }
    } else {
      this.nextWallAt = 0;
    }
  }

  private applyWaveMode(mode: EnemyWaveMode) {
    if (this.appliedWaveMode === mode) return;
    this.appliedWaveMode = mode;
    this.enemySpawner.setWaveMode(mode);
  }

  private pickWaveMode(active: LevelSection[]): EnemyWaveMode | null {
    const modes = active
      .filter((s): s is Extract<LevelSection, { type: "waveMode" }> => s.type === "waveMode")
      .map(s => s.mode);
    if (!modes.length) return null;

    let best: EnemyWaveMode = "normal";
    for (const mode of modes) {
      if (WAVE_MODE_PRIORITY[mode] > WAVE_MODE_PRIORITY[best]) best = mode;
    }
    return best;
  }

  private getMeteorIntervalMs(intensity: 1 | 2 | 3): number {
    const min = intensity === 1 ? 280 : intensity === 2 ? 220 : 180;
    const max = intensity === 1 ? 360 : intensity === 2 ? 300 : 260;
    return Phaser.Math.Between(min, max);
  }
}

