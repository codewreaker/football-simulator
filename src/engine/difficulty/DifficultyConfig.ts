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
 * Rebalanced for new physics and AI system
 */
export const DIFFICULTY_CONFIGS: Record<GameDifficulty, DifficultyConfig> = {
    [GameDifficulty.EASY]: {
        // Easy: AI makes frequent mistakes, slow reactions, poor positioning
        passAccuracy: 0.55,           // Misses many passes
        passFrequency: 60,             // Waits longer to pass
        passPowerVariation: 0.4,       // High power variation
        positioningAccuracy: 0.4,      // Poor positioning
        reactionTime: 20,              // Slow reactions (20 frames = 0.33s)
        movementSpeed: 0.75,           // 75% speed
        aggressiveness: 0.3,           // Passive attacking
        defensiveIntensity: 0.35,      // Weak defense
        shootingConfidence: 0.25,      // Rarely shoots
        dribblingTime: 60,             // Holds ball too long
        ballControlPrecision: 0.6,     // Poor ball control
    },
    [GameDifficulty.NORMAL]: {
        // Normal: Balanced gameplay, some mistakes, decent positioning
        passAccuracy: 0.75,            // Most passes succeed
        passFrequency: 45,             // Moderate passing frequency
        passPowerVariation: 0.25,      // Some power variation
        positioningAccuracy: 0.65,     // Decent positioning
        reactionTime: 10,              // Moderate reactions (10 frames = 0.17s)
        movementSpeed: 0.9,            // 90% speed
        aggressiveness: 0.55,          // Balanced attacking
        defensiveIntensity: 0.6,       // Solid defense
        shootingConfidence: 0.45,      // Shoots occasionally
        dribblingTime: 45,             // Reasonable dribbling time
        ballControlPrecision: 0.8,     // Good ball control
    },
    [GameDifficulty.HARD]: {
        // Hard: Strong AI, few mistakes, excellent positioning
        passAccuracy: 0.88,            // Rarely misses passes
        passFrequency: 35,             // Quick passing
        passPowerVariation: 0.12,      // Minimal power variation
        positioningAccuracy: 0.82,     // Excellent positioning
        reactionTime: 5,               // Fast reactions (5 frames = 0.08s)
        movementSpeed: 1.05,           // 105% speed (slightly faster)
        aggressiveness: 0.75,          // Aggressive attacking
        defensiveIntensity: 0.8,       // Strong defense
        shootingConfidence: 0.65,      // Shoots when appropriate
        dribblingTime: 35,             // Quick decision making
        ballControlPrecision: 0.92,    // Excellent ball control
    },
    [GameDifficulty.EXPERT]: {
        // Expert: Near-perfect AI, minimal mistakes, professional-level play
        passAccuracy: 0.94,            // Almost always accurate
        passFrequency: 28,             // Very quick passing
        passPowerVariation: 0.06,      // Very minimal variation
        positioningAccuracy: 0.93,     // Near-perfect positioning
        reactionTime: 2,               // Instant reactions (2 frames = 0.03s)
        movementSpeed: 1.12,           // 112% speed
        aggressiveness: 0.88,          // Very aggressive
        defensiveIntensity: 0.92,      // Relentless defense
        shootingConfidence: 0.82,      // Shoots confidently
        dribblingTime: 28,             // Lightning-fast decisions
        ballControlPrecision: 0.97,    // Near-perfect ball control
    },
};

/**
 * Get difficulty configuration by level
 */
export function getDifficultyConfig(difficulty: GameDifficulty): DifficultyConfig {
    return DIFFICULTY_CONFIGS[difficulty];
}

/**
 * Get human-readable description of difficulty
 */
export function getDifficultyDescription(difficulty: GameDifficulty): string {
    switch (difficulty) {
        case GameDifficulty.EASY:
            return 'Relaxed gameplay - AI makes frequent mistakes and plays slowly';
        case GameDifficulty.NORMAL:
            return 'Balanced challenge - AI plays competently with occasional errors';
        case GameDifficulty.HARD:
            return 'Challenging gameplay - AI plays skillfully with few mistakes';
        case GameDifficulty.EXPERT:
            return 'Extreme challenge - Near-professional level AI gameplay';
        default:
            return '';
    }
}

/**
 * Compare two difficulty levels
 */
export function isDifficultyHarder(difficulty1: GameDifficulty, difficulty2: GameDifficulty): boolean {
    const levels = [
        GameDifficulty.EASY,
        GameDifficulty.NORMAL,
        GameDifficulty.HARD,
        GameDifficulty.EXPERT,
    ];
    
    return levels.indexOf(difficulty1) > levels.indexOf(difficulty2);
}

/**
 * Get recommended difficulty based on player experience
 */
export function getRecommendedDifficulty(gamesPlayed: number): GameDifficulty {
    if (gamesPlayed === 0) {
        return GameDifficulty.EASY;
    } else if (gamesPlayed < 5) {
        return GameDifficulty.NORMAL;
    } else if (gamesPlayed < 15) {
        return GameDifficulty.HARD;
    } else {
        return GameDifficulty.EXPERT;
    }
}