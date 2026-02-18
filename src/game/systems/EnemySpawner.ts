import * as Phaser from "phaser";
import type { Enemy, EnemyKind } from "../entities/Enemy";
import { GAME_WIDTH } from "../config";

// Enemy spawn chances (per spawn tick).
const DREADNOUGHT_SPAWN_CHANCE = 0.0001; // 0.01%
const BATTLECRUISER_SPAWN_CHANCE = 0.0001; // 0.01%
const FRIGATE_SPAWN_CHANCE = 0.0001; // 30%
const TORPEDO_SPAWN_CHANCE = 0.0001; // 0.01%
const FIGHTER_SPAWN_CHANCE = 0.0001; // 0.01%

export class EnemySpawner {
  private nextSpawnAt = 0;
  private bossSpawned = false;
  private boss?: Enemy;

  constructor(
    private scene: Phaser.Scene,
    private enemies: Phaser.Physics.Arcade.Group,
    private enemyBullets: Phaser.Physics.Arcade.Group,
  ) {}

  update(time: number) {
    // Boss fight: while the Dreadnought is alive, pause other spawns.
    if (this.boss?.active) return;

    if (time < this.nextSpawnAt) return;

    // Very rare boss spawn (once per run).
    if (!this.bossSpawned && Phaser.Math.FloatBetween(0, 1) < DREADNOUGHT_SPAWN_CHANCE) {
      const spawned = this.spawnBoss();
      if (spawned) {
        this.bossSpawned = true;
        return;
      }
    }

    this.spawnOne();
    this.nextSpawnAt = time + Phaser.Math.Between(600, 1000);
  }

  private spawnBoss(): boolean {
    const x = GAME_WIDTH * 0.5;
    const y = -24;
    const speedY = 0;
    const kind: EnemyKind = "dreadnought";
    const hasShield = true;

    const enemy = this.enemies.get(x, y) as Enemy | null;
    if (!enemy) return false;
    enemy.spawn(x, y, speedY, this.enemyBullets, kind, hasShield);
    this.boss = enemy;
    return true;
  }

  private spawnOne() {
    const x = Phaser.Math.Between(24, GAME_WIDTH - 24);
    const y = -24;
    const speedY = Phaser.Math.Between(90, 160);
    // Regular enemies (boss is spawned separately and very rarely).
    const r = Phaser.Math.FloatBetween(0, 1);
    const kind: EnemyKind =
      r < BATTLECRUISER_SPAWN_CHANCE
        ? "battlecruiser"
        : r < BATTLECRUISER_SPAWN_CHANCE + FRIGATE_SPAWN_CHANCE
          ? "frigate"
          : r < BATTLECRUISER_SPAWN_CHANCE + FRIGATE_SPAWN_CHANCE + TORPEDO_SPAWN_CHANCE
            ? "torpedo"
            : r < BATTLECRUISER_SPAWN_CHANCE + FRIGATE_SPAWN_CHANCE + TORPEDO_SPAWN_CHANCE + FIGHTER_SPAWN_CHANCE
              ? "fighter"
              : "scout";

    const hasShield =
      kind === "battlecruiser"
        ? Phaser.Math.FloatBetween(0, 1) < 0.1
        : kind === "frigate"
          ? Phaser.Math.FloatBetween(0, 1) < 0.5
          : kind === "torpedo"
            ? Phaser.Math.FloatBetween(0, 1) < 0.5
            : kind === "fighter"
              ? Phaser.Math.FloatBetween(0, 1) < 0.01
              : Phaser.Math.FloatBetween(0, 1) < 0.05;

    const enemy = this.enemies.get(x, y) as Enemy | null;
    if (!enemy) return;

    enemy.spawn(x, y, speedY, this.enemyBullets, kind, hasShield);
  }
}
