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

  constructor(
    private scene: Phaser.Scene,
    private asteroids: Phaser.Physics.Arcade.Group,
  ) {}

  update(time: number) {
    if (time < this.nextSpawnAt) return;

    this.spawnOne();
    this.nextSpawnAt = time + Phaser.Math.Between(ASTEROID_SPAWN_MIN_MS, ASTEROID_SPAWN_MAX_MS);
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

