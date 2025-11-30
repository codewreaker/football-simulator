import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';

/**
 * Renderer - Handles all canvas drawing operations
 */
export class Renderer {
    private ctx: CanvasRenderingContext2D;
    private canvasWidth: number;
    private canvasHeight: number;

    constructor(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
        this.ctx = ctx;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    /**
     * Draw the football pitch with all markings
     */
    drawPitch(): void {
        // Base grass color
        this.ctx.fillStyle = '#2d7a2d';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;

        // OUTER BOUNDARY
        this.ctx.strokeRect(50, 50, this.canvasWidth - 100, this.canvasHeight - 100);

        // CENTER LINE
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvasWidth / 2, 50);
        this.ctx.lineTo(this.canvasWidth / 2, this.canvasHeight - 50);
        this.ctx.stroke();

        // CENTER CIRCLE
        this.ctx.beginPath();
        this.ctx.arc(this.canvasWidth / 2, this.canvasHeight / 2, 70, 0, Math.PI * 2);
        this.ctx.stroke();

        // CENTER SPOT
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(this.canvasWidth / 2, this.canvasHeight / 2, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // GOALS
        this.ctx.strokeRect(20, this.canvasHeight / 2 - 80, 30, 160);
        this.ctx.strokeRect(this.canvasWidth - 50, this.canvasHeight / 2 - 80, 30, 160);

        // PENALTY AREAS
        this.ctx.strokeRect(50, this.canvasHeight / 2 - 130, 130, 260);
        this.ctx.strokeRect(this.canvasWidth - 180, this.canvasHeight / 2 - 130, 130, 260);

        // GOAL AREAS
        this.ctx.strokeRect(50, this.canvasHeight / 2 - 60, 50, 120);
        this.ctx.strokeRect(this.canvasWidth - 100, this.canvasHeight / 2 - 60, 50, 120);

        // PENALTY SPOTS
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(170, this.canvasHeight / 2, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(this.canvasWidth - 170, this.canvasHeight / 2, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // PENALTY ARCS
        this.ctx.strokeStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(170, this.canvasHeight / 2, 70, -Math.PI / 2.5, Math.PI / 2.5);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(
            this.canvasWidth - 170,
            this.canvasHeight / 2,
            70,
            Math.PI - Math.PI / 2.5,
            Math.PI + Math.PI / 2.5
        );
        this.ctx.stroke();

        // CORNER ARCS
        const cornerRadius = 10;
        this.ctx.beginPath();
        this.ctx.arc(50, 50, cornerRadius, 0, Math.PI / 2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(this.canvasWidth - 50, 50, cornerRadius, Math.PI / 2, Math.PI);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(50, this.canvasHeight - 50, cornerRadius, -Math.PI / 2, 0);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(this.canvasWidth - 50, this.canvasHeight - 50, cornerRadius, Math.PI, Math.PI * 1.5);
        this.ctx.stroke();
    }

    /**
     * Draw all players on the canvas
     */
    drawPlayers(players: Player[]): void {
        players.forEach((player) => {
            player.draw(this.ctx);
        });
    }

    /**
     * Draw the ball on the canvas
     */
    drawBall(ball: Ball): void {
        ball.draw(this.ctx);
    }

    /**
     * Clear the entire canvas (used before each frame)
     */
    clear(): void {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    /**
     * Render a complete frame
     */
    render(players: Player[], ball: Ball): void {
        this.drawPitch();
        this.drawPlayers(players);
        this.drawBall(ball);
    }
}
