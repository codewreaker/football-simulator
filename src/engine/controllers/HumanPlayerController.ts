import type { IPlayerController } from './IPlayerController';
import type { Ball } from '../entities/Ball';
import type { Player } from '../entities/Player';
import { Vector } from '../math/Vector';

/**
 * HumanPlayerController - Handles keyboard input for human-controlled players
 */
export class HumanPlayerController implements IPlayerController {
    private pressedKeys: Set<string> = new Set();
    private moveSpeed: number = 0.5;
    private lastPassTime: number = 0;
    private passDelay: number = 10; // frames between passes

    update(player: Player, ball: Ball): void {
        // Get player input
        const moveVector = new Vector(0, 0);

        if (this.pressedKeys.has('ArrowUp') || this.pressedKeys.has('w')) {
            moveVector.y -= 1;
        }
        if (this.pressedKeys.has('ArrowDown') || this.pressedKeys.has('s')) {
            moveVector.y += 1;
        }
        if (this.pressedKeys.has('ArrowLeft') || this.pressedKeys.has('a')) {
            moveVector.x -= 1;
        }
        if (this.pressedKeys.has('ArrowRight') || this.pressedKeys.has('d')) {
            moveVector.x += 1;
        }

        // Normalize diagonal movement
        if (moveVector.mag() > 0) {
            const normalized = moveVector.normalize();
            player.acc = player.acc.add(
                normalized.mult(player.acceleration * this.moveSpeed)
            );
        }

        // Handle passing/shooting
        this.lastPassTime++;
        if (
            (this.pressedKeys.has(' ') ||
                this.pressedKeys.has('enter')) &&
            this.lastPassTime > this.passDelay
        ) {
            const distToBall = player.pos.dist(ball.pos);
            if (distToBall < player.radius + ball.radius + 20) {
                // Determine pass direction (forward for player's team)
                const passDirection = new Vector(
                    player.team === 'home' ? 1 : -1,
                    0
                );
                ball.vel = passDirection.mult(12);
                this.lastPassTime = 0;
            }
        }

        // Ball follows human player when they're close
        const distToBall = player.pos.dist(ball.pos);
        if (distToBall < player.radius + ball.radius + 15 && ball.vel.mag() < 3) {
            const towardGoal = new Vector(
                player.team === 'home' ? 1 : -1,
                0
            );
            const ballOffset = towardGoal.mult(player.radius + 10);
            ball.pos = player.pos.add(ballOffset);
            ball.vel = player.vel.mult(0.8);
        }
    }

    handleInput(keys: Set<string>): void {
        this.pressedKeys = keys;
    }

    reset(): void {
        this.pressedKeys.clear();
        this.lastPassTime = 0;
    }
}
