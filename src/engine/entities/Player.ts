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
    sprintSpeed: number;
    acceleration: number;
    passTimer: number;
    possessionTime: number;

    // Stamina system
    stamina: number = 100;
    maxStamina: number = 100;
    staminaRecoveryRate: number = 8; // per second
    staminaDrainRate: number = 20; // per second when sprinting
    isSprinting: boolean = false;

    // Canvas dimensions for boundary checking and positioning (exposed for controllers)
    canvasWidth: number;
    canvasHeight: number;

    // Player controller (AI or Human)
    private controller: IPlayerController | null = null;

    // Ball possession tracking
    hasPossession: boolean = false;
    private possessionCooldown: number = 0;

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
        this.sprintSpeed = this.maxSpeed * 1.6;
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
                return 100; // pixels per second
            case 'defender':
                return 130;
            case 'midfielder':
                return 150;
            case 'forward':
                return 160;
            default:
                return 130;
        }
    }

    /**
     * Determine acceleration based on player role
     */
    private getAcceleration(): number {
        switch (this.role) {
            case 'goalkeeper':
                return 400; // pixels per second squared
            case 'defender':
                return 500;
            case 'midfielder':
                return 550;
            case 'forward':
                return 600;
            default:
                return 500;
        }
    }

    /**
     * Set the player controller (AI or Human)
     */
    setController(controller: IPlayerController): void {
        this.controller = controller;
    }

    /**
     * Check if player has possession of the ball
     */
    updatePossession(ball: Ball, deltaTime: number): void {
        const distToBall = this.pos.dist(ball.pos);
        const possessionRadius = this.radius + ball.radius + 15;
        
        // Update cooldown
        if (this.possessionCooldown > 0) {
            this.possessionCooldown -= deltaTime;
        }

        // Check for possession (ball close and moving slowly)
        if (distToBall < possessionRadius && ball.vel.mag() < 250 && this.possessionCooldown <= 0) {
            this.hasPossession = true;
            this.possessionTime += deltaTime;
            
            // Don't magnetize - let controller handle ball position
        } else if (distToBall > possessionRadius + 15) {
            if (this.hasPossession) {
                this.possessionCooldown = 0.2; // 0.2 second cooldown after losing possession
            }
            this.hasPossession = false;
            this.possessionTime = 0;
        }
    }

    /**
     * Set sprinting state
     */
    setSprinting(sprinting: boolean): void {
        if (sprinting && this.stamina > 5) {
            this.isSprinting = true;
        } else {
            this.isSprinting = false;
        }
    }

    /**
     * Update stamina based on sprint state
     */
    private updateStamina(deltaTime: number): void {
        if (this.isSprinting && this.vel.mag() > 50) {
            // Drain stamina when sprinting and actually moving
            this.stamina = Math.max(0, this.stamina - this.staminaDrainRate * deltaTime);
            if (this.stamina <= 0) {
                this.isSprinting = false;
            }
        } else {
            // Recover stamina when not sprinting
            this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRecoveryRate * deltaTime);
        }
    }

    /**
     * Get current effective max speed (considering stamina and sprinting)
     */
    private getEffectiveMaxSpeed(): number {
        if (this.isSprinting && this.stamina > 5) {
            return this.sprintSpeed;
        }
        
        // Reduce speed if stamina is very low
        const staminaFactor = Math.max(0.7, this.stamina / this.maxStamina);
        return this.maxSpeed * staminaFactor;
    }

    /**
     * Main update function called every frame
     */
    update(ball: Ball, players: Player[], deltaTime: number): void {
        // Update possession status
        this.updatePossession(ball, deltaTime);
        
        // Update stamina
        this.updateStamina(deltaTime);

        // If a controller is set, use it for decision-making
        if (this.controller) {
            this.controller.update(this, ball, players);
            
            // Apply physics after controller has set acceleration
            this.applyPhysics(deltaTime);
        } else {
            // Fallback to default AI behavior if no controller is set
            this.defaultAIUpdate(ball, players, deltaTime);
        }
    }

    /**
     * Apply physics to the player (called by controllers)
     */
    private applyPhysics(deltaTime: number): void {
        // Get effective max speed
        const effectiveMaxSpeed = this.getEffectiveMaxSpeed();
        
        // Apply acceleration to velocity (physics formula: v = v + a*t)
        this.vel = this.vel.add(this.acc.mult(deltaTime));
        
        // Limit velocity to max speed
        this.vel = this.vel.limit(effectiveMaxSpeed);
        
        // Apply position change (physics formula: p = p + v*t)
        this.pos = this.pos.add(this.vel.mult(deltaTime));

        // Apply friction/drag (exponential decay)
        const frictionFactor = Math.pow(0.12, deltaTime); // 0.88 per frame at 60fps = 0.12 per second
        this.vel = this.vel.mult(frictionFactor);
        
        // Reset acceleration for next frame
        this.acc = new Vector(0, 0);

        // Keep player within pitch boundaries
        const padding = 55;
        if (this.pos.x < padding) {
            this.pos.x = padding;
            this.vel.x = Math.abs(this.vel.x) * 0.3; // Bounce back slightly
        }
        if (this.pos.x > this.canvasWidth - padding) {
            this.pos.x = this.canvasWidth - padding;
            this.vel.x = -Math.abs(this.vel.x) * 0.3;
        }
        if (this.pos.y < padding) {
            this.pos.y = padding;
            this.vel.y = Math.abs(this.vel.y) * 0.3;
        }
        if (this.pos.y > this.canvasHeight - padding) {
            this.pos.y = this.canvasHeight - padding;
            this.vel.y = -Math.abs(this.vel.y) * 0.3;
        }

        // GOALKEEPER SPECIFIC - Stay near goal
        if (this.role === 'goalkeeper') {
            const goalX = this.team === 'home' ? 80 : this.canvasWidth - 80;
            const maxDistance = 100;
            if (Math.abs(this.pos.x - goalX) > maxDistance) {
                this.pos.x = goalX + (this.pos.x > goalX ? maxDistance : -maxDistance);
                this.vel.x *= 0.5;
            }
        }
    }

    /**
     * Default AI update behavior (preserved from original implementation)
     */
    private defaultAIUpdate(ball: Ball, players: Player[], deltaTime: number): void {
        
        if (this.hasPossession) {
            this.passTimer += deltaTime;

            if (this.role === 'goalkeeper') {
                if (this.passTimer > 1.0) {
                    this.pass(ball, players);
                    this.passTimer = 0;
                    this.possessionTime = 0;
                } else {
                    this.holdBall(ball);
                }
            } else {
                if (this.passTimer > 2.0 && Math.random() < 0.15) {
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
        this.applyPhysics(deltaTime);
    }

    /**
     * Hold ball stationary (used by goalkeeper)
     */
    private holdBall(ball: Ball): void {
        const offset = this.team === 'home' ? 20 : -20;
        ball.pos = this.pos.add(new Vector(offset, 0));
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

        // Keep ball in front of player
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
            const passPower = Math.min(600, 300 + distance * 0.8);
            ball.vel = toTarget.mult(passPower);
            this.hasPossession = false;
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

            if (ball.vel.mag() < 150) {
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

        const desired = targetPos.sub(this.pos).normalize().mult(this.acceleration);
        const steer = desired.sub(this.vel.mult(0.1)).limit(this.acceleration * 0.8);
        this.acc = this.acc.add(steer);
    }

    /**
     * Draw player on canvas
     */
    draw(ctx: CanvasRenderingContext2D, isSelected: boolean = false): void {
        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(this.pos.x + 2, this.pos.y + 2, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw player body
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

        // Draw selection indicator
        if (isSelected) {
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw arrow above player
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y - this.radius - 15);
            ctx.lineTo(this.pos.x - 5, this.pos.y - this.radius - 8);
            ctx.lineTo(this.pos.x + 5, this.pos.y - this.radius - 8);
            ctx.closePath();
            ctx.fill();
        }

        // Draw possession indicator
        if (this.hasPossession) {
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw stamina bar (only for human-controlled players when selected)
        if (isSelected && this.stamina < this.maxStamina) {
            const barWidth = 30;
            const barHeight = 4;
            const barX = this.pos.x - barWidth / 2;
            const barY = this.pos.y + this.radius + 12;

            // Background
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Stamina level
            const staminaPercent = this.stamina / this.maxStamina;
            const staminaColor = staminaPercent > 0.5 ? '#00FF00' : staminaPercent > 0.25 ? '#FFAA00' : '#FF0000';
            ctx.fillStyle = staminaColor;
            ctx.fillRect(barX, barY, barWidth * staminaPercent, barHeight);
        }
    }
}