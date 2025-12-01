import { Ball } from './entities/Ball';
import { Player } from './entities/Player';
import { Renderer } from './renderer/Renderer';
import { Physics } from './physics/Physics';
import { AIPlayerController } from './controllers/AIPlayerController';
import { HumanPlayerController } from './controllers/HumanPlayerController';
import type { GameMode } from './modes/GameMode';
import type { GameDifficulty } from './difficulty/DifficultyConfig';
import { getDifficultyConfig } from './difficulty/DifficultyConfig';

export interface GameState {
    score: {
        home: number;
        away: number;
    };
    paused: boolean;
    gameMode?: GameMode;
    difficulty?: GameDifficulty;
}

const RATIO = 1.5;
const WIDTH = 1200;


/**
 * Main Game Engine - Orchestrates all game logic
 * Pure TypeScript class without React dependencies
 */
export class GameEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private canvasWidth: number = WIDTH;
    private canvasHeight: number = WIDTH/RATIO;

    private ball: Ball;
    private players: Player[] = [];
    private renderer: Renderer;

    private gameState: GameState = {
        score: { home: 0, away: 0 },
        paused: false,
    };

    private gameLoopId: number | null = null;
    private stateChangeCallback: ((state: GameState) => void) | null = null;
    
    // Game mode and difficulty settings
    private gameMode: GameMode = 'ai-vs-ai';
    private difficulty: GameDifficulty = 'normal';
    
    // Human player tracking
    private humanPlayers: Set<Player> = new Set();
    private humanPlayerControllers: Map<Player, HumanPlayerController> = new Map();
    private selectedPlayer: Player | null = null;
    private pressedKeys: Set<string> = new Set();
    
    // Delta time for frame-independent movement
    private lastFrameTime: number = 0;
    private deltaTime: number = 0;
    
    // Goal celebration pause
    private goalCelebrationTime: number = 0;
    private isGoalCelebrating: boolean = false;
    
    // Event listener references for cleanup
    private handleKeyDown: ((e: KeyboardEvent) => void) | null = null;
    private handleKeyUp: ((e: KeyboardEvent) => void) | null = null;

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
        
        // Setup keyboard input
        this.setupKeyboardInput();
    }

    /**
     * Setup keyboard input handling
     */
    private setupKeyboardInput(): void {
        this.handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            this.pressedKeys.add(key);
            
            // Handle player switching for human players
            if ((key === 'q' || key === 'tab') && this.humanPlayers.size > 0) {
                e.preventDefault();
                this.switchPlayer();
            }

            if(key === 'r'){
                e.preventDefault()
                this.resetGame()
            }
        };

        this.handleKeyUp = (e: KeyboardEvent) => {
            this.pressedKeys.delete(e.key.toLowerCase());
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }
    
    /**
     * Switch to next human-controlled player
     */
    private switchPlayer(): void {
        if (this.humanPlayers.size === 0) return;
        
        const humanPlayersArray = Array.from(this.humanPlayers);
        
        if (!this.selectedPlayer) {
            this.selectedPlayer = humanPlayersArray[0];
        } else {
            const currentIndex = humanPlayersArray.indexOf(this.selectedPlayer);
            const nextIndex = (currentIndex + 1) % humanPlayersArray.length;
            this.selectedPlayer = humanPlayersArray[nextIndex];
        }
        
        // Update all controllers to know which player is selected
        this.humanPlayerControllers.forEach((controller, player) => {
            controller.setSelected(player === this.selectedPlayer);
        });
    }

    /**
     * Auto-switch to player closest to ball
     */
    private autoSwitchToClosest(): void {
        if (this.humanPlayers.size === 0 || !this.selectedPlayer) return;

        const humanPlayersArray = Array.from(this.humanPlayers);
        
        // Find closest human player to ball
        let closest = humanPlayersArray[0];
        let minDist = closest.pos.dist(this.ball.pos);

        humanPlayersArray.forEach(player => {
            const dist = player.pos.dist(this.ball.pos);
            if (dist < minDist) {
                minDist = dist;
                closest = player;
            }
        });

        // Switch if the closest player is different and significantly closer
        if (closest !== this.selectedPlayer) {
            const currentDist = this.selectedPlayer.pos.dist(this.ball.pos);
            if (minDist < currentDist - 80) {
                this.selectedPlayer = closest;
                
                // Update all controllers
                this.humanPlayerControllers.forEach((controller, player) => {
                    controller.setSelected(player === this.selectedPlayer);
                });
            }
        }
    }
    
    /**
     * Remove keyboard event listeners (cleanup)
     */
    private removeKeyboardInput(): void {
        if (this.handleKeyDown) {
            window.removeEventListener('keydown', this.handleKeyDown);
        }
        if (this.handleKeyUp) {
            window.removeEventListener('keyup', this.handleKeyUp);
        }
        this.handleKeyDown = null;
        this.handleKeyUp = null;
    }

    /**
     * Set game mode and difficulty
     */
    setGameMode(gameMode: GameMode, difficulty: GameDifficulty = 'normal'): void {
        this.gameMode = gameMode;
        this.difficulty = difficulty;
        this.resetGame();
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

        // Setup controllers based on game mode
        this.setupControllers();
    }

    /**
     * Setup player controllers based on game mode
     */
    private setupControllers(): void {
        const difficultyConfig = getDifficultyConfig(this.difficulty);
        this.humanPlayers.clear();
        this.humanPlayerControllers.clear();
        this.selectedPlayer = null;

        const homeTeamPlayers = this.players.filter(p => p.team === 'home');
        const awayTeamPlayers = this.players.filter(p => p.team === 'away');

        switch (this.gameMode) {
            case 'ai-vs-ai':
            case 'cpu-vs-cpu':
                // All AI
                this.players.forEach(p => {
                    p.setController(new AIPlayerController(difficultyConfig));
                });
                break;

            case 'human-vs-ai':
                // Human controls home team (except goalkeeper)
                homeTeamPlayers.forEach((p, idx) => {
                    if (idx === 0) {
                        // Goalkeeper is AI
                        p.setController(new AIPlayerController(difficultyConfig));
                    } else {
                        // Outfield players controlled by human
                        const humanController = new HumanPlayerController();
                        p.setController(humanController);
                        this.humanPlayers.add(p);
                        this.humanPlayerControllers.set(p, humanController);
                    }
                });
                // Away team is AI
                awayTeamPlayers.forEach(p => {
                    p.setController(new AIPlayerController(difficultyConfig));
                });
                // Select first outfield player
                if (this.humanPlayers.size > 0) {
                    this.selectedPlayer = Array.from(this.humanPlayers)[0];
                    this.humanPlayerControllers.get(this.selectedPlayer)?.setSelected(true);
                }
                break;

            case 'ai-vs-human':
                // Home team is AI
                homeTeamPlayers.forEach(p => {
                    p.setController(new AIPlayerController(difficultyConfig));
                });
                // Human controls away team (except goalkeeper)
                awayTeamPlayers.forEach((p, idx) => {
                    if (idx === 0) {
                        // Goalkeeper is AI
                        p.setController(new AIPlayerController(difficultyConfig));
                    } else {
                        // Outfield players controlled by human
                        const humanController = new HumanPlayerController();
                        p.setController(humanController);
                        this.humanPlayers.add(p);
                        this.humanPlayerControllers.set(p, humanController);
                    }
                });
                // Select first outfield player
                if (this.humanPlayers.size > 0) {
                    this.selectedPlayer = Array.from(this.humanPlayers)[0];
                    this.humanPlayerControllers.get(this.selectedPlayer)?.setSelected(true);
                }
                break;

            case 'human-vs-human':
                // Both teams controlled by humans (except goalkeepers)
                homeTeamPlayers.forEach((p, idx) => {
                    if (idx === 0) {
                        p.setController(new AIPlayerController(difficultyConfig));
                    } else {
                        const humanController = new HumanPlayerController();
                        p.setController(humanController);
                        this.humanPlayers.add(p);
                        this.humanPlayerControllers.set(p, humanController);
                    }
                });
                awayTeamPlayers.forEach((p, idx) => {
                    if (idx === 0) {
                        p.setController(new AIPlayerController(difficultyConfig));
                    } else {
                        const humanController = new HumanPlayerController();
                        p.setController(humanController);
                        this.humanPlayers.add(p);
                        this.humanPlayerControllers.set(p, humanController);
                    }
                });
                // Select first outfield player
                if (this.humanPlayers.size > 0) {
                    this.selectedPlayer = Array.from(this.humanPlayers)[0];
                    this.humanPlayerControllers.get(this.selectedPlayer)?.setSelected(true);
                }
                break;
        }
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
        this.lastFrameTime = performance.now();
        this.gameLoopId = window.requestAnimationFrame((time) => this.gameLoop(time));
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
        if (!this.gameState.paused) {
            this.lastFrameTime = performance.now(); // Reset time to avoid large delta
        }
        this.notifyStateChange();
    }

    /**
     * Reset the game
     */
    resetGame(): void {
        this.gameState.score = { home: 0, away: 0 };
        this.ball.reset();
        this.initializePlayers();
        this.isGoalCelebrating = false;
        this.goalCelebrationTime = 0;
        this.notifyStateChange();
    }

    /**
     * Main game loop - called every frame
     */
    private gameLoop(currentTime: number): void {
        // Calculate delta time in seconds
        this.deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1); // Cap at 0.1s to prevent huge jumps
        this.lastFrameTime = currentTime;

        if (!this.gameState.paused) {
            // Handle goal celebration pause
            if (this.isGoalCelebrating) {
                this.goalCelebrationTime += this.deltaTime;
                if (this.goalCelebrationTime > 1.5) { // 1.5 second celebration
                    this.isGoalCelebrating = false;
                    this.goalCelebrationTime = 0;
                    this.ball.reset();
                }
            } else {
                // Auto-switch to closest player when ball moves significantly (every 30 frames)
                if (this.humanPlayers.size > 0 && Math.floor(currentTime / 16.67) % 30 === 0) {
                    this.autoSwitchToClosest();
                }

                // Update keyboard input for human players
                this.humanPlayerControllers.forEach((controller) => {
                    controller.handleInput(this.pressedKeys);
                });

                // Update game objects with delta time
                const ballGoal = this.ball.update(this.deltaTime);

                // Handle goal
                if (ballGoal.goalScored && ballGoal.scoredBy) {
                    this.gameState.score[ballGoal.scoredBy]++;
                    this.isGoalCelebrating = true;
                    this.notifyStateChange();
                }

                // Update players with delta time
                this.players.forEach((p) => p.update(this.ball, this.players, this.deltaTime));

                // Handle collisions
                Physics.handleCollisions(this.players, this.ball);
            }
        }

        // Render frame (always render, even when paused)
        this.renderer.render(this.players, this.ball, this.selectedPlayer);

        // Continue game loop
        this.gameLoopId = window.requestAnimationFrame((time) => this.gameLoop(time));
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
        this.removeKeyboardInput();
    }
}