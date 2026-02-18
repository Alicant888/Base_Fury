import * as Phaser from "phaser";
import { ATLAS_KEYS, GAME_HEIGHT, GAME_WIDTH, SPRITE_FRAMES } from "../config";

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ATLAS_KEYS.ship, SPRITE_FRAMES.playerShip);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(5);
    this.setCollideWorldBounds(true);

    // Slightly smaller hitbox than the trimmed frame.
    (this.body as Phaser.Physics.Arcade.Body).setSize(this.width * 0.6, this.height * 0.6, true);
  }

  /**
   * Clamp player position to the internal game bounds.
   */
  clampToBounds() {
    const halfW = this.displayWidth * 0.5;
    const halfH = this.displayHeight * 0.5;
    this.x = Phaser.Math.Clamp(this.x, halfW, GAME_WIDTH - halfW);
    // Keep the ship in the lower ~70% of the screen for a shooter feel.
    this.y = Phaser.Math.Clamp(this.y, GAME_HEIGHT * 0.25, GAME_HEIGHT - halfH);
  }
}

