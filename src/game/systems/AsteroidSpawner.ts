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

  private spawnOne() {
    const x = Phaser.Math.Between(24, GAME_WIDTH - 24);
    const y = -48;

    const speedY = Phaser.Math.Between(ASTEROID_SPEED_Y_MIN, ASTEROID_SPEED_Y_MAX);
    const scale = Phaser.Math.FloatBetween(ASTEROID_SCALE_MIN, ASTEROID_SCALE_MAX);
    const angleDeg = Phaser.Math.FloatBetween(0, 360);
    const durability = Phaser.Math.Between(1, 19);

    const asteroid = this.asteroids.get(x, y) as Asteroid | null;
    if (!asteroid) return;

    asteroid.spawn(x, y, speedY, scale, angleDeg, durability);
  }
}

