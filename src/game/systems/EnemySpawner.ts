import Phaser from "phaser";
import type { Enemy, EnemyKind } from "../entities/Enemy";
import { GAME_WIDTH } from "../config";

export class EnemySpawner {
  private nextSpawnAt = 0;

  constructor(
    private scene: Phaser.Scene,
    private enemies: Phaser.Physics.Arcade.Group,
    private enemyBullets: Phaser.Physics.Arcade.Group,
  ) {}

  update(time: number) {
    if (time < this.nextSpawnAt) return;

    this.spawnOne();
    this.nextSpawnAt = time + Phaser.Math.Between(600, 1000);
  }

  private spawnOne() {
    const x = Phaser.Math.Between(24, GAME_WIDTH - 24);
    const y = -24;
    const speedY = Phaser.Math.Between(90, 160);
    // Spawn Frigate rarely to make Battlecruiser debugging easier.
    const r = Phaser.Math.FloatBetween(0, 1);
    const kind: EnemyKind =
      r < 0.01 ? "frigate" : r < 0.02 ? "torpedo" : r < 0.03 ? "fighter" : r < 0.04 ? "scout" : "battlecruiser";

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

