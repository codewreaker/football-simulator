/**
 * Game mode selection
 */
export const GameMode = {
    AI_VS_AI: 'ai-vs-ai',
    HUMAN_VS_AI: 'human-vs-ai',
    AI_VS_HUMAN: 'ai-vs-human',
    HUMAN_VS_HUMAN: 'human-vs-human',
    CPU_VS_CPU: 'cpu-vs-cpu',
} as const;

export type GameMode = typeof GameMode[keyof typeof GameMode];

/**
 * Get human-readable name for game mode
 */
export function getGameModeName(mode: GameMode): string {
    switch (mode) {
        case GameMode.AI_VS_AI:
            return 'CPU vs CPU';
        case GameMode.HUMAN_VS_AI:
            return 'You vs CPU (Home)';
        case GameMode.AI_VS_HUMAN:
            return 'CPU vs You (Away)';
        case GameMode.HUMAN_VS_HUMAN:
            return 'Local (2 Players)';
        case GameMode.CPU_VS_CPU:
            return 'CPU vs CPU';
        default:
            return 'Unknown';
    }
}
