import { Vector } from '../math/Vector';
import { Ball } from './Ball';
import type { IPlayerController } from '../controllers/IPlayerController';

export type PlayerRole = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
export type Team = 'home' | 'away';

/**
 * Player entity - handles player AI, physics and behavior
 */
export class Player {
    pos: Vector;
    vel: Vector;
    acc: Vector;
    startPos: Vector;
    team: Team;
    role: PlayerRole;
    radius: number;
    mass: number;
    maxSpeed: number;
    acceleration: number;
    passTimer: number;
    possessionTime: number;

    // Canvas dimensions for boundary checking and positioning (exposed for controllers)
    canvasWidth: number;
    canvasHeight: number;

    // Player controller (AI or Human)
    private controller: IPlayerController | null = null;

    constructor(
        x: number,
        y: number,
        team: Team,
        role: PlayerRole,
        canvasWidth: number,
        canvasHeight: number
    ) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 0);
        this.acc = new Vector(0, 0);
        this.startPos = new Vector(x, y);
        this.team = team;
        this.role = role;
        this.radius = 15;
        this.mass = 2;
        this.maxSpeed = this.getMaxSpeed();
        this.acceleration = this.getAcceleration();
        this.passTimer = 0;
        this.possessionTime = 0;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    /**
     * Determine max speed based on player role
     */
    private getMaxSpeed(): number {
        switch (this.role) {
            case 'goalkeeper':
                return 1.5;
            case 'defender':
                return 2.0;
            case 'midfielder':
                return 2.3;
            case 'forward':
                return 2.5;
            default:
                return 2.0;
        }
    }

    /**
     * Determine acceleration based on player role
     */
    private getAcceleration(): number {
        switch (this.role) {
            case 'goalkeeper':
                return 0.25;
            case 'defender':
                return 0.35;
            case 'midfielder':
                return 0.4;
            case 'forward':
                return 0.45;
            default:
                return 0.3;
        }
    }

    /**
     * Set the player controller (AI or Human)
     */
    setController(controller: IPlayerController): void {
        this.controller = controller;
    }

    /**
     * Main update function called every frame
     */
    update(ball: Ball, players: Player[]): void {
        // If a controller is set, use it for decision-making
        if (this.controller) {
            this.controller.update(this, ball, players);
            
            // Apply physics after controller has set acceleration
            this.applyPhysics();
        } else {
            // Fallback to default AI behavior if no controller is set
            this.defaultAIUpdate(ball, players);
        }
    }

    /**
     * Apply physics to the player (called by controllers)
     */
    private applyPhysics(): void {
        // Apply velocity and acceleration
        this.vel = this.vel.add(this.acc).limit(this.maxSpeed);
        this.pos = this.pos.add(this.vel);

        // Apply friction
        this.vel = this.vel.mult(0.88);
        this.acc = this.acc.mult(0);

        // Keep player within pitch boundaries
        const padding = 55;
        this.pos.x = Math.max(padding, Math.min(this.canvasWidth - padding, this.pos.x));
        this.pos.y = Math.max(padding, Math.min(this.canvasHeight - padding, this.pos.y));

        // GOALKEEPER SPECIFIC - Stay near goal
        if (this.role === 'goalkeeper') {
            const goalX = this.team === 'home' ? 80 : this.canvasWidth - 80;
            const maxDistance = 100;
            if (Math.abs(this.pos.x - goalX) > maxDistance) {
                this.pos.x = goalX + (this.pos.x > goalX ? maxDistance : -maxDistance);
            }
        }
    }

    /**
     * Default AI update behavior (preserved from original implementation)
     */
    private defaultAIUpdate(ball: Ball, players: Player[]): void {
        const distToBall = this.pos.dist(ball.pos);
        const hasBall = distToBall < this.radius + ball.radius + 5 && ball.vel.mag() < 4;

        if (hasBall) {
            this.possessionTime++;
            this.passTimer++;

            if (this.role === 'goalkeeper') {
                if (this.passTimer > 20) {
                    this.pass(ball, players);
                    this.passTimer = 0;
                    this.possessionTime = 0;
                } else {
                    this.holdBall(ball);
                }
            } else {
                if (this.passTimer > 40 && Math.random() < 0.15) {
                    this.pass(ball, players);
                    this.passTimer = 0;
                    this.possessionTime = 0;
                } else {
                    this.dribble(ball);
                }
            }
        } else {
            this.possessionTime = 0;
            this.moveToPosition(ball, players);
        }

        // Apply physics
        this.vel = this.vel.add(this.acc).limit(this.maxSpeed);
        this.pos = this.pos.add(this.vel);

        // Apply friction
        this.vel = this.vel.mult(0.88);
        this.acc = this.acc.mult(0);

        // Keep player within pitch boundaries
        const padding = 55;
        this.pos.x = Math.max(padding, Math.min(this.canvasWidth - padding, this.pos.x));
        this.pos.y = Math.max(padding, Math.min(this.canvasHeight - padding, this.pos.y));

        // GOALKEEPER SPECIFIC - Stay near goal
        if (this.role === 'goalkeeper') {
            const goalX = this.team === 'home' ? 80 : this.canvasWidth - 80;
            const maxDistance = 100;
            if (Math.abs(this.pos.x - goalX) > maxDistance) {
                this.pos.x = goalX + (this.pos.x > goalX ? maxDistance : -maxDistance);
            }
        }
    }

    /**
     * Hold ball stationary (used by goalkeeper)
     */
    private holdBall(ball: Ball): void {
        ball.pos = this.pos.add(new Vector(this.team === 'home' ? 20 : -20, 0));
        ball.vel = new Vector(0, 0);
    }

    /**
     * Move with ball towards goal (dribbling)
     */
    private dribble(ball: Ball): void {
        const goalX = this.team === 'home' ? this.canvasWidth - 50 : 50;
        const goalY = this.canvasHeight / 2;

        const toGoal = new Vector(goalX - this.pos.x, goalY - this.pos.y).normalize();
        this.acc = this.acc.add(toGoal.mult(this.acceleration));

        const ballOffset = toGoal.mult(this.radius + 10);
        ball.pos = this.pos.add(ballOffset);
        ball.vel = this.vel.mult(0.9);
    }

    /**
     * Pass ball to a teammate
     */
    private pass(ball: Ball, players: Player[]): void {
        const teammates = players.filter((p) => p.team === this.team && p !== this);

        const forwardTeammates = teammates.filter((p) => {
            if (this.team === 'home') return p.pos.x > this.pos.x;
            return p.pos.x < this.pos.x;
        });

        const passTargets = forwardTeammates.length > 0 ? forwardTeammates : teammates;

        if (passTargets.length > 0) {
            const target = passTargets[Math.floor(Math.random() * passTargets.length)];
            const toTarget = target.pos.sub(this.pos).normalize();
            const distance = this.pos.dist(target.pos);
            const passPower = Math.min(12, 6 + distance * 0.015);
            ball.vel = toTarget.mult(passPower);
        }
    }

    /**
     * AI for positioning when player doesn't have ball
     */
    private moveToPosition(ball: Ball, players: Player[]): void {
        let targetPos = this.startPos;

        if (this.role === 'goalkeeper') {
            const goalX = this.team === 'home' ? 80 : this.canvasWidth - 80;
            targetPos = new Vector(
                goalX,
                Math.max(150, Math.min(this.canvasHeight - 150, ball.pos.y))
            );
        } else {
            const distToBall = this.pos.dist(ball.pos);
            const distToStart = this.pos.dist(this.startPos);

            if (ball.vel.mag() < 3) {
                const closestTeammate = players
                    .filter((p) => p.team === this.team && p !== this && p.role !== 'goalkeeper')
                    .reduce(
                        (closest, p) => {
                            const d = p.pos.dist(ball.pos);
                            return d < closest.dist ? { player: p, dist: d } : closest;
                        },
                        { player: null as Player | null, dist: Infinity }
                    );

                const closestOpponent = players
                    .filter((p) => p.team !== this.team && p.role !== 'goalkeeper')
                    .reduce(
                        (closest, p) => {
                            const d = p.pos.dist(ball.pos);
                            return d < closest.dist ? { player: p, dist: d } : closest;
                        },
                        { player: null as Player | null, dist: Infinity }
                    );

                if (
                    distToBall < closestTeammate.dist &&
                    distToBall < closestOpponent.dist &&
                    distToBall < 250
                ) {
                    targetPos = ball.pos;
                } else if (distToStart > 150) {
                    targetPos = this.startPos;
                } else {
                    const supportDistance = 80;
                    const supportX =
                        this.team === 'home'
                            ? ball.pos.x - supportDistance
                            : ball.pos.x + supportDistance;
                    const spreadY = ball.pos.y + (Math.random() - 0.5) * 120;
                    targetPos = new Vector(supportX, spreadY);
                }
            }
        }

        const desired = targetPos.sub(this.pos).normalize().mult(this.maxSpeed);
        const steer = desired.sub(this.vel).limit(0.4);
        this.acc = this.acc.add(steer);
    }

    /**
     * Draw player on canvas
     */
    draw(ctx: CanvasRenderingContext2D): void {
        const color = this.team === 'home' ? '#FF4444' : '#4444FF';

        if (this.role === 'goalkeeper') {
            ctx.fillStyle = this.team === 'home' ? '#FFD700' : '#00CED1';
        } else {
            ctx.fillStyle = color;
        }

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(this.pos.x + 2, this.pos.y + 2, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
