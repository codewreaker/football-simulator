// File: src/engine/entities/Ball.ts

import { Vector } from '../math/Vector';

/**
 * Ball entity - handles ball physics and goal detection
 */
export class Ball {
    pos: Vector;
    vel: Vector;
    radius: number;
    friction: number;
    mass: number;
    spin: number = 0; // Angular velocity for curved balls

    // Canvas dimensions for boundary checking
    private canvasWidth: number;
    private canvasHeight: number;

    // Goal dimensions - FIXED VALUES
    private readonly GOAL_TOP_OFFSET = 140;  // Distance from center to top of goal
    private readonly GOAL_BOTTOM_OFFSET = 140; // Distance from center to bottom of goal
    private readonly GOAL_LINE_LEFT = 50;    // Left boundary
    private readonly GOAL_LINE_RIGHT = 50;   // Right boundary (from canvas edge)

    constructor(canvasWidth: number, canvasHeight: number) {
        this.pos = new Vector(canvasWidth / 2, canvasHeight / 2);
        this.vel = new Vector(0, 0);
        this.radius = 6;
        this.friction = 0.97;
        this.mass = 1;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    /**
     * Update ball position and handle physics
     * Returns info about goals scored
     */
    update(deltaTime: number): { goalScored: boolean; scoredBy: 'home' | 'away' | null } {
        // Apply velocity to position
        this.pos = this.pos.add(this.vel.mult(deltaTime));

        // Apply friction
        const frictionFactor = Math.pow(this.friction, deltaTime * 60);
        this.vel = this.vel.mult(frictionFactor);

        // Apply spin effect
        if (Math.abs(this.spin) > 0.01) {
            const spinForce = new Vector(-this.vel.y, this.vel.x).normalize().mult(this.spin * 30 * deltaTime);
            this.vel = this.vel.add(spinForce);
            this.spin *= Math.pow(0.95, deltaTime * 60);
        }

        // Stop ball if moving very slowly
        if (this.vel.mag() < 3) {
            this.vel = new Vector(0, 0);
            this.spin = 0;
        }

        // GOAL DETECTION FIRST - Before boundary collision
        const goalResult = this.checkGoal();
        if (goalResult.goalScored) {
            return goalResult;
        }

        // Then handle boundary collision
        this.handleBoundaryCollision();

        return { goalScored: false, scoredBy: null };
    }

    /**
     * FIXED: Check if ball has crossed the goal line
     */
    private checkGoal(): { goalScored: boolean; scoredBy: 'home' | 'away' | null } {
        const centerY = this.canvasHeight / 2;
        const goalTop = centerY - this.GOAL_TOP_OFFSET;
        const goalBottom = centerY + this.GOAL_BOTTOM_OFFSET;

        // Check if ball Y position is within goal height
        // NO radius adjustment - we want the ball center to count
        const isInGoalHeight = this.pos.y >= goalTop && this.pos.y <= goalBottom;

        if (isInGoalHeight) {
            // Left goal (home side) - Away team scores
            // Ball crosses LEFT goal line
            if (this.pos.x <= this.GOAL_LINE_LEFT) {
                console.log('GOAL! Away team scored! Ball at:', this.pos.x, this.pos.y);
                return { goalScored: true, scoredBy: 'away' };
            }
            
            // Right goal (away side) - Home team scores  
            // Ball crosses RIGHT goal line
            if (this.pos.x >= this.canvasWidth - this.GOAL_LINE_RIGHT) {
                console.log('GOAL! Home team scored! Ball at:', this.pos.x, this.pos.y);
                return { goalScored: true, scoredBy: 'home' };
            }
        }

        return { goalScored: false, scoredBy: null };
    }

    /**
     * FIXED: Handle collision with pitch boundaries (but not goals)
     */
    private handleBoundaryCollision(): void {
        const padding = 50;
        const dampening = 0.6;

        const centerY = this.canvasHeight / 2;
        const goalTop = centerY - this.GOAL_TOP_OFFSET;
        const goalBottom = centerY + this.GOAL_TOP_OFFSET;
        const isInGoalHeight = this.pos.y >= goalTop && this.pos.y <= goalBottom;

        // Left boundary - only bounce if NOT in goal area
        if (this.pos.x - this.radius < padding && !isInGoalHeight) {
            this.pos.x = padding + this.radius;
            this.vel.x *= -dampening;
            this.spin *= 0.7;
        }

        // Right boundary - only bounce if NOT in goal area
        if (this.pos.x + this.radius > this.canvasWidth - padding && !isInGoalHeight) {
            this.pos.x = this.canvasWidth - padding - this.radius;
            this.vel.x *= -dampening;
            this.spin *= 0.7;
        }

        // Top boundary
        if (this.pos.y - this.radius < padding) {
            this.pos.y = padding + this.radius;
            this.vel.y *= -dampening;
            this.spin *= 0.7;
        }

        // Bottom boundary
        if (this.pos.y + this.radius > this.canvasHeight - padding) {
            this.pos.y = this.canvasHeight - padding - this.radius;
            this.vel.y *= -dampening;
            this.spin *= 0.7;
        }
    }

    /**
     * Apply a kick to the ball with optional spin
     */
    kick(direction: Vector, power: number, addSpin: number = 0): void {
        this.vel = direction.normalize().mult(power);
        this.spin += addSpin;
    }

    /**
     * Reset ball to center after goal
     */
    reset(): void {
        this.pos = new Vector(this.canvasWidth / 2, this.canvasHeight / 2);
        this.vel = new Vector(0, 0);
        this.spin = 0;
    }

    /**
     * Draw ball on canvas with rotation effect
     */
    draw(ctx: CanvasRenderingContext2D): void {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(this.pos.x + 2, this.pos.y + 2, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Main ball
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Pattern
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        
        const rotationAngle = (this.pos.x + this.pos.y) * 0.05;
        
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(rotationAngle);
        
        const numPentagons = 3;
        for (let i = 0; i < numPentagons; i++) {
            ctx.beginPath();
            const angleOffset = (i * Math.PI * 2) / numPentagons;
            for (let j = 0; j < 5; j++) {
                const angle = angleOffset + (j * Math.PI * 2) / 5;
                const x = Math.cos(angle) * (this.radius * 0.6);
                const y = Math.sin(angle) * (this.radius * 0.6);
                if (j === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        ctx.restore();

        // Speed indicator
        if (this.vel.mag() > 100) {
            const speedLines = 3;
            const direction = this.vel.normalize().mult(-1);
            
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            
            for (let i = 0; i < speedLines; i++) {
                const offset = (i + 1) * 8;
                const length = 6 - i * 2;
                const start = this.pos.add(direction.mult(offset));
                const end = start.add(direction.mult(length));
                
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            }
        }
    }
}