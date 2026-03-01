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
    // Use a sublinear factor so 4–5 sized waves don't create long empty gaps.
    const spawnFactor = spawnedCount <= 1 ? 1 : Math.min(3, 1 + (spawnedCount - 1) * 0.5);
    this.nextSpawnAt = time + baseInterval * spawnFactor;
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

    this.maybeEnableMiniBoss(enemy, kind, hasShield);

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

    const level = this.levelConfig.level;

    // Avoid overwhelming early levels.
    if (level <= 1) return 0;

    // Only for non-boss regular enemies.
    if (kind === "dreadnought") return 0;

    // Formations supported by this spawner.
    const formationCapable =
      kind === "scout" ||
      kind === "fighter" ||
      kind === "torpedo" ||
      kind === "bomber" ||
      kind === "frigate" ||
      kind === "battlecruiser";
    if (!formationCapable) return 0;

    // Gate some formations to later levels / require escorts to exist in this level.
    if (kind === "bomber" && level < 4) return 0;
    if (kind === "frigate" && (level < 4 || !this.isKindAllowed("fighter"))) return 0;
    if (kind === "battlecruiser" && level < 7) return 0;

    // Level- and kind-based formation chance.
    const levelFactor = level <= 3 ? 0.65 : level <= 7 ? 0.85 : 1.0;
    const kindChanceBase =
      kind === "scout"
        ? 0.22
        : kind === "fighter"
          ? 0.18
          : kind === "torpedo"
            ? 0.12
            : kind === "bomber"
              ? 0.10
              : kind === "frigate"
                ? 0.08
                : 0.06; // battlecruiser
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

    // Mixed formations (leader + escorts).
    if (kind === "frigate") {
      return this.spawnFrigateEscort(shieldChance, baseSpeedY);
    }
    if (kind === "battlecruiser") {
      const canFrigateWing = this.isKindAllowed("frigate");
      const canScoutScreen = this.isKindAllowed("scout");

      // Prefer frigate wing sometimes (feels like a heavier "task force").
      if (canFrigateWing && (!canScoutScreen || Phaser.Math.FloatBetween(0, 1) < 0.55)) {
        const spawned = this.spawnBattlecruiserFrigateWing(shieldChance, baseSpeedY);
        if (spawned > 0) return spawned;
      }
      if (canScoutScreen) {
        const spawned = this.spawnBattlecruiserScreen(shieldChance, baseSpeedY);
        if (spawned > 0) return spawned;
      }
      if (canFrigateWing) {
        return this.spawnBattlecruiserFrigateWing(shieldChance, baseSpeedY);
      }
      return 0;
    }
    if (kind === "bomber") {
      return this.spawnBomberRush(baseSpeedY);
    }

    // Formation selection.
    // Keep it simple: V-waves, horizontal lines, and flankers.
    const roll = Phaser.Math.FloatBetween(0, 1);
    const pattern: "v" | "line" | "pincer" | "column" | "strike" | "escort" =
      kind === "torpedo"
        ? roll < 0.28
          ? "strike"
          : this.isKindAllowed("fighter") && roll < 0.52
            ? "escort"
            : roll < 0.76
              ? "pincer"
              : "column"
        : kind === "fighter"
          ? (roll < 0.40 ? "pincer" : roll < 0.75 ? "v" : "line")
          : roll < 0.55
            ? "v"
            : roll < 0.85
              ? "line"
              : "column";

    if (pattern === "strike") {
      return this.spawnTorpedoBomberWave(shieldChance, baseSpeedY);
    }
    if (pattern === "escort") {
      return this.spawnTorpedoFighterEscort(shieldChance, baseSpeedY);
    }
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

  private maybeEnableMiniBoss(enemy: Enemy, kind: EnemyKind, hasShield: boolean) {
    // Some shielded heavy enemies hover + drift like a mini-boss.
    // Battlecruiser mini-boss limit: max 2 active simultaneously.
    if (!hasShield) return;
    if (kind !== "battlecruiser" && kind !== "frigate") return;

    const chance = kind === "battlecruiser" ? 0.8 : 0.3;
    if (kind === "battlecruiser") {
      const activeBCMiniBosses = (this.enemies.getChildren() as Enemy[])
        .filter(e => e.active && e.isMiniBoss && (e as Enemy).getKind() === "battlecruiser").length;
      if (activeBCMiniBosses >= 2) return;
    }

    if (Phaser.Math.FloatBetween(0, 1) < chance) {
      enemy.setMiniBoss(true);
    }
  }

  private isKindAllowed(kind: EnemyKind): boolean {
    return this.levelConfig?.enemies?.some(e => e.kind === kind) ?? false;
  }

  private getShieldChanceFor(kind: EnemyKind): number {
    const entry = this.levelConfig?.enemies?.find(e => e.kind === kind);
    return entry?.shieldChance ?? 0;
  }

  private spawnFrigateEscort(frigateShieldChance: number, baseSpeedY: number): number {
    if (!this.levelConfig) return 0;
    if (!this.isKindAllowed("fighter")) return 0;

    const baseY = -24;
    const wingDx = Phaser.Math.Between(56, 66);
    const margin = 24 + wingDx;
    const centerX = Phaser.Math.Between(margin, GAME_WIDTH - margin);

    const fighterShieldChance = this.getShieldChanceFor("fighter");

    let spawned = 0;
    // Leader.
    if (this.spawnEnemyAt(centerX, baseY, baseSpeedY, "frigate", frigateShieldChance)) spawned += 1;

    // Escorts: slightly behind so they "wrap" the leader.
    const escortSpeedY = baseSpeedY + 15;
    const yJitter = Phaser.Math.Between(-4, 4);
    if (this.spawnEnemyAt(centerX - wingDx, baseY - 24 + yJitter, escortSpeedY, "fighter", fighterShieldChance)) spawned += 1;
    if (this.spawnEnemyAt(centerX + wingDx, baseY - 34 - yJitter, escortSpeedY, "fighter", fighterShieldChance)) spawned += 1;

    return spawned;
  }

  private spawnBattlecruiserScreen(battlecruiserShieldChance: number, baseSpeedY: number): number {
    if (!this.levelConfig) return 0;
    if (!this.isKindAllowed("scout")) return 0;

    const baseY = -24;
    const wideDx = Phaser.Math.Between(70, 82);
    const midDx = Phaser.Math.Between(34, 44);
    const margin = 24 + wideDx;
    const centerX = Phaser.Math.Between(margin, GAME_WIDTH - margin);

    const scoutShieldChance = this.getShieldChanceFor("scout");

    let spawned = 0;
    // Leader.
    if (this.spawnEnemyAt(centerX, baseY, baseSpeedY, "battlecruiser", battlecruiserShieldChance)) spawned += 1;

    // Screen (4 scouts) — staggered to avoid perfect symmetry.
    const scoutSpeedY = baseSpeedY + 20;
    if (this.spawnEnemyAt(centerX - wideDx, baseY - 10, scoutSpeedY, "scout", scoutShieldChance)) spawned += 1;
    if (this.spawnEnemyAt(centerX + wideDx, baseY - 22, scoutSpeedY, "scout", scoutShieldChance)) spawned += 1;
    if (this.spawnEnemyAt(centerX - midDx, baseY - 46, scoutSpeedY, "scout", scoutShieldChance)) spawned += 1;
    if (this.spawnEnemyAt(centerX + midDx, baseY - 58, scoutSpeedY, "scout", scoutShieldChance)) spawned += 1;

    return spawned;
  }

  private spawnBattlecruiserFrigateWing(battlecruiserShieldChance: number, baseSpeedY: number): number {
    if (!this.levelConfig) return 0;
    if (!this.isKindAllowed("frigate")) return 0;

    const baseY = -24;
    const wingDx = Phaser.Math.Between(98, 116);
    const margin = 24 + wingDx;
    const centerX = Phaser.Math.Between(margin, GAME_WIDTH - margin);

    const frigateShieldChance = this.getShieldChanceFor("frigate");

    let spawned = 0;
    // Leader.
    if (this.spawnEnemyAt(centerX, baseY, baseSpeedY, "battlecruiser", battlecruiserShieldChance)) spawned += 1;

    // Wings: slightly behind to feel like escorts.
    const wingSpeedY = baseSpeedY + 15;
    if (this.spawnEnemyAt(centerX - wingDx, baseY - 42, wingSpeedY, "frigate", frigateShieldChance)) spawned += 1;
    if (this.spawnEnemyAt(centerX + wingDx, baseY - 60, wingSpeedY, "frigate", frigateShieldChance)) spawned += 1;

    return spawned;
  }

  private spawnBomberRush(baseSpeedY: number): number {
    if (!this.levelConfig) return 0;

    const level = this.levelConfig.level;
    const count = level >= 12 ? 5 : level >= 7 ? 4 : 3;

    const baseY = -24;
    const leftMinX = 26;
    const leftMaxX = 54;
    const rightMinX = GAME_WIDTH - 54;
    const rightMaxX = GAME_WIDTH - 26;

    const extraOnLeft = Phaser.Math.Between(0, 1) === 0;

    let spawned = 0;
    for (let i = 0; i < count; i += 1) {
      const leftSide = i % 2 === 0 ? extraOnLeft : !extraOnLeft;
      const x = leftSide ? Phaser.Math.Between(leftMinX, leftMaxX) : Phaser.Math.Between(rightMinX, rightMaxX);
      const y = baseY - i * 26 - Phaser.Math.Between(0, 10);
      const speedY = baseSpeedY + 25;
      if (this.spawnEnemyAt(x, y, speedY, "bomber", 1)) spawned += 1;
    }

    return spawned;
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
    this.maybeEnableMiniBoss(enemy, kind, hasShield);
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

  private spawnTorpedoBomberWave(torpedoShieldChance: number, baseSpeedY: number): number {
    const baseY = -24;
    const torpedoDx = 22;
    const bomberDx = 64;
    const margin = 24 + bomberDx;
    const centerX = Phaser.Math.Between(margin, GAME_WIDTH - margin);

    let spawned = 0;

    // 2 Torpedoes: staggered so their salvos don't fully overlap.
    if (this.spawnEnemyAt(centerX - torpedoDx, baseY, baseSpeedY, "torpedo", torpedoShieldChance)) spawned += 1;
    if (this.spawnEnemyAt(centerX + torpedoDx, baseY - 26, baseSpeedY, "torpedo", torpedoShieldChance)) spawned += 1;

    if (this.isKindAllowed("bomber")) {
      // 2 Bombers: slightly behind so they arrive after the torpedo salvo starts.
      const bomberShieldChance = 1;
      if (this.spawnEnemyAt(centerX - bomberDx, baseY - 78, baseSpeedY, "bomber", bomberShieldChance)) spawned += 1;
      if (this.spawnEnemyAt(centerX + bomberDx, baseY - 98, baseSpeedY, "bomber", bomberShieldChance)) spawned += 1;
    }

    return spawned;
  }

  private spawnTorpedoFighterEscort(torpedoShieldChance: number, baseSpeedY: number): number {
    if (!this.levelConfig) return 0;
    if (!this.isKindAllowed("fighter")) return 0;

    const baseY = -24;
    const wingDx = Phaser.Math.Between(58, 68);
    const margin = 24 + wingDx;
    const centerX = Phaser.Math.Between(margin, GAME_WIDTH - margin);

    const fighterShieldChance = this.getShieldChanceFor("fighter");

    let spawned = 0;

    // Leader.
    if (this.spawnEnemyAt(centerX, baseY, baseSpeedY, "torpedo", torpedoShieldChance)) spawned += 1;

    // Escorts: a bit faster so they can screen the player while the torpedo aims.
    const escortSpeedY = baseSpeedY + 20;
    if (this.spawnEnemyAt(centerX - wingDx, baseY - 18, escortSpeedY, "fighter", fighterShieldChance)) spawned += 1;
    if (this.spawnEnemyAt(centerX + wingDx, baseY - 30, escortSpeedY, "fighter", fighterShieldChance)) spawned += 1;

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
