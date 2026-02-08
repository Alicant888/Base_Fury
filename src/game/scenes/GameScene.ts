import Phaser from "phaser";
import { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { EnemySpawner } from "../systems/EnemySpawner";
import { ATLAS_KEYS, BG_FRAMES, GAME_HEIGHT, GAME_WIDTH, SPRITE_FRAMES, UI_FRAMES } from "../config";

const FIRE_RATE_MS = 125; // ~8 shots/sec

export class GameScene extends Phaser.Scene {
  private bgStar!: Phaser.GameObjects.TileSprite;
  private bgNebula!: Phaser.GameObjects.TileSprite;
  private bgDust!: Phaser.GameObjects.TileSprite;

  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private spawner!: EnemySpawner;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private draggingPointerId: number | null = null;
  private dragOffset = new Phaser.Math.Vector2();

  private hp = 100;
  private shield = 100;
  private readonly maxHp = 100;
  private readonly maxShield = 100;
  private score = 0;

  private hpBar!: Phaser.GameObjects.Image;
  private shieldBar!: Phaser.GameObjects.Image;
  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super("GameScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    // Reset run state (Scene instances are reused between starts).
    this.hp = this.maxHp;
    this.shield = this.maxShield;
    this.score = 0;
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

    this.enemies = this.physics.add.group({
      classType: Enemy,
      maxSize: 50,
      runChildUpdate: true,
    });

    // Player.
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 80);

    // Input.
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.setupPointerDrag();

    // Spawning.
    this.spawner = new EnemySpawner(this, this.enemies);

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

    // Auto-fire (twin shot).
    this.time.addEvent({
      delay: FIRE_RATE_MS,
      loop: true,
      callback: () => this.fireTwinShot(),
    });

    // UI overlay.
    this.createUI();
    this.updateBars();
    this.updateScoreText();
  }

  update(time: number, delta: number) {
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

  private fireTwinShot() {
    if (!this.player.active) return;

    const y = this.player.y - this.player.displayHeight * 0.6;
    const x = this.player.x;
    const spread = 7;

    this.spawnBullet(x - spread, y);
    this.spawnBullet(x + spread, y);
  }

  private spawnBullet(x: number, y: number) {
    const bullet = this.bullets.get(x, y) as Bullet | null;
    if (!bullet) return;
    bullet.fire(x, y);
  }

  private onBulletHitsEnemy(bulletObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const bullet = bulletObj as Bullet;
    const enemy = enemyObj as Enemy;

    if (!bullet.active || !enemy.active) return;

    bullet.kill();
    enemy.kill();

    this.spawnExplosion(enemy.x, enemy.y);
    this.score += 1;
    this.updateScoreText();
  }

  private onEnemyHitsPlayer(_playerObj: Phaser.GameObjects.GameObject, enemyObj: Phaser.GameObjects.GameObject) {
    const enemy = enemyObj as Enemy;
    if (!enemy.active) return;

    enemy.kill();
    this.damagePlayer(20);
  }

  private damagePlayer(amount: number) {
    // Shield first, then HP.
    let remaining = amount;
    if (this.shield > 0) {
      const d = Math.min(this.shield, remaining);
      this.shield -= d;
      remaining -= d;
    }
    if (remaining > 0) {
      this.hp = Math.max(0, this.hp - remaining);
    }

    this.updateBars();
    this.flashPlayer();

    if (this.hp <= 0) {
      // Simple "game over" → back to menu.
      this.time.delayedCall(450, () => this.scene.start("MenuScene"));
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

  private spawnExplosion(x: number, y: number) {
    const boom = this.add
      .sprite(x, y, ATLAS_KEYS.enemy, `${SPRITE_FRAMES.enemyDestructionPrefix}${SPRITE_FRAMES.enemyDestructionStart}${SPRITE_FRAMES.enemyDestructionSuffix}`)
      .setDepth(6);

    boom.play("enemy_explode");
    boom.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => boom.destroy());
  }

  private ensureAnimations() {
    if (this.anims.exists("enemy_explode")) return;

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

    back.on("pointerup", () => this.scene.start("MenuScene"));

    // HP / Shield bars.
    this.hpBar = this.add.image(48, 14, ATLAS_KEYS.ui, UI_FRAMES.barHp).setOrigin(0, 0).setDepth(uiDepth);
    this.shieldBar = this.add.image(48, 34, ATLAS_KEYS.ui, UI_FRAMES.barShield).setOrigin(0, 0).setDepth(uiDepth);

    // Score.
    this.add.image(GAME_WIDTH / 2, 22, ATLAS_KEYS.ui, UI_FRAMES.plateScore).setOrigin(0.5).setDepth(uiDepth);
    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 22, "0", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(uiDepth + 1);
  }

  private updateBars() {
    const hpPct = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    const shieldPct = Phaser.Math.Clamp(this.shield / this.maxShield, 0, 1);

    this.hpBar.setCrop(0, 0, this.hpBar.frame.width * hpPct, this.hpBar.frame.height);
    this.shieldBar.setCrop(0, 0, this.shieldBar.frame.width * shieldPct, this.shieldBar.frame.height);
  }

  private updateScoreText() {
    this.scoreText.setText(String(this.score));
  }
}

