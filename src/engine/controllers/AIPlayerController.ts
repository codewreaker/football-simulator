import type { IPlayerController } from './IPlayerController';
import type { Ball } from '../entities/Ball';
import type { Player } from '../entities/Player';
import { Vector } from '../math/Vector';
import type { DifficultyConfig } from '../difficulty/DifficultyConfig';

/**
 * AIPlayerController - Handles AI decision-making for CPU-controlled players
 * Uses difficulty configuration to adjust behavior
 */
export class AIPlayerController implements IPlayerController {
    private difficultyConfig: DifficultyConfig;
    private passTimer: number = 0;

    constructor(difficultyConfig: DifficultyConfig) {
        this.difficultyConfig = difficultyConfig;
    }

    update(player: Player, ball: Ball, players: Player[]): void {
        const distToBall = player.pos.dist(ball.pos);
        const hasBall =
            distToBall < player.radius + ball.radius + 5 &&
            ball.vel.mag() < 4;

        if (hasBall) {
            this.handlePossession(player, ball, players);
        } else {
            this.handleOffBall(player, ball);
        }
    }

    private handlePossession(
        player: Player,
        ball: Ball,
        players: Player[]
    ): void {
        this.passTimer++;
        const diffConfig = this.difficultyConfig;

        const passThreshold =
            player.role === 'goalkeeper' ? 20 : diffConfig.dribblingTime;

        if (this.passTimer > passThreshold) {
            // Decide: pass or shoot?
            const nearGoal = this.isNearOpponentGoal(player);
            const shouldShoot =
                nearGoal && Math.random() < diffConfig.shootingConfidence;

            if (shouldShoot) {
                this.shoot(player, ball);
            } else {
                const passSuccess = Math.random() < diffConfig.passAccuracy;
                if (passSuccess) {
                    this.pass(player, ball, players);
                }
            }

            this.passTimer = 0;
        } else {
            // Dribble towards goal
            this.dribble(player, ball);
        }
    }

    private handleOffBall(
        player: Player,
        ball: Ball
    ): void {
        this.passTimer = 0;

        if (player.role === 'goalkeeper') {
            this.positionGoalkeeper(player, ball);
        } else {
            this.positionOutfieldPlayer(player, ball);
        }
    }

    private dribble(player: Player, ball: Ball): void {
        const goalX =
            player.team === 'home' ? player.canvasWidth - 50 : 50;
        const goalY = player.canvasHeight / 2;

        const toGoal = new Vector(
            goalX - player.pos.x,
            goalY - player.pos.y
        ).normalize();

        player.acc = player.acc.add(
            toGoal.mult(
                player.acceleration *
                this.difficultyConfig.ballControlPrecision
            )
        );

        const ballOffset = toGoal.mult(player.radius + 10);
        ball.pos = player.pos.add(ballOffset);
        ball.vel = player.vel.mult(0.9);
    }

    private pass(
        player: Player,
        ball: Ball,
        players: Player[]
    ): void {
        const teammates = players.filter(
            (p) => p.team === player.team && p !== player
        );

        const forwardTeammates = teammates.filter((p) => {
            if (player.team === 'home') return p.pos.x > player.pos.x;
            return p.pos.x < player.pos.x;
        });

        const passTargets =
            forwardTeammates.length > 0 ? forwardTeammates : teammates;

        if (passTargets.length > 0) {
            const target =
                passTargets[Math.floor(Math.random() * passTargets.length)];
            const toTarget = target.pos.sub(player.pos).normalize();
            const distance = player.pos.dist(target.pos);

            // Calculate pass power with difficulty adjustment
            const basePower = 6 + distance * 0.015;
            const powerVariation =
                basePower *
                (1 +
                    (Math.random() - 0.5) *
                    this.difficultyConfig.passPowerVariation);
            const finalPower = Math.min(12, Math.max(3, powerVariation));

            ball.vel = toTarget.mult(finalPower);
        }
    }

    private shoot(
        player: Player,
        ball: Ball
    ): void {
        const goalX =
            player.team === 'home' ? player.canvasWidth - 50 : 50;
        const goalY = player.canvasHeight / 2;

        const toGoal = new Vector(
            goalX - player.pos.x,
            goalY - player.pos.y
        ).normalize();

        // Add some variation based on difficulty
        const angleVariation =
            (Math.random() - 0.5) *
            0.5 *
            (1 - this.difficultyConfig.shootingConfidence);
        const angle =
            Math.atan2(toGoal.y, toGoal.x) + angleVariation;
        const shootPower = 15 * this.difficultyConfig.shootingConfidence;

        ball.vel = new Vector(
            Math.cos(angle) * shootPower,
            Math.sin(angle) * shootPower
        );
    }

    private positionGoalkeeper(player: Player, ball: Ball): void {
        const goalX =
            player.team === 'home' ? 80 : player.canvasWidth - 80;
        const targetY = Math.max(
            150,
            Math.min(
                player.canvasHeight - 150,
                ball.pos.y
            )
        );

        const targetPos = new Vector(goalX, targetY);
        const desired = targetPos
            .sub(player.pos)
            .normalize()
            .mult(player.maxSpeed);
        const steer = desired.sub(player.vel).limit(0.4);
        player.acc = player.acc.add(steer);
    }

    private positionOutfieldPlayer(
        player: Player,
        ball: Ball
    ): void {
        let targetPos = player.startPos;
        const distToBall = player.pos.dist(ball.pos);
        const distToStart = player.pos.dist(player.startPos);

        if (
            ball.vel.mag() <
            3 * (1 - this.difficultyConfig.reactionTime * 0.01)
        ) {
            // Just move towards the ball if it's slow enough
            if (distToBall < 250) {
                targetPos = ball.pos;
            } else if (distToStart > 150) {
                targetPos = player.startPos;
            } else {
                const supportDistance = 80;
                const supportX =
                    player.team === 'home'
                        ? ball.pos.x - supportDistance
                        : ball.pos.x + supportDistance;
                const spreadY =
                    ball.pos.y + (Math.random() - 0.5) * 120;
                targetPos = new Vector(supportX, spreadY);
            }
        }

        const desired = targetPos
            .sub(player.pos)
            .normalize()
            .mult(player.maxSpeed);
        const steer = desired.sub(player.vel).limit(0.4);
        player.acc = player.acc.add(steer);
    }

    private isNearOpponentGoal(player: Player): boolean {
        const goal = new Vector(
            player.team === 'home' ? player.canvasWidth - 50 : 50,
            player.canvasHeight / 2
        );
        return player.pos.dist(goal) < 200;
    }

    reset(): void {
        this.passTimer = 0;
    }
}
