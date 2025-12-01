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
        // Base grass color with striped pattern
        const stripeWidth = 40;
        for (let x = 0; x < this.canvasWidth; x += stripeWidth) {
            this.ctx.fillStyle = x % (stripeWidth * 2) === 0 ? '#2d7a2d' : '#2a722a';
            this.ctx.fillRect(x, 0, stripeWidth, this.canvasHeight);
        }

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

        // GOALS (with netting effect)
        this.drawGoal(20, this.canvasHeight / 2 - 80, 30, 160, 'left');
        this.drawGoal(this.canvasWidth - 50, this.canvasHeight / 2 - 80, 30, 160, 'right');

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
        this.ctx.arc(160, this.canvasHeight / 2, 70, -Math.PI / 2.5, Math.PI / 2.5);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(
            this.canvasWidth - 160,
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
     * Draw goal with netting effect
     */
    private drawGoal(x: number, y: number, width: number, height: number, side: 'left' | 'right'): void {
        // Goal frame
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // Goal netting
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;

        // Vertical lines
        const netSpacing = 15;
        for (let i = netSpacing; i < width; i += netSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + i, y);
            this.ctx.lineTo(x + i, y + height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let i = netSpacing; i < height; i += netSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + i);
            this.ctx.lineTo(x + width, y + i);
            this.ctx.stroke();
        }

        // Goal backing (slight 3D effect)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(x, y, width, height);
    }

    /**
     * Draw all players on the canvas
     */
    drawPlayers(players: Player[], selectedPlayer: Player | null = null): void {
        players.forEach((player) => {
            const isSelected = player === selectedPlayer;
            player.draw(this.ctx, isSelected);
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
     * Draw possession indicator for teams
     */
    private drawPossessionIndicator(players: Player[]): void {
        const homeTeam = players.filter(p => p.team === 'home');
        const awayTeam = players.filter(p => p.team === 'away');

        const homePossession = homeTeam.some(p => p.hasPossession);
        const awayPossession = awayTeam.some(p => p.hasPossession);

        if (homePossession) {
            this.ctx.fillStyle = 'rgba(255, 68, 68, 0.3)';
            this.ctx.fillRect(0, 0, this.canvasWidth / 2, 10);
        }

        if (awayPossession) {
            this.ctx.fillStyle = 'rgba(68, 68, 255, 0.3)';
            this.ctx.fillRect(this.canvasWidth / 2, 0, this.canvasWidth / 2, 10);
        }
    }

    /**
     * Draw player names/roles (optional - for debugging/info)
     */
    private drawPlayerInfo(players: Player[]): void {
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 3;

        players.forEach(player => {
            if (player.hasPossession) {
                const text = player.role.substring(0, 3).toUpperCase();
                const textY = player.pos.y - player.radius - 20;

                this.ctx.strokeText(text, player.pos.x, textY);
                this.ctx.fillText(text, player.pos.x, textY);
            }
        });
    }

    /**
     * Draw tactical lines (optional - showing formations)
     */
    private drawTacticalLines(players: Player[], showLines: boolean = false): void {
        if (!showLines) return;

        const homeTeam = players.filter(p => p.team === 'home' && p.role !== 'goalkeeper');
        const awayTeam = players.filter(p => p.team === 'away' && p.role !== 'goalkeeper');

        this.ctx.strokeStyle = 'rgba(255, 68, 68, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);

        this.drawFormationLines(homeTeam);

        this.ctx.strokeStyle = 'rgba(68, 68, 255, 0.2)';
        this.drawFormationLines(awayTeam);

        this.ctx.setLineDash([]);
    }

    /**
     * Draw formation lines for a team
     */
    private drawFormationLines(team: Player[]): void {
        const defenders = team.filter(p => p.role === 'defender');
        const midfielders = team.filter(p => p.role === 'midfielder');
        const forwards = team.filter(p => p.role === 'forward');

        this.drawLinesBetweenPlayers(defenders);
        this.drawLinesBetweenPlayers(midfielders);
        this.drawLinesBetweenPlayers(forwards);
    }

    /**
     * Draw connecting lines between players
     */
    private drawLinesBetweenPlayers(players: Player[]): void {
        if (players.length < 2) return;

        for (let i = 0; i < players.length - 1; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(players[i].pos.x, players[i].pos.y);
            this.ctx.lineTo(players[i + 1].pos.x, players[i + 1].pos.y);
            this.ctx.stroke();
        }
    }

    /**
     * Draw control hints overlay
     */
    drawControlHints(selectedPlayer: Player | null): void {
        if (!selectedPlayer) return;

        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.lineWidth = 3;

        const hints = [
            'WASD/Arrows: Move',
            'Shift: Sprint',
            'Space: Pass/Shoot (hold)',
            'Q/Tab: Switch player',
            'R: Reset Game'
        ];

        const x = 10;
        let y = this.canvasHeight - 70;

        hints.forEach((hint, index) => {
            this.ctx.strokeText(hint, x, y + index * 16);
            this.ctx.fillText(hint, x, y + index * 16);
        });

        // Draw stamina indicator
        if (selectedPlayer.stamina < selectedPlayer.maxStamina) {
            const staminaText = `Stamina: ${Math.round(selectedPlayer.stamina)}%`;
            const staminaY = y + hints.length * 16 + 5;

            this.ctx.strokeText(staminaText, x, staminaY);
            this.ctx.fillText(staminaText, x, staminaY);
        }
    }

    /**
     * Render a complete frame
     */
    render(players: Player[], ball: Ball, selectedPlayer: Player | null = null): void {
        // Clear canvas
        this.clear();

        // Draw pitch
        this.drawPitch();

        // Draw possession indicator
        this.drawPossessionIndicator(players);

        // Draw tactical lines (optional - set to false by default)
        this.drawTacticalLines(players, false);

        // Draw players
        this.drawPlayers(players, selectedPlayer);

        // Draw ball
        this.drawBall(ball);

        // Draw player info (only for players with possession)
        this.drawPlayerInfo(players);

        // Draw control hints
        if (selectedPlayer) {
            this.drawControlHints(selectedPlayer);
        }
    }
}