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

    // Goal dimensions
    private readonly GOAL_TOP_OFFSET = 80;
    private readonly GOAL_BOTTOM_OFFSET = 80;
    private readonly GOAL_LINE_LEFT = 20;
    private readonly GOAL_LINE_RIGHT_OFFSET = 20;

    constructor(canvasWidth: number, canvasHeight: number) {
        this.pos = new Vector(canvasWidth / 2, canvasHeight / 2);
        this.vel = new Vector(0, 0);
        this.radius = 6;
        this.friction = 0.97; // Friction per frame at 60fps (converted in update)
        this.mass = 1;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    /**
     * Update ball position and handle physics
     * Returns info about goals scored
     */
    update(deltaTime: number): { goalScored: boolean; scoredBy: 'home' | 'away' | null } {
        // Apply velocity to position (p = p + v*t)
        this.pos = this.pos.add(this.vel.mult(deltaTime));

        // Apply friction/drag (exponential decay for frame independence)
        // friction^(deltaTime * 60) to maintain same feel at 60fps
        const frictionFactor = Math.pow(this.friction, deltaTime * 60);
        this.vel = this.vel.mult(frictionFactor);

        // Apply spin effect (Magnus effect - simplified)
        if (Math.abs(this.spin) > 0.01) {
            const spinForce = new Vector(-this.vel.y, this.vel.x).normalize().mult(this.spin * 30 * deltaTime);
            this.vel = this.vel.add(spinForce);
            this.spin *= Math.pow(0.95, deltaTime * 60); // Spin decay
        }

        // Stop ball completely if moving very slowly
        if (this.vel.mag() < 3) {
            this.vel = new Vector(0, 0);
            this.spin = 0;
        }

        // GOAL DETECTION - Check BEFORE boundary collision
        const goalResult = this.checkGoal();
        if (goalResult.goalScored) {
            return goalResult;
        }

        // BOUNDARY COLLISION - Bounce off pitch edges
        this.handleBoundaryCollision();

        return { goalScored: false, scoredBy: null };
    }

    /**
     * Check if ball has crossed the goal line
     */
    private checkGoal(): { goalScored: boolean; scoredBy: 'home' | 'away' | null } {
        const goalTop = this.canvasHeight / 2 - this.GOAL_TOP_OFFSET;
        const goalBottom = this.canvasHeight / 2 + this.GOAL_BOTTOM_OFFSET;

        // Check if ball is within goal height range (add radius for better detection)
        if (this.pos.y >= goalTop - this.radius && this.pos.y <= goalBottom + this.radius) {
            // Left goal (home side) - Away team scores
            // Ball center must cross the goal line
            if (this.pos.x <= this.GOAL_LINE_LEFT + this.radius) {
                return { goalScored: true, scoredBy: 'away' };
            }
            
            // Right goal (away side) - Home team scores
            if (this.pos.x >= this.canvasWidth - this.GOAL_LINE_RIGHT_OFFSET - this.radius) {
                return { goalScored: true, scoredBy: 'home' };
            }
        }

        return { goalScored: false, scoredBy: null };
    }

    /**
     * Handle collision with pitch boundaries
     */
    private handleBoundaryCollision(): void {
        const padding = 50; // Pitch boundary padding
        const dampening = 0.6; // Energy loss on bounce

        // Left and right boundaries (but not goal areas)
        const goalTop = this.canvasHeight / 2 - this.GOAL_TOP_OFFSET;
        const goalBottom = this.canvasHeight / 2 + this.GOAL_BOTTOM_OFFSET;
        const isInGoalHeight = this.pos.y >= goalTop && this.pos.y <= goalBottom;

        if (this.pos.x - this.radius < padding) {
            // Don't bounce if it's going into the goal
            if (!isInGoalHeight || this.pos.x > this.GOAL_LINE_LEFT) {
                this.pos.x = padding + this.radius;
                this.vel.x *= -dampening;
                this.spin *= 0.7;
            }
        } else if (this.pos.x + this.radius > this.canvasWidth - padding) {
            // Don't bounce if it's going into the goal
            if (!isInGoalHeight || this.pos.x < this.canvasWidth - this.GOAL_LINE_RIGHT_OFFSET) {
                this.pos.x = this.canvasWidth - padding - this.radius;
                this.vel.x *= -dampening;
                this.spin *= 0.7;
            }
        }

        // Top and bottom boundaries
        if (this.pos.y - this.radius < padding) {
            this.pos.y = padding + this.radius;
            this.vel.y *= -dampening;
            this.spin *= 0.7;
        } else if (this.pos.y + this.radius > this.canvasHeight - padding) {
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
        // Draw shadow for depth
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(this.pos.x + 2, this.pos.y + 2, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw main ball
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw ball pattern (pentagon pattern typical of footballs)
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        
        // Simulate rotation by drawing rotating pentagons
        const rotationAngle = (this.pos.x + this.pos.y) * 0.05; // Simple rotation based on position
        
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(rotationAngle);
        
        // Draw pentagon pattern
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

        // Draw speed indicator when ball is moving fast
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