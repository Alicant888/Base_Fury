import Phaser from "phaser";
import { GAME_HEIGHT } from "../config";

const BULLET_SPEED = 600;

export class Bullet extends Phaser.Physics.Arcade.Image {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "bullet");

    this.setActive(false);
    this.setVisible(false);
    this.setDepth(4);
  }

  fire(x: number, y: number) {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);

    body.enable = true;
    body.reset(x, y);

    body.allowGravity = false;
    this.setVelocity(0, -BULLET_SPEED);
  }

  kill() {
    this.setActive(false);
    this.setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.stop();
      body.enable = false;
    }
  }

  update() {
    if (!this.active) return;
    if (this.y < -16) this.kill();
    // Safety: if something pushes the bullet down, recycle it too.
    if (this.y > GAME_HEIGHT + 16) this.kill();
  }
}

