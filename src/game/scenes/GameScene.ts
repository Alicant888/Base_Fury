import Phaser from "phaser";
import { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import { EnemyBullet } from "../entities/EnemyBullet";
import { FiringRatePickup } from "../entities/FiringRatePickup";
import { HealthPickup } from "../entities/HealthPickup";
import { Player } from "../entities/Player";
import { ShieldPickup } from "../entities/ShieldPickup";
import { EnemySpawner } from "../systems/EnemySpawner";
import { ATLAS_KEYS, AUDIO_KEYS, BG_FRAMES, GAME_HEIGHT, GAME_WIDTH, SPRITE_FRAMES, UI_FRAMES } from "../config";

const BASE_FIRE_RATE_MS = 375; // ~2.67 shots/sec

export class GameScene extends Phaser.Scene {
  private bgStar!: Phaser.GameObjects.TileSprite;
  private bgNebula!: Phaser.GameObjects.TileSprite;
  private bgDust!: Phaser.GameObjects.TileSprite;

  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private shieldPickups!: Phaser.Physics.Arcade.Group;
  private healthPickups!: Phaser.Physics.Arcade.Group;
  private firingRatePickups!: Phaser.Physics.Arcade.Group;
  private spawner!: EnemySpawner;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private draggingPointerId: number | null = null;
  private dragOffset = new Phaser.Math.Vector2();

  private hp = 5;
  private readonly maxHp = 5;
  private kills = 0;
  private isGameOver = false;
  private shieldHits = 0;
  private shieldFx?: Phaser.GameObjects.Sprite;
  private fireRateMultiplier = 1;

  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private fireEvent?: Phaser.Time.TimerEvent;
  private gameMusic?: Phaser.Sound.BaseSound;

  constructor() {
    super("GameScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    // Reset run state (Scene instances are reused between starts).
    this.hp = this.maxHp;
    this.kills = 0;
    this.isGameOver = false;
    this.shieldHits = 0;
    this.fireRateMultiplier = 1;
    this.draggingPointerId = null;

    // Background (parallax).
    this.bgStar = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, BG_FRAMES.starfield).setOrigin(0);
    this.bgNebula = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, BG_FRAMES.nebula).setOrigin(0);
    this.bgDust = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ATLAS_KEYS.bg, BG_FRAMES.dust).setOrigin(0);

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.ensureBulletTexture();
    this.ensureAnimations();

    // Pools.
    this.bullets = this.physics.add.group({
      classType: Bullet,
      maxSize: 80,
      runChildUpdate: true,
    });

    this.enemyBullets = this.physics.add.group({
      classType: EnemyBullet,
      maxSize: 60,
      runChildUpdate: true,
    });

    this.shieldPickups = this.physics.add.group({
      classType: ShieldPickup,
      maxSize: 20,
      runChildUpdate: true,
    });

    this.healthPickups = this.physics.add.group({
      classType: HealthPickup,
      maxSize: 12,
      runChildUpdate: true,
    });

    this.firingRatePickups = this.physics.add.group({
      classType: FiringRatePickup,
      maxSize: 12,
      runChildUpdate: true,
    });

    this.enemies = this.physics.add.group({
      classType: Enemy,
      maxSize: 50,
      runChildUpdate: true,
    });

    // Player.
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 80);
    this.updatePlayerDamageAppearance();

    // Input.
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.setupPointerDrag();

    // Spawning.
    this.spawner = new EnemySpawner(this, this.enemies, this.enemyBullets);

    // Collisions.
    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      this.onBulletHitsEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.onEnemyHitsPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.enemyBullets,
      this.onEnemyBulletHitsPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.shieldPickups,
      this.onShieldPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.healthPickups,
      this.onHealthPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.firingRatePickups,
      this.onFiringRatePickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    // Auto-fire (single shot).
    this.fireEvent = this.time.addEvent({
      delay: this.getFireDelayMs(),
      loop: true,
      callback: () => this.fireSingleShot(),
    });

    // UI overlay.
    this.createUI();
    this.updateLivesUI();

    // Game music (starts after START click / audio unlock).
    if (this.registry.get("audioUnlocked")) {
      try {
        this.gameMusic = this.sound.add(AUDIO_KEYS.gameMusic, { loop: true, volume: 0.5 });
        this.gameMusic.play();
      } catch {
        // ignore
      }
    }

    // Cleanup on scene shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.fireEvent?.remove(false);
      this.fireEvent = undefined;

      this.gameMusic?.stop();
      this.gameMusic?.destroy();
      this.gameMusic = undefined;

      this.shieldFx?.destroy();
      this.shieldFx = undefined;
    });
  }

  update(time: number, delta: number) {
    if (this.isGameOver) return;

    const t = delta / 16.666;
    // Subtract to make the texture appear to move "down".
    this.bgStar.tilePositionY -= 0.5 * t;
    this.bgNebula.tilePositionY -= 1.1 * t;
    this.bgDust.tilePositionY -= 2.0 * t;

    // Pointer drag takes priority; keyboard works when not dragging.
    if (this.draggingPointerId === null) {
      this.updateKeyboardMovement(delta);
    }

    this.spawner.update(time);

    if (this.shieldFx) {
      this.shieldFx.setPosition(this.player.x, this.player.y);
    }
  }

  private playSfx(key: string, volume = 1) {
    if (!this.registry.get("audioUnlocked")) return;
    try {
      this.sound.play(key, { volume });
    } catch {
      // ignore
    }
  }

  private setupPointerDrag() {
    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (this.draggingPointerId !== null) return;
      this.draggingPointerId = pointer.id;
      this.dragOffset.set(pointer.x - this.player.x, pointer.y - this.player.y);
    };

    const onPointerUp = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.draggingPointerId) this.draggingPointerId = null;
    };

    const onPointerMove = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.draggingPointerId) return;
      if (!pointer.isDown) return;

      this.player.x = pointer.x - this.dragOffset.x;
      this.player.y = pointer.y - this.dragOffset.y;
      this.player.clampToBounds();
    };

    this.input.on(Phaser.Input.Events.POINTER_DOWN, onPointerDown);
    this.input.on(Phaser.Input.Events.POINTER_UP, onPointerUp);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, onPointerMove);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, onPointerDown);
      this.input.off(Phaser.Input.Events.POINTER_UP, onPointerUp);
      this.input.off(Phaser.Input.Events.POINTER_MOVE, onPointerMove);
    });
  }

  private updateKeyboardMovement(delta: number) {
    if (!this.cursors) return;

    const speed = 280; // px/sec
    const dt = delta / 1000;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left?.isDown) dx -= 1;
    if (this.cursors.right?.isDown) dx += 1;
    if (this.cursors.up?.isDown) dy -= 1;
    if (this.cursors.down?.isDown) dy += 1;

    if (dx === 0 && dy === 0) return;

    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    this.player.x += dx * speed * dt;
    this.player.y += dy * speed * dt;
    this.player.clampToBounds();
  }

  private fireSingleShot() {
    if (!this.player.active) return;

    const x = this.player.x;
    // Start from under the ship center.
    const y = this.player.y + this.player.displayHeight * 0.45;

    if (this.spawnBullet(x, y)) {
      this.playSfx(AUDIO_KEYS.laserShort, 0.35);
    }
  }

  private spawnBullet(x: number, y: number): boolean {
    const bullet = this.bullets.get(x, y) as Bullet | null;
    if (!bullet) return false;
    bullet.fire(x, y);
    return true;
  }

  private onBulletHitsEnemy(bulletObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const bullet = bulletObj as Bullet;
    const enemy = enemyObj as Enemy;

    if (!bullet.active || !enemy.active) return;

    bullet.kill();
    const destroyed = enemy.onPlayerBulletHit();

    if (destroyed) {
      enemy.kill();

      this.spawnExplosion(enemy.x, enemy.y);
      this.playSfx(AUDIO_KEYS.explosionScout, 0.55);
      this.kills += 1;

      this.maybeSpawnPickup(enemy.x, enemy.y);
    }
  }

  private onEnemyHitsPlayer(_playerObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const enemy = enemyObj as Enemy;
    if (!enemy.active) return;

    enemy.kill();
    this.takeHit();
  }

  private onEnemyBulletHitsPlayer(_playerObj: Phaser.GameObjects.GameObject, bulletObj: Phaser.GameObjects.GameObject) {
    const bullet = bulletObj as EnemyBullet;
    if (!bullet.active) return;

    bullet.kill();
    this.takeHit();
  }

  private onShieldPickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as ShieldPickup;
    if (!pickup.active) return;

    pickup.kill();
    this.addShield(5);
  }

  private onHealthPickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as HealthPickup;
    if (!pickup.active) return;

    pickup.kill();
    this.hp = this.maxHp;
    this.updateLivesUI();
    this.updatePlayerDamageAppearance();
  }

  private onFiringRatePickup(_playerObj: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject) {
    const pickup = pickupObj as FiringRatePickup;
    if (!pickup.active) return;

    pickup.kill();
    // +20% fire rate => delay * 0.8
    this.setFireRateMultiplier(0.8);
  }

  private takeHit() {
    if (this.isGameOver) return;

    this.playSfx(AUDIO_KEYS.impactSmall, 0.45);

    if (this.shieldHits > 0) {
      this.shieldHits = Math.max(0, this.shieldHits - 1);
      this.flashShield();
      if (this.shieldHits === 0) {
        this.disableShield();
      }
      return;
    }

    this.hp = Math.max(0, this.hp - 1);
    this.updateLivesUI();
    this.updatePlayerDamageAppearance();
    this.flashPlayer();

    if (this.hp <= 0) {
      this.triggerGameOver();
    }
  }

  private flashPlayer() {
    this.player.setTintFill(0xffffff);
    this.player.setAlpha(1);

    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      duration: 60,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        this.player.clearTint();
        this.player.setAlpha(1);
      },
    });
  }

  private addShield(hits: number) {
    // No stacking: picking up a new shield just refreshes durability.
    this.shieldHits = hits;
    this.playSfx(AUDIO_KEYS.energyShield, 0.6);
    this.enableShield();
  }

  private enableShield() {
    if (!this.shieldFx) {
      this.shieldFx = this.add
        .sprite(
          this.player.x,
          this.player.y,
          ATLAS_KEYS.ship,
          `${SPRITE_FRAMES.playerShieldPrefix}${SPRITE_FRAMES.playerShieldStart}${SPRITE_FRAMES.playerShieldSuffix}`,
        )
        .setDepth(6);

      // Optional: make it feel more "energy-like".
      this.shieldFx.setBlendMode(Phaser.BlendModes.ADD);
    }

    this.shieldFx.setVisible(true);
    this.shieldFx.play("player_shield", true);
  }

  private disableShield() {
    if (!this.shieldFx) return;
    this.shieldFx.setVisible(false);
    this.shieldFx.anims.stop();
  }

  private flashShield() {
    if (!this.shieldFx || !this.shieldFx.visible) return;

    this.shieldFx.setTintFill(0xffffff);
    this.tweens.add({
      targets: this.shieldFx,
      alpha: 0.25,
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.shieldFx?.clearTint();
        if (this.shieldFx) this.shieldFx.setAlpha(1);
      },
    });
  }

  private spawnShieldPickup(x: number, y: number) {
    const pickup = this.shieldPickups.get(x, y) as ShieldPickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private spawnHealthPickup(x: number, y: number) {
    const pickup = this.healthPickups.get(x, y) as HealthPickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private spawnFiringRatePickup(x: number, y: number) {
    const pickup = this.firingRatePickups.get(x, y) as FiringRatePickup | null;
    if (!pickup) return;
    pickup.spawn(x, y);
  }

  private maybeSpawnPickup(x: number, y: number) {
    if (this.isGameOver) return;

    // Spawn at most one pickup to avoid clutter, using exact probabilities:
    // - Health: 3%
    // - Firing rate: 4%
    // - Shield: 4%
    const r = Phaser.Math.FloatBetween(0, 1);
    if (r < 0.03) this.spawnHealthPickup(x, y);
    else if (r < 0.03 + 0.04) this.spawnFiringRatePickup(x, y);
    else if (r < 0.03 + 0.04 + 0.04) this.spawnShieldPickup(x, y);
  }

  private triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Freeze gameplay systems.
    this.physics.world.pause();
    this.fireEvent?.remove(false);
    this.fireEvent = undefined;

    this.gameMusic?.stop();
    this.gameMusic?.destroy();
    this.gameMusic = undefined;

    this.disableShield();

    const depth = 100;
    const padding = 18;
    const buttonGap = 14;

    // Interactive dim blocks clicks to underlying UI (e.g. back button).
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0).setDepth(depth).setInteractive();

    const panel = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, ATLAS_KEYS.ui, UI_FRAMES.panelWindow).setDepth(depth + 1);

    this.add
      .text(GAME_WIDTH / 2, panel.y - panel.displayHeight / 2 + 36, "GAME OVER", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);

    this.add
      .text(GAME_WIDTH / 2, panel.y + 10, `ENEMIES DESTROYED: ${this.kills}`, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
        padding: { x: 8, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);

    const btnY = GAME_HEIGHT - padding - 20; // ~button half-height
    const btnFrameW = 128;
    const leftX = GAME_WIDTH / 2 - buttonGap / 2 - btnFrameW / 2;
    const rightX = GAME_WIDTH / 2 + buttonGap / 2 + btnFrameW / 2;

    const playAgainBtn = this.add
      .image(leftX, btnY, ATLAS_KEYS.ui, UI_FRAMES.btnSmallNormal)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth + 1);

    const exitBtn = this.add
      .image(rightX, btnY, ATLAS_KEYS.ui, UI_FRAMES.btnSmallNormal)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth + 1);

    this.add
      .text(playAgainBtn.x, playAgainBtn.y, "PLAY AGAIN", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);

    this.add
      .text(exitBtn.x, exitBtn.y, "EXIT", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);

    const press = (btn: Phaser.GameObjects.Image) => btn.setFrame(UI_FRAMES.btnSmallPressed);
    const release = (btn: Phaser.GameObjects.Image) => btn.setFrame(UI_FRAMES.btnSmallNormal);

    playAgainBtn.on("pointerdown", () => press(playAgainBtn));
    playAgainBtn.on("pointerout", () => release(playAgainBtn));
    playAgainBtn.on("pointerup", () => {
      release(playAgainBtn);
      this.playSfx(AUDIO_KEYS.click, 0.7);
      dim.destroy();
      panel.destroy();
      this.scene.restart();
    });

    exitBtn.on("pointerdown", () => press(exitBtn));
    exitBtn.on("pointerout", () => release(exitBtn));
    exitBtn.on("pointerup", () => {
      release(exitBtn);
      this.playSfx(AUDIO_KEYS.click, 0.7);
      dim.destroy();
      panel.destroy();
      this.scene.start("MenuScene");
    });
  }

  private spawnExplosion(x: number, y: number) {
    const boom = this.add
      .sprite(x, y, ATLAS_KEYS.enemy, `${SPRITE_FRAMES.enemyDestructionPrefix}${SPRITE_FRAMES.enemyDestructionStart}${SPRITE_FRAMES.enemyDestructionSuffix}`)
      .setDepth(6);

    boom.play("enemy_explode");
    // Use negative scale instead of flipY to ensure vertical mirroring applies
    // consistently across trimmed atlas frames.
    boom.setScale(boom.scaleX, -Math.abs(boom.scaleY));
    boom.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => boom.destroy());
  }

  private ensureAnimations() {
    if (!this.anims.exists("enemy_explode")) {
      this.anims.create({
        key: "enemy_explode",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.enemyDestructionStart,
          end: SPRITE_FRAMES.enemyDestructionEnd,
          prefix: SPRITE_FRAMES.enemyDestructionPrefix,
          suffix: SPRITE_FRAMES.enemyDestructionSuffix,
        }),
        frameRate: 20,
        repeat: 0,
      });
    }

    if (!this.anims.exists("enemy_engine")) {
      this.anims.create({
        key: "enemy_engine",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.enemyEngineStart,
          end: SPRITE_FRAMES.enemyEngineEnd,
          prefix: SPRITE_FRAMES.enemyEnginePrefix,
          suffix: SPRITE_FRAMES.enemyEngineSuffix,
        }),
        frameRate: 14,
        repeat: -1,
      });
    }

    if (!this.anims.exists("enemy_weapon_flame")) {
      this.anims.create({
        key: "enemy_weapon_flame",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.enemyWeaponStart,
          end: SPRITE_FRAMES.enemyWeaponEnd,
          prefix: SPRITE_FRAMES.enemyWeaponPrefix,
          suffix: SPRITE_FRAMES.enemyWeaponSuffix,
        }),
        frameRate: 22,
        repeat: 0,
      });
    }

    if (!this.anims.exists("enemy_bullet")) {
      this.anims.create({
        key: "enemy_bullet",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.enemyProjectileStart,
          end: SPRITE_FRAMES.enemyProjectileEnd,
          prefix: SPRITE_FRAMES.enemyProjectilePrefix,
          suffix: SPRITE_FRAMES.enemyProjectileSuffix,
        }),
        frameRate: 16,
        repeat: -1,
      });
    }

    if (!this.anims.exists("enemy_shield")) {
      this.anims.create({
        key: "enemy_shield",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.enemy, {
          start: SPRITE_FRAMES.enemyShieldStart,
          end: SPRITE_FRAMES.enemyShieldEnd,
          prefix: SPRITE_FRAMES.enemyShieldPrefix,
          suffix: SPRITE_FRAMES.enemyShieldSuffix,
        }),
        frameRate: 18,
        repeat: -1,
      });
    }

    this.createLoopAnimIfFrames(
      "shield_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.shieldPickupPrefix,
      SPRITE_FRAMES.shieldPickupStart,
      SPRITE_FRAMES.shieldPickupEnd,
      SPRITE_FRAMES.shieldPickupSuffix,
      14,
    );

    this.createLoopAnimIfFrames(
      "health_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.healthPickupPrefix,
      SPRITE_FRAMES.healthPickupStart,
      SPRITE_FRAMES.healthPickupEnd,
      SPRITE_FRAMES.healthPickupSuffix,
      14,
    );

    this.createLoopAnimIfFrames(
      "firing_rate_pickup",
      ATLAS_KEYS.fx,
      SPRITE_FRAMES.firingRatePickupPrefix,
      SPRITE_FRAMES.firingRatePickupStart,
      SPRITE_FRAMES.firingRatePickupEnd,
      SPRITE_FRAMES.firingRatePickupSuffix,
      14,
    );

    if (!this.anims.exists("player_shield")) {
      this.anims.create({
        key: "player_shield",
        frames: this.anims.generateFrameNames(ATLAS_KEYS.ship, {
          start: SPRITE_FRAMES.playerShieldStart,
          end: SPRITE_FRAMES.playerShieldEnd,
          prefix: SPRITE_FRAMES.playerShieldPrefix,
          suffix: SPRITE_FRAMES.playerShieldSuffix,
        }),
        frameRate: 18,
        repeat: -1,
      });
    }
  }

  private createLoopAnimIfFrames(
    key: string,
    atlasKey: string,
    prefix: string,
    start: number,
    end: number,
    suffix: string,
    frameRate: number,
  ) {
    if (this.anims.exists(key)) return;

    const tex = this.textures.get(atlasKey);
    const frames: Array<{ key: string; frame: string }> = [];
    for (let i = start; i <= end; i += 1) {
      const name = `${prefix}${i}${suffix}`;
      if (tex?.has(name)) frames.push({ key: atlasKey, frame: name });
    }

    // Avoid creating empty animations (can crash on play()) if frame names ever change.
    if (frames.length === 0) return;

    this.anims.create({
      key,
      frames: frames as unknown as Phaser.Types.Animations.AnimationFrame[],
      frameRate,
      repeat: -1,
    });
  }

  private ensureBulletTexture() {
    if (this.textures.exists("bullet")) return;

    const g = this.add.graphics();
    g.fillStyle(0x7df9ff, 1);
    g.fillRect(0, 0, 2, 8);
    g.generateTexture("bullet", 2, 8);
    g.destroy();
  }

  private createUI() {
    const uiDepth = 20;

    const back = this.add
      .image(10, 10, ATLAS_KEYS.ui, UI_FRAMES.iconBack)
      .setOrigin(0, 0)
      .setDepth(uiDepth)
      .setInteractive({ useHandCursor: true });

    back.on("pointerup", () => {
      this.playSfx(AUDIO_KEYS.click, 0.7);
      this.scene.start("MenuScene");
    });

    // Lives: 5 mini ship icons. One disappears per hit (HP loss).
    const startX = 48;
    const y = 14;
    const scale = 0.75;
    const spacing = 20;

    this.lifeIcons.forEach((i) => i.destroy());
    this.lifeIcons = [];

    for (let i = 0; i < this.maxHp; i += 1) {
      const icon = this.add
        .image(startX + i * spacing, y, ATLAS_KEYS.ship, SPRITE_FRAMES.playerShip)
        .setOrigin(0, 0)
        .setDepth(uiDepth)
        .setScale(scale);
      this.lifeIcons.push(icon);
    }
  }

  private updateLivesUI() {
    for (let i = 0; i < this.lifeIcons.length; i += 1) {
      this.lifeIcons[i].setVisible(i < this.hp);
    }
  }

  private updatePlayerDamageAppearance() {
    const hitsTaken = this.maxHp - this.hp;
    let frame: string = SPRITE_FRAMES.playerShip;
    if (hitsTaken >= 4) frame = SPRITE_FRAMES.playerShipVeryDamaged;
    else if (hitsTaken === 3) frame = SPRITE_FRAMES.playerShipDamaged;
    else if (hitsTaken === 2) frame = SPRITE_FRAMES.playerShipSlightDamage;
    else frame = SPRITE_FRAMES.playerShip; // 0-1

    this.player.setFrame(frame);
    // Keep hitbox roughly consistent with the current frame size.
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(this.player.width * 0.6, this.player.height * 0.6, true);
  }

  private getFireDelayMs() {
    return Math.round(BASE_FIRE_RATE_MS * this.fireRateMultiplier);
  }

  private setFireRateMultiplier(multiplier: number) {
    this.fireRateMultiplier = Phaser.Math.Clamp(multiplier, 0.2, 2);

    if (this.isGameOver) return;
    if (this.fireEvent) {
      this.fireEvent.remove(false);
      this.fireEvent = undefined;
    }

    this.fireEvent = this.time.addEvent({
      delay: this.getFireDelayMs(),
      loop: true,
      callback: () => this.fireSingleShot(),
    });
  }
}

