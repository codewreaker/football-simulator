/**
 * Game Difficulty Levels
 */
export const GameDifficulty = {
    EASY: 'easy',
    NORMAL: 'normal',
    HARD: 'hard',
    EXPERT: 'expert',
} as const;

export type GameDifficulty = typeof GameDifficulty[keyof typeof GameDifficulty];

/**
 * Configuration for AI behavior based on difficulty level
 */
export interface DifficultyConfig {
    // Passing behavior
    passAccuracy: number; // 0-1, chance to complete a pass successfully
    passFrequency: number; // frames between passes (lower = more passing)
    passPowerVariation: number; // 0-1, randomness in pass power

    // Positioning & movement
    positioningAccuracy: number; // 0-1, how well AI positions for next move
    reactionTime: number; // frames of delay before reacting to ball movement
    movementSpeed: number; // multiplier for player speed

    // Tactical behavior
    aggressiveness: number; // 0-1, how aggressive attacking is
    defensiveIntensity: number; // 0-1, how hard AI defends
    shootingConfidence: number; // 0-1, likelihood to shoot when near goal

    // Ball control
    dribblingTime: number; // frames before attempting pass/shoot
    ballControlPrecision: number; // 0-1, accuracy when controlling ball
}

/**
 * Difficulty configurations for each level
 */
export const DIFFICULTY_CONFIGS: Record<GameDifficulty, DifficultyConfig> = {
    [GameDifficulty.EASY]: {
        passAccuracy: 0.65,
        passFrequency: 50,
        passPowerVariation: 0.3,
        positioningAccuracy: 0.5,
        reactionTime: 15,
        movementSpeed: 0.8,
        aggressiveness: 0.4,
        defensiveIntensity: 0.3,
        shootingConfidence: 0.3,
        dribblingTime: 50,
        ballControlPrecision: 0.7,
    },
    [GameDifficulty.NORMAL]: {
        passAccuracy: 0.8,
        passFrequency: 40,
        passPowerVariation: 0.2,
        positioningAccuracy: 0.7,
        reactionTime: 8,
        movementSpeed: 1.0,
        aggressiveness: 0.6,
        defensiveIntensity: 0.6,
        shootingConfidence: 0.5,
        dribblingTime: 40,
        ballControlPrecision: 0.85,
    },
    [GameDifficulty.HARD]: {
        passAccuracy: 0.9,
        passFrequency: 30,
        passPowerVariation: 0.1,
        positioningAccuracy: 0.85,
        reactionTime: 4,
        movementSpeed: 1.15,
        aggressiveness: 0.8,
        defensiveIntensity: 0.8,
        shootingConfidence: 0.7,
        dribblingTime: 35,
        ballControlPrecision: 0.95,
    },
    [GameDifficulty.EXPERT]: {
        passAccuracy: 0.95,
        passFrequency: 25,
        passPowerVariation: 0.05,
        positioningAccuracy: 0.95,
        reactionTime: 2,
        movementSpeed: 1.25,
        aggressiveness: 0.95,
        defensiveIntensity: 0.95,
        shootingConfidence: 0.85,
        dribblingTime: 30,
        ballControlPrecision: 0.99,
    },
};

/**
 * Get difficulty configuration by level
 */
export function getDifficultyConfig(difficulty: GameDifficulty): DifficultyConfig {
    return DIFFICULTY_CONFIGS[difficulty];
}
