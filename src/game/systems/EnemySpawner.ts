import Phaser from "phaser";
import type { Enemy } from "../entities/Enemy";
import { GAME_WIDTH } from "../config";

export class EnemySpawner {
  private nextSpawnAt = 0;

  constructor(
    private scene: Phaser.Scene,
    private enemies: Phaser.Physics.Arcade.Group,
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

    const enemy = this.enemies.get(x, y) as Enemy | null;
    if (!enemy) return;

    enemy.spawn(x, y, speedY);
  }
}

