import * as Phaser from "phaser";
import type { Enemy, EnemyKind } from "../entities/Enemy";
import { GAME_WIDTH } from "../config";
import type { LevelConfig } from "../LevelConfig";

export class EnemySpawner {
  private nextSpawnAt = 0;
  private bossSpawned = false;
  private bossPhaseActive = false;
  private boss?: Enemy;
  private levelConfig?: LevelConfig;
  private nextEscortWaveAt = 0;
  private escortWaveIndex = 0;

  constructor(
    private scene: Phaser.Scene,
    private enemies: Phaser.Physics.Arcade.Group,
    private enemyBullets: Phaser.Physics.Arcade.Group,
  ) {}

  /** Call when a new level starts. */
  setLevelConfig(config: LevelConfig) {
    this.levelConfig = config;
    this.bossSpawned = false;
    this.bossPhaseActive = false;
    this.boss = undefined;
    this.escortWaveIndex = 0;
    this.nextEscortWaveAt = 0;
    this.nextSpawnAt = 0;
  }

  /** True once the Dreadnought has been spawned and then destroyed. */
  isBossDefeated(): boolean {
    return this.bossSpawned && (!this.boss || !this.boss.active);
  }

  update(time: number) {
    if (!this.levelConfig) return;

    // Boss-level logic (standard immediate-boss OR boss-after-distance once triggered).
    if (this.levelConfig.isBossLevel || this.bossPhaseActive) {
      if (!this.bossSpawned) {
        this.spawnBoss();
        this.bossSpawned = true;
        this.nextEscortWaveAt = time + (this.levelConfig.escortWaveIntervalMs ?? 15_000);
        return;
      }

      // Spawn escort waves while boss is alive.
      if (this.boss?.active && time >= this.nextEscortWaveAt) {
        this.spawnEscortWave();
        this.nextEscortWaveAt = time + (this.levelConfig.escortWaveIntervalMs ?? 15_000);
      }
      return;
    }

    // Regular level spawning.
    if (time < this.nextSpawnAt) return;
    this.spawnOne();
    const [min, max] = this.levelConfig.spawnInterval;
    this.nextSpawnAt = time + Phaser.Math.Between(min, max);
  }

  /**
   * Called by GameScene when a bossAfterDistance level reaches its distance
   * goal.  Switches the spawner into boss mode immediately.
   */
  triggerBossPhase(time: number) {
    if (this.bossPhaseActive) return;
    this.bossPhaseActive = true;
    this.spawnBoss();
    this.bossSpawned = true;
    this.nextEscortWaveAt = time + (this.levelConfig?.escortWaveIntervalMs ?? 15_000);
  }

  // ---------------------------------------------------------------------------
  // Boss
  // ---------------------------------------------------------------------------

  private spawnBoss(): boolean {
    if (!this.levelConfig) return false;
    const x = GAME_WIDTH * 0.5;
    const y = -24;
    const speedY = 0;
    const kind: EnemyKind = "dreadnought";
    const hasShield = true;

    const enemy = this.enemies.get(x, y) as Enemy | null;
    if (!enemy) return false;
    enemy.spawn(
      x, y, speedY, this.enemyBullets, kind, hasShield,
      this.levelConfig.bossHp,
      this.levelConfig.bossShieldHp,
    );
    this.boss = enemy;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Escort waves (boss level only)
  // ---------------------------------------------------------------------------

  private spawnEscortWave() {
    if (!this.levelConfig?.escortWaves?.length) return;

    const waves = this.levelConfig.escortWaves;
    const wave = waves[this.escortWaveIndex % waves.length];
    this.escortWaveIndex++;

    for (const entry of wave.enemies) {
      for (let i = 0; i < entry.count; i++) {
        const x = Phaser.Math.Between(24, GAME_WIDTH - 24);
        const y = -24 - i * 30; // stagger vertically
        const [minSpd, maxSpd] = this.levelConfig.enemySpeed;
        const speedY = Phaser.Math.Between(minSpd, maxSpd);

        const enemy = this.enemies.get(x, y) as Enemy | null;
        if (!enemy) continue;
        enemy.spawn(x, y, speedY, this.enemyBullets, entry.kind, entry.hasShield);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Regular enemy spawning (weighted by LevelConfig)
  // ---------------------------------------------------------------------------

  private spawnOne() {
    if (!this.levelConfig) return;

    const x = Phaser.Math.Between(24, GAME_WIDTH - 24);
    const y = -24;
    const [minSpd, maxSpd] = this.levelConfig.enemySpeed;
    const speedY = Phaser.Math.Between(minSpd, maxSpd);

    // Weighted random pick.
    const entries = this.levelConfig.enemies;
    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
    let r = Phaser.Math.FloatBetween(0, totalWeight);
    let picked = entries[entries.length - 1];
    for (const entry of entries) {
      r -= entry.weight;
      if (r <= 0) {
        picked = entry;
        break;
      }
    }

    const kind: EnemyKind = picked.kind;
    const hasShield = Phaser.Math.FloatBetween(0, 1) < picked.shieldChance;

    const enemy = this.enemies.get(x, y) as Enemy | null;
    if (!enemy) return;
    enemy.spawn(x, y, speedY, this.enemyBullets, kind, hasShield);

    // Some shielded heavy enemies hover + drift like a mini-boss.
    // Battlecruiser mini-boss limit: max 2 active simultaneously.
    if (hasShield && (kind === "battlecruiser" || kind === "frigate")) {
      const chance = kind === "battlecruiser" ? 0.8 : 0.3;
      const activeBCMiniBosses = (this.enemies.getChildren() as Enemy[])
        .filter(e => e.active && e.isMiniBoss && (e as Enemy).getKind() === "battlecruiser").length;
      const canBeMiniBoss = kind === "battlecruiser" ? activeBCMiniBosses < 2 : true;
      if (canBeMiniBoss && Phaser.Math.FloatBetween(0, 1) < chance) {
        enemy.setMiniBoss(true);
      }
    }
  }
}
