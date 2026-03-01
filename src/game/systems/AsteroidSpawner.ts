import * as Phaser from "phaser";
import type { Asteroid } from "../entities/Asteroid";
import { GAME_WIDTH } from "../config";

const ASTEROID_SPAWN_MIN_MS = 7000;
const ASTEROID_SPAWN_MAX_MS = 12000;

const ASTEROID_SPEED_Y_MIN = 60;
const ASTEROID_SPEED_Y_MAX = 320;

// Random scale from -60% to 200% of base size: 0.4 .. 2.0
const ASTEROID_SCALE_MIN = 0.4;
const ASTEROID_SCALE_MAX = 2.0;

export class AsteroidSpawner {
  private nextSpawnAt = 0;
  /** 0 = disabled, 1 = base rate, up to 4. Higher → shorter intervals. */
  private spawnMultiplier = 1;

  constructor(
    private scene: Phaser.Scene,
    private asteroids: Phaser.Physics.Arcade.Group,
  ) {}

  /** Set from LevelConfig.asteroidMultiplier (0 disables spawning). */
  setMultiplier(mult: number) {
    this.spawnMultiplier = Math.max(0, Math.min(mult, 4));
  }

  update(time: number) {
    if (this.spawnMultiplier <= 0) return; // asteroids disabled for this level

    if (time < this.nextSpawnAt) return;

    this.spawnOne();

    // Higher multiplier → shorter wait (divide interval by multiplier).
    const baseInterval = Phaser.Math.Between(ASTEROID_SPAWN_MIN_MS, ASTEROID_SPAWN_MAX_MS);
    this.nextSpawnAt = time + Math.max(1500, baseInterval / this.spawnMultiplier);
  }

  spawnCustom(params: {
    x: number;
    y: number;
    speedY: number;
    scale: number;
    angleDeg: number;
    durability: number;
    damagesEnemies?: boolean;
  }): boolean {
    const asteroid = this.asteroids.get(params.x, params.y) as Asteroid | null;
    if (!asteroid) return false;
    asteroid.spawn(params.x, params.y, params.speedY, params.scale, params.angleDeg, params.durability, params.damagesEnemies);
    return true;
  }

  /** Extra-dense meteor spawns used by scripted sections (does not affect base spawning). */
  spawnMeteorStormBurst(intensity: 1 | 2 | 3): number {
    const count = intensity === 1 ? 1 : intensity === 2 ? Phaser.Math.Between(1, 2) : Phaser.Math.Between(2, 3);

    const speedMin = intensity === 1 ? 360 : intensity === 2 ? 420 : 480;
    const speedMax = intensity === 1 ? 560 : intensity === 2 ? 660 : 720;

    const scaleMin = intensity === 1 ? 0.35 : intensity === 2 ? 0.28 : 0.24;
    const scaleMax = intensity === 1 ? 0.75 : intensity === 2 ? 0.70 : 0.65;

    const durMax = intensity === 3 ? 3 : 2;

    let spawned = 0;
    for (let i = 0; i < count; i += 1) {
      const x = Phaser.Math.Between(18, GAME_WIDTH - 18);
      const y = -64 - Phaser.Math.Between(0, 220);
      const speedY = Phaser.Math.Between(speedMin, speedMax);
      const scale = Phaser.Math.FloatBetween(scaleMin, scaleMax);
      const angleDeg = Phaser.Math.FloatBetween(0, 360);
      const durability = Phaser.Math.Between(1, durMax);

      if (
        this.spawnCustom({
          x,
          y,
          speedY,
          scale,
          angleDeg,
          durability,
          damagesEnemies: false,
        })
      ) {
        spawned += 1;
      }
    }

    return spawned;
  }

  /** Spawns a 2-row asteroid wall with a random gap. */
  spawnAsteroidWall(options?: { gapWidthPx?: number; speedY?: number }): number {
    const gapWidthPx = Phaser.Math.Clamp(options?.gapWidthPx ?? 88, 64, 140);
    const speedY = Phaser.Math.Clamp(options?.speedY ?? 120, 70, 220);

    const margin = 22;
    const halfGap = gapWidthPx * 0.5;
    const gapCenterX = Phaser.Math.Between(Math.ceil(margin + halfGap), Math.floor(GAME_WIDTH - margin - halfGap));

    const dx = 46;
    const baseY = -64;
    const rows = 2;
    const rowSpacing = 26;

    let spawned = 0;

    for (let row = 0; row < rows; row += 1) {
      const y = baseY - row * rowSpacing;
      const xOffset = row === 0 ? 0 : dx * 0.5;

      for (let x = margin; x <= GAME_WIDTH - margin; x += dx) {
        const px = x + xOffset;
        if (Math.abs(px - gapCenterX) <= halfGap) continue;

        const scale = Phaser.Math.FloatBetween(0.95, 1.45);
        const angleDeg = Phaser.Math.FloatBetween(0, 360);
        const durability = Phaser.Math.Between(8, 16);

        if (
          this.spawnCustom({
            x: px,
            y: y + Phaser.Math.Between(-2, 2),
            speedY,
            scale,
            angleDeg,
            durability,
            damagesEnemies: false,
          })
        ) {
          spawned += 1;
        }
      }
    }

    return spawned;
  }

  private spawnOne() {
    const x = Phaser.Math.Between(24, GAME_WIDTH - 24);
    const y = -48;

    const speedY = Phaser.Math.Between(ASTEROID_SPEED_Y_MIN, ASTEROID_SPEED_Y_MAX);
    const scale = Phaser.Math.FloatBetween(ASTEROID_SCALE_MIN, ASTEROID_SCALE_MAX);
    const angleDeg = Phaser.Math.FloatBetween(0, 360);
    const durability = Phaser.Math.Between(1, 19);

    this.spawnCustom({ x, y, speedY, scale, angleDeg, durability });
  }
}

