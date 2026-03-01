import * as Phaser from "phaser";
import { IMAGE_KEYS } from "../config";

/**
 * Satellite drone that orbits the player ship.
 *
 * - Uses "magnetic bond" movement: smoothly follows an orbit point around the player.
 * - Orbit radius ≈ 4× player ship width.
 * - Hidden HP pool (default 4). When HP reaches 0 the drone is destroyed.
 * - Angular speed is constant; the drone completes one orbit in roughly 4 seconds.
 */

const DRONE_ORBIT_SPEED = 1.6; // radians per second
const DRONE_MAX_HP = 4;

export class Drone extends Phaser.Physics.Arcade.Image {
    /** Current orbit angle (radians). */
    private orbitAngle = 0;
    /** Computed orbit radius — set once from player dimensions. */
    private orbitRadius = 0;

    /** Hidden HP pool (not displayed). */
    hp = DRONE_MAX_HP;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, IMAGE_KEYS.droneSprite);

        this.setActive(false);
        this.setVisible(false);
        this.setDepth(5.5); // just above player (5) but below engine/shield
        this.setScale(0.6); // 40% smaller
    }

    /** Activate the drone sprite. orbitRadius is set from the player's display width. */
    activate(playerWidth: number, spawnX?: number, spawnY?: number) {
        this.orbitRadius = playerWidth * 1.4;
        this.hp = DRONE_MAX_HP;
        this.orbitAngle = Math.PI; // start from under the ship

        // Spawn on top of the player to avoid the drone "flying in" from (0,0).
        if (typeof spawnX === "number" && typeof spawnY === "number") {
            this.setPosition(spawnX, spawnY);
        }

        this.setActive(true);
        this.setVisible(true);

        const body = this.body as Phaser.Physics.Arcade.Body | null;
        if (body) {
            body.enable = true;
            body.setSize(this.width * 0.8, this.height * 0.8, true);
            body.reset(this.x, this.y);
        }
    }

    /** Deactivate (destroy visually) without removing the game object. */
    deactivate() {
        this.setActive(false);
        this.setVisible(false);

        const body = this.body as Phaser.Physics.Arcade.Body | null;
        if (body) body.enable = false;
    }

    /** Take damage. Returns remaining HP. */
    hit(amount = 1): number {
        this.hp = Math.max(0, this.hp - amount);
        if (this.hp <= 0) this.deactivate();
        return this.hp;
    }

    /** Must be called every frame. Updates orbit position around the player. */
    orbitUpdate(playerX: number, playerY: number, delta: number) {
        if (!this.active) return;

        const dt = delta / 1000;
        this.orbitAngle += DRONE_ORBIT_SPEED * dt;
        if (this.orbitAngle > Math.PI * 2) this.orbitAngle -= Math.PI * 2;

        const targetX = playerX + Math.cos(this.orbitAngle) * this.orbitRadius;
        const targetY = playerY + Math.sin(this.orbitAngle) * this.orbitRadius;

        // Smooth "magnetic" follow — lerp toward the orbit target for a fluid feel.
        const lerp = 0.15;
        this.x += (targetX - this.x) * lerp;
        this.y += (targetY - this.y) * lerp;

        // Sync physics body to manual position.
        const body = this.body as Phaser.Physics.Arcade.Body | null;
        if (body) body.reset(this.x, this.y);
    }

    /** Firing muzzle position (center-top of the drone). */
    getMuzzleX(): number { return this.x; }
    getMuzzleY(): number { return this.y - this.displayHeight * 0.3; }
}
