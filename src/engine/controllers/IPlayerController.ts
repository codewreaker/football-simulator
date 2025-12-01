import type { Ball } from '../entities/Ball';
import type { Player } from '../entities/Player';

/**
 * IPlayerController - Interface for controlling player behavior
 * Allows different implementations: AI, Human input, etc.
 */
export interface IPlayerController {
    /**
     * Update player based on control input/AI logic
     * Called once per frame during player update
     */
    update(player: Player, ball: Ball, players: Player[]): void;

    /**
     * Handle input (used for human players)
     */
    handleInput?(keys: Set<string>): void;

    /**
     * Reset controller state (called on game reset)
     */
    reset?(): void;
}
