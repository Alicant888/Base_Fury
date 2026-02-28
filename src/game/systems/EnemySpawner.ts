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
  private formationCooldownUntil = 0;

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
    this.formationCooldownUntil = 0;
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
    const spawnedCount = this.spawnOne(time);
    const [min, max] = this.levelConfig.spawnInterval;
    const baseInterval = Phaser.Math.Between(min, max);
    // If we spawned a coordinated formation, slow the next spawn a bit to keep overall density reasonable.
    this.nextSpawnAt = time + baseInterval * Math.max(1, spawnedCount);
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

    // Collect all eligible (non-torpedo) escort slots, then pick 1-3 to become mini-bosses.
    const eligibleSlots: { entryIdx: number; slotIdx: number }[] = [];
    wave.enemies.forEach((entry, ei) => {
      if (entry.kind !== "torpedo") {
        for (let i = 0; i < entry.count; i++) eligibleSlots.push({ entryIdx: ei, slotIdx: i });
      }
    });
    Phaser.Utils.Array.Shuffle(eligibleSlots);
    const miniBossCount = Math.min(eligibleSlots.length, Phaser.Math.Between(1, 3));
    const miniBossSlots = new Set(
      eligibleSlots.slice(0, miniBossCount).map(s => `${s.entryIdx}_${s.slotIdx}`),
    );

    for (const entry of wave.enemies) {
      for (let i = 0; i < entry.count; i++) {
        const x = Phaser.Math.Between(24, GAME_WIDTH - 24);
        const y = -24 - i * 30; // stagger vertically
        const [minSpd, maxSpd] = this.levelConfig.enemySpeed;
        const speedY = Phaser.Math.Between(minSpd, maxSpd);

        const enemy = this.enemies.get(x, y) as Enemy | null;
        if (!enemy) continue;
        enemy.spawn(x, y, speedY, this.enemyBullets, entry.kind, entry.hasShield);

        const entryIdx = wave.enemies.indexOf(entry);
        if (miniBossSlots.has(`${entryIdx}_${i}`)) {
          // Battlecruiser mini-boss limit: max 2 active simultaneously.
          if (entry.kind === "battlecruiser") {
            const activeBCMiniBosses = (this.enemies.getChildren() as Enemy[])
              .filter(e => e.active && e.isMiniBoss && e.getKind() === "battlecruiser").length;
            if (activeBCMiniBosses < 2) enemy.setMiniBoss(true);
          } else {
            enemy.setMiniBoss(true);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Regular enemy spawning (weighted by LevelConfig)
  // ---------------------------------------------------------------------------

  private spawnOne(time: number): number {
    if (!this.levelConfig) return 0;

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

    const formationSpawned = this.trySpawnFormation(time, picked.kind, picked.shieldChance, speedY);
    if (formationSpawned > 0) return formationSpawned;

    const hasShield = Phaser.Math.FloatBetween(0, 1) < picked.shieldChance;

    const enemy = this.enemies.get(x, y) as Enemy | null;
    if (!enemy) return 0;
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

    return 1;
  }

  private trySpawnFormation(
    time: number,
    kind: EnemyKind,
    shieldChance: number,
    baseSpeedY: number,
  ): number {
    if (!this.levelConfig) return 0;
    if (time < this.formationCooldownUntil) return 0;

    // Avoid overwhelming early levels; keep formations to lighter enemies only.
    if (this.levelConfig.level <= 1) return 0;
    if (kind !== "scout" && kind !== "fighter" && kind !== "torpedo") return 0;

    // Level- and kind-based formation chance.
    const level = this.levelConfig.level;
    const levelFactor = level <= 3 ? 0.65 : level <= 7 ? 0.85 : 1.0;
    const kindChanceBase = kind === "scout" ? 0.22 : kind === "fighter" ? 0.18 : 0.12;
    const chance = kindChanceBase * levelFactor;
    if (Phaser.Math.FloatBetween(0, 1) >= chance) return 0;

    const spawned = this.spawnFormation(kind, shieldChance, baseSpeedY);
    if (spawned > 1) {
      // Cooldown prevents back-to-back waves.
      this.formationCooldownUntil = time + Phaser.Math.Between(2400, 5200);
    }
    return spawned;
  }

  private spawnFormation(kind: EnemyKind, shieldChance: number, baseSpeedY: number): number {
    if (!this.levelConfig) return 0;

    const level = this.levelConfig.level;

    // Formation selection.
    // Keep it simple: V-waves, horizontal lines, and flankers.
    const roll = Phaser.Math.FloatBetween(0, 1);
    const pattern: "v" | "line" | "pincer" | "column" =
      kind === "torpedo"
        ? (roll < 0.55 ? "pincer" : "column")
        : kind === "fighter"
          ? (roll < 0.40 ? "pincer" : roll < 0.75 ? "v" : "line")
          : roll < 0.55
            ? "v"
            : roll < 0.85
              ? "line"
              : "column";

    if (pattern === "pincer") {
      return this.spawnPincer(kind, shieldChance, baseSpeedY);
    }
    if (pattern === "column") {
      const count = kind === "torpedo" ? 2 : Phaser.Math.Between(2, 3);
      return this.spawnColumn(kind, shieldChance, baseSpeedY, count);
    }
    if (pattern === "line") {
      const count = kind === "scout" ? (level >= 6 ? 4 : 3) : 3;
      return this.spawnLine(kind, shieldChance, baseSpeedY, count);
    }

    // V pattern.
    const arms = kind === "scout" ? (level >= 6 ? 2 : 1) : 1;
    return this.spawnV(kind, shieldChance, baseSpeedY, arms);
  }

  private spawnEnemyAt(
    x: number,
    y: number,
    speedY: number,
    kind: EnemyKind,
    shieldChance: number,
  ): boolean {
    if (!this.levelConfig) return false;

    const enemy = this.enemies.get(x, y) as Enemy | null;
    if (!enemy) return false;

    const hasShield = Phaser.Math.FloatBetween(0, 1) < shieldChance;
    const spd = Math.max(40, speedY + Phaser.Math.Between(-10, 10));
    enemy.spawn(x, y, spd, this.enemyBullets, kind, hasShield);
    return true;
  }

  private spawnV(kind: EnemyKind, shieldChance: number, baseSpeedY: number, arms: number): number {
    // Example (arms=2): 5 ships: center, +/-1, +/-2.
    const baseY = -24;
    const dx = kind === "fighter" ? 28 : kind === "torpedo" ? 30 : 26;
    const margin = 24 + arms * dx;
    const baseX = Phaser.Math.Between(margin, GAME_WIDTH - margin);

    let spawned = 0;
    if (this.spawnEnemyAt(baseX, baseY, baseSpeedY, kind, shieldChance)) spawned += 1;

    for (let i = 1; i <= arms; i += 1) {
      const y = baseY - i * 26;
      if (this.spawnEnemyAt(baseX - i * dx, y, baseSpeedY, kind, shieldChance)) spawned += 1;
      if (this.spawnEnemyAt(baseX + i * dx, y, baseSpeedY, kind, shieldChance)) spawned += 1;
    }

    return spawned;
  }

  private spawnLine(kind: EnemyKind, shieldChance: number, baseSpeedY: number, count: number): number {
    const baseY = -24;
    const dx = kind === "fighter" ? 30 : kind === "torpedo" ? 34 : 28;
    const span = dx * (count - 1);
    const halfSpan = span * 0.5;
    const margin = 24 + halfSpan;
    const centerX = Phaser.Math.Between(Math.ceil(margin), Math.floor(GAME_WIDTH - margin));
    const startX = centerX - halfSpan;

    let spawned = 0;
    for (let i = 0; i < count; i += 1) {
      const x = startX + i * dx;
      // Slight arc so it doesn't look too static.
      const y = baseY - Math.abs(i - (count - 1) * 0.5) * 10;
      if (this.spawnEnemyAt(x, y, baseSpeedY, kind, shieldChance)) spawned += 1;
    }
    return spawned;
  }

  private spawnColumn(kind: EnemyKind, shieldChance: number, baseSpeedY: number, count: number): number {
    const x = Phaser.Math.Between(24, GAME_WIDTH - 24);
    const baseY = -24;
    let spawned = 0;
    for (let i = 0; i < count; i += 1) {
      const y = baseY - i * 34;
      if (this.spawnEnemyAt(x, y, baseSpeedY, kind, shieldChance)) spawned += 1;
    }
    return spawned;
  }

  private spawnPincer(kind: EnemyKind, shieldChance: number, baseSpeedY: number): number {
    // Two enemies spawn near the edges to create "flankers".
    const baseY = -24;
    const edgeX = 34;

    let spawned = 0;
    if (this.spawnEnemyAt(edgeX, baseY, baseSpeedY, kind, shieldChance)) spawned += 1;
    if (this.spawnEnemyAt(GAME_WIDTH - edgeX, baseY - 18, baseSpeedY, kind, shieldChance)) spawned += 1;

    return spawned;
  }
}
