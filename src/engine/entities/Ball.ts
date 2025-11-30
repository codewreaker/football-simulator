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

    // Canvas dimensions for boundary checking
    private canvasWidth: number;
    private canvasHeight: number;

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
     * Returns true if a goal was scored
     */
    update(): { goalScored: boolean; scoredBy: 'home' | 'away' | null } {
        // Apply velocity to position
        this.pos = this.pos.add(this.vel);

        // Apply friction to slow ball down over time
        this.vel = this.vel.mult(this.friction);

        // Stop ball completely if moving very slowly
        if (this.vel.mag() < 0.05) {
            this.vel = new Vector(0, 0);
        }

        // GOAL DETECTION (check before boundary collision so goals can be scored)
        const goalTop = this.canvasHeight / 2 - 80;
        const goalBottom = this.canvasHeight / 2 + 80;

        if (this.pos.y > goalTop && this.pos.y < goalBottom) {
            // Left goal (away team scores)
            if (this.pos.x < 20) {
                this.reset();
                return { goalScored: true, scoredBy: 'away' };
            }
            // Right goal (home team scores)
            if (this.pos.x > this.canvasWidth - 20) {
                this.reset();
                return { goalScored: true, scoredBy: 'home' };
            }
        }

        // BOUNDARY COLLISION - Bounce off pitch edges (after goal detection)
        if (this.pos.x < 50 || this.pos.x > this.canvasWidth - 50) {
            this.vel.x *= -0.7;
            this.pos.x = Math.max(50, Math.min(this.canvasWidth - 50, this.pos.x));
        }

        if (this.pos.y < 50 || this.pos.y > this.canvasHeight - 50) {
            this.vel.y *= -0.7;
            this.pos.y = Math.max(50, Math.min(this.canvasHeight - 50, this.pos.y));
        }

        return { goalScored: false, scoredBy: null };
    }

    /**
     * Reset ball to center after goal
     */
    reset(): void {
        this.pos = new Vector(this.canvasWidth / 2, this.canvasHeight / 2);
        this.vel = new Vector(0, 0);
    }

    /**
     * Draw ball on canvas
     */
    draw(ctx: CanvasRenderingContext2D): void {
        // Draw main ball
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Add shadow for depth
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(this.pos.x + 2, this.pos.y + 2, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
