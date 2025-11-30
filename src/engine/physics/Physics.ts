import { Player } from '../entities/Player';
import { Ball } from '../entities/Ball';
import { Vector } from '../math/Vector';

/**
 * Physics - Handles collision detection and response between players and ball
 */
export class Physics {
    /**
     * Handle collisions between all players and with the ball
     */
    static handleCollisions(players: Player[], ball: Ball): void {
        // Handle player-to-player collisions
        this.handlePlayerCollisions(players);
        
        // Handle player-to-ball collisions
        this.handlePlayerBallCollisions(players, ball);
    }

    /**
     * Handle collisions between all players
     * Uses impulse-based collision response for realistic physics
     */
    private static handlePlayerCollisions(players: Player[]): void {
        // Check every pair of players for collision
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const p1 = players[i];
                const p2 = players[j];
                const distance = p1.pos.dist(p2.pos);
                const minDist = p1.radius + p2.radius;

                // If players are overlapping
                if (distance < minDist && distance > 0) {
                    this.resolvePlayerCollision(p1, p2, distance, minDist);
                }
            }
        }
    }

    /**
     * Resolve a collision between two players
     * Separates them and applies impulse-based physics response
     */
    private static resolvePlayerCollision(
        p1: Player,
        p2: Player,
        distance: number,
        minDist: number
    ): void {
        // Calculate collision normal (direction to push apart)
        const normal = p1.pos.sub(p2.pos).normalize();

        // Separate players so they're not overlapping
        const overlap = minDist - distance;
        const separation = normal.mult(overlap / 2);
        
        p1.pos = p1.pos.add(separation);
        p2.pos = p2.pos.sub(separation);

        // Calculate relative velocity
        const relativeVel = p1.vel.sub(p2.vel);
        const velocityAlongNormal = relativeVel.x * normal.x + relativeVel.y * normal.y;

        // Don't resolve if velocities are separating
        if (velocityAlongNormal > 0) return;

        // Calculate restitution (bounciness) - 0.4 for some energy loss
        const restitution = 0.4;
        
        // Calculate impulse scalar
        const impulseScalar = -(1 + restitution) * velocityAlongNormal;
        const totalMass = p1.mass + p2.mass;
        const impulse = impulseScalar / totalMass;

        // Apply impulse to both players
        const impulseVec = normal.mult(impulse);
        p1.vel = p1.vel.add(impulseVec.mult(p2.mass));
        p2.vel = p2.vel.sub(impulseVec.mult(p1.mass));

        // Add some friction to slow down players after collision
        p1.vel = p1.vel.mult(0.85);
        p2.vel = p2.vel.mult(0.85);
    }

    /**
     * Handle collisions between players and the ball
     */
    private static handlePlayerBallCollisions(players: Player[], ball: Ball): void {
        for (const player of players) {
            const distance = player.pos.dist(ball.pos);
            const minDist = player.radius + ball.radius;

            if (distance < minDist && distance > 0) {
                this.resolvePlayerBallCollision(player, ball, distance, minDist);
            }
        }
    }

    /**
     * Resolve collision between player and ball
     */
    private static resolvePlayerBallCollision(
        player: Player,
        ball: Ball,
        distance: number,
        minDist: number
    ): void {
        // Calculate collision normal
        const normal = ball.pos.sub(player.pos).normalize();

        // Separate player and ball
        const overlap = minDist - distance;
        const separation = normal.mult(overlap);
        
        // Move ball away from player (ball moves, player stays)
        ball.pos = ball.pos.add(separation);

        // Only apply force if player is moving towards ball or ball is moving slowly
        const relativeVel = player.vel.sub(ball.vel);
        const velocityAlongNormal = relativeVel.x * normal.x + relativeVel.y * normal.y;

        // If player has possession, don't apply collision force (let controller handle ball)
        if (player.hasPossession) {
            return;
        }

        // If player is moving towards ball, apply kick force
        if (velocityAlongNormal < -20) {
            // Calculate kick strength based on player velocity
            const playerSpeed = player.vel.mag();
            const kickStrength = Math.min(playerSpeed * 1.5, 400);
            
            // Determine kick direction (combination of player velocity and collision normal)
            const playerDirection = player.vel.normalize();
            const kickDirection = playerDirection.mult(0.7).add(normal.mult(0.3)).normalize();
            
            // Apply kick to ball
            ball.vel = kickDirection.mult(kickStrength);
            
            // Add slight spin based on impact angle
            const crossProduct = playerDirection.x * normal.y - playerDirection.y * normal.x;
            ball.spin = crossProduct * 0.3;
            
            // Slow down player slightly from impact
            player.vel = player.vel.mult(0.7);
        } else if (ball.vel.mag() > 50) {
            // Ball bounces off stationary or slow-moving player
            const restitution = 0.5;
            
            // Calculate ball's new velocity after bounce
            const ballVelAlongNormal = ball.vel.x * normal.x + ball.vel.y * normal.y;
            const impulse = -(1 + restitution) * ballVelAlongNormal;
            
            ball.vel = ball.vel.add(normal.mult(impulse));
            ball.vel = ball.vel.mult(0.8); // Energy loss
        }
    }

    /**
     * Apply tackle - used when player attempts to tackle
     */
    static applyTackle(tackler: Player, target: Player, ball: Ball): boolean {
        const distance = tackler.pos.dist(target.pos);
        
        if (distance < tackler.radius + target.radius + 20) {
            // Successful tackle range
            const tackleForce = tackler.vel.normalize().mult(50);
            target.vel = target.vel.add(tackleForce);
            
            // If target had possession, they lose it
            if (target.hasPossession) {
                target.hasPossession = false;
                
                // Ball goes in random direction
                const randomAngle = Math.random() * Math.PI * 2;
                const randomDir = new Vector(Math.cos(randomAngle), Math.sin(randomAngle));
                ball.vel = randomDir.mult(150 + Math.random() * 100);
                
                return true;
            }
        }
        
        return false;
    }

    /**
     * Calculate if a shot will reach the goal
     */
    static predictShotTrajectory(
        startPos: Vector,
        velocity: Vector,
        canvasWidth: number,
        canvasHeight: number
    ): { willScore: boolean; impactPoint: Vector } {
        // Simple linear prediction (ignoring friction for simplicity)
        const goalX = velocity.x > 0 ? canvasWidth - 20 : 20;
        const timeToGoal = Math.abs((goalX - startPos.x) / velocity.x);
        const impactY = startPos.y + velocity.y * timeToGoal;
        
        const goalTop = canvasHeight / 2 - 80;
        const goalBottom = canvasHeight / 2 + 80;
        
        const willScore = impactY >= goalTop && impactY <= goalBottom;
        const impactPoint = new Vector(goalX, impactY);
        
        return { willScore, impactPoint };
    }

    /**
     * Calculate interception point for AI
     */
    static calculateInterceptionPoint(
        playerPos: Vector,
        ballPos: Vector,
        ballVel: Vector,
        playerSpeed: number
    ): Vector | null {
        // Predict where ball will be and if player can reach it
        const timeSteps = 60; // Check up to 1 second ahead (at 60fps)
        
        for (let t = 1; t <= timeSteps; t++) {
            const deltaTime = t / 60;
            const futureBallPos = ballPos.add(ballVel.mult(deltaTime));
            const distanceToFutureBall = playerPos.dist(futureBallPos);
            const playerCanReach = distanceToFutureBall <= playerSpeed * deltaTime;
            
            if (playerCanReach) {
                return futureBallPos;
            }
        }
        
        return null; // Can't intercept
    }

    /**
     * Check if path is blocked by players
     */
    static isPathBlocked(
        start: Vector,
        end: Vector,
        obstacles: Player[],
        threshold: number = 30
    ): boolean {
        const path = end.sub(start);
        const pathLength = path.mag();
        
        for (const obstacle of obstacles) {
            const toObstacle = obstacle.pos.sub(start);
            const projection = (toObstacle.x * path.x + toObstacle.y * path.y) / pathLength;
            
            // Check if obstacle is along the path
            if (projection > 0 && projection < pathLength) {
                const perpDistance = Math.abs(
                    (toObstacle.x * path.y - toObstacle.y * path.x) / pathLength
                );
                
                if (perpDistance < threshold + obstacle.radius) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Apply drag force (air resistance) to ball
     */
    static applyDrag(ball: Ball, dragCoefficient: number = 0.98): void {
        ball.vel = ball.vel.mult(dragCoefficient);
    }

    /**
     * Check for goal line clearance
     */
    static isGoalLineClearance(
        ballPos: Vector,
        ballVel: Vector,
        canvasWidth: number,
        canvasHeight: number
    ): boolean {
        const goalTop = canvasHeight / 2 - 80;
        const goalBottom = canvasHeight / 2 + 80;
        
        // Check if ball is near goal line and heading towards goal
        const nearLeftGoal = ballPos.x < 50 && ballVel.x < 0;
        const nearRightGoal = ballPos.x > canvasWidth - 50 && ballVel.x > 0;
        const inGoalHeight = ballPos.y >= goalTop && ballPos.y <= goalBottom;
        
        return (nearLeftGoal || nearRightGoal) && inGoalHeight;
    }
}