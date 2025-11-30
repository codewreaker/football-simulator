import { Ball } from './entities/Ball';
import { Player } from './entities/Player';
import { Renderer } from './renderer/Renderer';
import { Physics } from './physics/Physics';

export interface GameState {
    score: {
        home: number;
        away: number;
    };
    paused: boolean;
}

/**
 * Main Game Engine - Orchestrates all game logic
 * Pure TypeScript class without React dependencies
 */
export class GameEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private canvasWidth: number = 900;
    private canvasHeight: number = 600;

    private ball: Ball;
    private players: Player[] = [];
    private renderer: Renderer;

    private gameState: GameState = {
        score: { home: 0, away: 0 },
        paused: false,
    };

    private gameLoopId: number | null = null;
    private stateChangeCallback: ((state: GameState) => void) | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.ctx = ctx;

        // Setup canvas dimensions
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;

        // Initialize game objects
        this.ball = new Ball(this.canvasWidth, this.canvasHeight);
        this.renderer = new Renderer(this.ctx, this.canvasWidth, this.canvasHeight);

        // Initialize players
        this.initializePlayers();
    }

    /**
     * Initialize players in 4-3-3 formation
     */
    private initializePlayers(): void {
        this.players = [
            // ===== HOME TEAM (Red) - Attacks right =====
            new Player(100, this.canvasHeight / 2, 'home', 'goalkeeper', this.canvasWidth, this.canvasHeight),

            // Defenders (4 players)
            new Player(200, this.canvasHeight / 2 - 150, 'home', 'defender', this.canvasWidth, this.canvasHeight),
            new Player(200, this.canvasHeight / 2 - 50, 'home', 'defender', this.canvasWidth, this.canvasHeight),
            new Player(200, this.canvasHeight / 2 + 50, 'home', 'defender', this.canvasWidth, this.canvasHeight),
            new Player(200, this.canvasHeight / 2 + 150, 'home', 'defender', this.canvasWidth, this.canvasHeight),

            // Midfielders (3 players)
            new Player(380, this.canvasHeight / 2 - 100, 'home', 'midfielder', this.canvasWidth, this.canvasHeight),
            new Player(380, this.canvasHeight / 2, 'home', 'midfielder', this.canvasWidth, this.canvasHeight),
            new Player(380, this.canvasHeight / 2 + 100, 'home', 'midfielder', this.canvasWidth, this.canvasHeight),

            // Forwards (3 players)
            new Player(550, this.canvasHeight / 2 - 80, 'home', 'forward', this.canvasWidth, this.canvasHeight),
            new Player(550, this.canvasHeight / 2, 'home', 'forward', this.canvasWidth, this.canvasHeight),
            new Player(550, this.canvasHeight / 2 + 80, 'home', 'forward', this.canvasWidth, this.canvasHeight),

            // ===== AWAY TEAM (Blue) - Attacks left =====
            new Player(800, this.canvasHeight / 2, 'away', 'goalkeeper', this.canvasWidth, this.canvasHeight),

            // Defenders (4 players)
            new Player(700, this.canvasHeight / 2 - 150, 'away', 'defender', this.canvasWidth, this.canvasHeight),
            new Player(700, this.canvasHeight / 2 - 50, 'away', 'defender', this.canvasWidth, this.canvasHeight),
            new Player(700, this.canvasHeight / 2 + 50, 'away', 'defender', this.canvasWidth, this.canvasHeight),
            new Player(700, this.canvasHeight / 2 + 150, 'away', 'defender', this.canvasWidth, this.canvasHeight),

            // Midfielders (3 players)
            new Player(520, this.canvasHeight / 2 - 100, 'away', 'midfielder', this.canvasWidth, this.canvasHeight),
            new Player(520, this.canvasHeight / 2, 'away', 'midfielder', this.canvasWidth, this.canvasHeight),
            new Player(520, this.canvasHeight / 2 + 100, 'away', 'midfielder', this.canvasWidth, this.canvasHeight),

            // Forwards (3 players)
            new Player(350, this.canvasHeight / 2 - 80, 'away', 'forward', this.canvasWidth, this.canvasHeight),
            new Player(350, this.canvasHeight / 2, 'away', 'forward', this.canvasWidth, this.canvasHeight),
            new Player(350, this.canvasHeight / 2 + 80, 'away', 'forward', this.canvasWidth, this.canvasHeight),
        ];
    }

    /**
     * Register a callback to be called when game state changes
     */
    onStateChange(callback: (state: GameState) => void): void {
        this.stateChangeCallback = callback;
    }

    /**
     * Get current game state
     */
    getState(): GameState {
        return { ...this.gameState };
    }

    /**
     * Start the game loop
     */
    start(): void {
        if (this.gameLoopId !== null) {
            return; // Already running
        }
        this.gameLoopId = window.requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * Stop the game loop
     */
    stop(): void {
        if (this.gameLoopId !== null) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
    }

    /**
     * Toggle pause state
     */
    togglePause(): void {
        this.gameState.paused = !this.gameState.paused;
        this.notifyStateChange();
    }

    /**
     * Reset the game
     */
    resetGame(): void {
        this.gameState.score = { home: 0, away: 0 };
        this.ball.reset();
        this.initializePlayers();
        this.notifyStateChange();
    }

    /**
     * Main game loop - called every frame
     */
    private gameLoop(): void {
        if (!this.gameState.paused) {
            // Update game objects
            const ballGoal = this.ball.update();

            // Handle goal
            if (ballGoal.goalScored && ballGoal.scoredBy) {
                this.gameState.score[ballGoal.scoredBy]++;
                this.notifyStateChange();
            }

            // Update players
            this.players.forEach((p) => p.update(this.ball, this.players));

            // Handle collisions
            Physics.handleCollisions(this.players);

            // Render frame
            this.renderer.render(this.players, this.ball);
        }

        // Continue game loop
        this.gameLoopId = window.requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * Notify state change listeners
     */
    private notifyStateChange(): void {
        if (this.stateChangeCallback) {
            this.stateChangeCallback(this.getState());
        }
    }

    /**
     * Cleanup - stop the game and free resources
     */
    destroy(): void {
        this.stop();
    }
}
