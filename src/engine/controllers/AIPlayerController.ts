// File: src/engine/controllers/AIPlayerController.ts

import type { IPlayerController } from './IPlayerController';
import type { Ball } from '../entities/Ball';
import type { Player } from '../entities/Player';
import { Vector } from '../math/Vector';
import type { DifficultyConfig } from '../difficulty/DifficultyConfig';

/**
 * ============================================================================
 * AI PLAYER CONTROLLER - ADVANCED INTELLIGENCE SYSTEM
 * ============================================================================
 * 
 * This controller manages all CPU-controlled players with the following systems:
 * 
 * 1. ANTI-CLUSTERING SYSTEM
 *    - Only ONE player per team actively chases the ball
 *    - Others maintain formation and provide passing options
 *    - Enforces minimum 50px spacing between teammates
 * 
 * 2. ZONE-BASED POSITIONING
 *    - Defenders: Stay in defensive third, protect goal
 *    - Midfielders: Balance between defense and attack
 *    - Forwards: Stay high and wide, don't drop deep
 * 
 * 3. INTELLIGENT DECISION MAKING
 *    - Evaluates pressure before acting
 *    - Chooses best passing options based on space and position
 *    - Shoots only when near goal with clear angle
 * 
 * 4. DIFFICULTY SCALING
 *    - Uses DifficultyConfig to adjust all behaviors
 *    - Higher difficulty = faster reactions, better decisions
 * ============================================================================
 */
export class AIPlayerController implements IPlayerController {
    // Configuration for this AI's difficulty level
    private difficultyConfig: DifficultyConfig;
    
    // Timers for decision making
    private passTimer: number = 0;              // Frames since last pass attempt
    private reactionDelay: number = 0;          // Artificial delay for realism
    
    // ANTI-CLUSTERING SYSTEM
    // Only ONE player per team should chase the ball at any time
    private isDesignatedBallWinner: boolean = false;  // Is this player the ball chaser?
    private lastBallWinnerCheck: number = 0;          // Frames since last check

    constructor(difficultyConfig: DifficultyConfig) {
        this.difficultyConfig = difficultyConfig;
    }

    /**
     * ========================================================================
     * MAIN UPDATE LOOP - Called every frame (60 FPS)
     * ========================================================================
     * Decides whether to handle possession or off-ball movement
     */
    update(player: Player, ball: Ball, players: Player[]): void {
        // Apply reaction delay for realism (lower difficulty = slower reactions)
        this.reactionDelay -= 1/60;
        if (this.reactionDelay > 0) return;

        // ANTI-CLUSTERING: Update who should chase the ball every 30 frames (0.5 seconds)
        this.lastBallWinnerCheck++;
        if (this.lastBallWinnerCheck > 30) {
            this.updateBallWinnerStatus(player, ball, players);
            this.lastBallWinnerCheck = 0;
        }

        // Main decision tree
        if (player.hasPossession) {
            // Player has the ball - decide what to do with it
            this.handlePossession(player, ball, players);
        } else {
            // Player doesn't have ball - position intelligently
            this.handleOffBall(player, ball, players);
        }
    }

    /**
     * ========================================================================
     * ANTI-CLUSTERING SYSTEM: Determine who chases the ball
     * ========================================================================
     * 
     * Problem: All players running to ball creates unrealistic clustering
     * Solution: Only ONE closest player chases, others maintain formation
     * 
     * How it works:
     * 1. Find all teammates (excluding goalkeeper)
     * 2. Calculate distance of each to ball
     * 3. Only THE CLOSEST player becomes "designated ball winner"
     * 4. Everyone else maintains their formation position
     */
    private updateBallWinnerStatus(player: Player, ball: Ball, players: Player[]): void {
        // Goalkeepers never chase the ball (they guard the goal)
        if (player.role === 'goalkeeper') {
            this.isDesignatedBallWinner = false;
            return;
        }

        // Get all outfield teammates
        const teammates = players.filter(p => 
            p.team === player.team && 
            p.role !== 'goalkeeper'
        );

        // Calculate distances and find THE CLOSEST player
        const distances = teammates.map(p => ({
            player: p,
            dist: p.pos.dist(ball.pos)
        })).sort((a, b) => a.dist - b.dist);

        // CHANGED: Only the #1 closest player chases (was top 2, caused clustering)
        // This player becomes the "designated ball winner"
        this.isDesignatedBallWinner = distances.length > 0 && distances[0].player === player;
    }

    /**
     * ========================================================================
     * POSSESSION HANDLING - Player has the ball
     * ========================================================================
     * 
     * Decision tree:
     * 1. Check if under pressure from opponents
     * 2. If pressured -> Pass immediately
     * 3. If near goal with clear shot -> Shoot
     * 4. If good passing option available -> Pass
     * 5. Otherwise -> Dribble forward
     */
    private handlePossession(player: Player, ball: Ball, players: Player[]): void {
        this.passTimer++;

        // SPECIAL CASE: Goalkeeper behavior
        if (player.role === 'goalkeeper') {
            // Goalkeepers pass quickly (within 15 frames = 0.25 seconds)
            if (this.passTimer > 15) {
                this.pass(player, ball, players);
                this.passTimer = 0;
            } else {
                // Hold position in goal while deciding
                this.positionGoalkeeper(player, ball);
            }
            return;
        }

        // STEP 1: Evaluate current situation
        const isUnderPressure = this.isUnderPressure(player, players);
        const nearGoal = this.isNearOpponentGoal(player);
        const hasShootingAngle = this.hasGoodShootingAngle(player, ball, players);

        // STEP 2: UNDER PRESSURE - Pass immediately to avoid losing ball
        if (isUnderPressure && this.passTimer > 8) {
            const passSuccess = Math.random() < this.difficultyConfig.passAccuracy;
            if (passSuccess) {
                this.pass(player, ball, players);
            } else {
                // Failed pass (inaccurate)
                this.inaccuratePass(player, ball);
            }
            this.passTimer = 0;
            return;
        }

        // STEP 3: Check for SHOOTING opportunity
        const shouldShoot = nearGoal && 
                           hasShootingAngle && 
                           Math.random() < this.difficultyConfig.shootingConfidence;

        // STEP 4: Check for PASSING opportunity
        const hasPassingOption = this.hasGoodPassingOption(player, players);
        const shouldPass = (this.passTimer > this.difficultyConfig.dribblingTime && hasPassingOption) ||
                          (!nearGoal && this.passTimer > 40);

        // STEP 5: Execute decision
        if (shouldShoot) {
            this.shoot(player, ball, players);
            this.passTimer = 0;
        } else if (shouldPass) {
            const passSuccess = Math.random() < this.difficultyConfig.passAccuracy;
            if (passSuccess) {
                this.pass(player, ball, players);
            } else {
                this.inaccuratePass(player, ball);
            }
            this.passTimer = 0;
        } else {
            // No better option - dribble forward
            this.dribble(player, ball);
        }
    }

    /**
     * ========================================================================
     * OFF-BALL MOVEMENT - Player doesn't have the ball
     * ========================================================================
     * 
     * ANTI-CLUSTERING LOGIC:
     * - Only designated ball winner chases the ball
     * - Everyone else maintains formation position
     * - This prevents 5+ players crowding around the ball
     */
    private handleOffBall(player: Player, ball: Ball, players: Player[]): void {
        this.passTimer = 0;

        // SPECIAL CASE: Goalkeeper always stays in goal
        if (player.role === 'goalkeeper') {
            this.positionGoalkeeper(player, ball);
            return;
        }

        const ballSpeed = ball.vel.mag();
        const distToBall = player.pos.dist(ball.pos);
        
        // KEY ANTI-CLUSTERING LOGIC:
        // Only chase ball if:
        // 1. You're the designated ball winner AND
        // 2. Ball is moving slowly (< 150 speed) AND
        // 3. Ball is reasonably close (< 250 pixels)
        const shouldChaseBall = this.isDesignatedBallWinner && 
                               ballSpeed < 150 && 
                               distToBall < 250;

        if (shouldChaseBall) {
            // GO FOR THE BALL
            const targetPos = ball.pos;
            const desired = targetPos.sub(player.pos).normalize()
                .mult(player.acceleration * 1.5 * this.difficultyConfig.movementSpeed);
            const steer = desired.sub(player.vel.mult(0.1)).limit(player.acceleration);
            player.acc = player.acc.add(steer);
        } else {
            // MAINTAIN FORMATION POSITION
            // This is where most players will be most of the time
            this.maintainFormationPosition(player, ball, players);
        }
    }

    /**
     * ========================================================================
     * FORMATION POSITIONING - Keep team shape
     * ========================================================================
     * 
     * This function prevents clustering by:
     * 1. Moving players to their ideal formation position
     * 2. Enforcing minimum 50px spacing between teammates
     * 3. Making players spread out if they get too close
     */
    private maintainFormationPosition(player: Player, ball: Ball, players: Player[]): void {
        const teammates = players.filter(p => p.team === player.team);
        
        // Get where this player SHOULD be based on their role
        const idealPos = this.getIdealFormationPosition(player, ball);
        
        // ANTI-CLUSTERING CHECK:
        // Find any teammates too close (within 50px)
        const tooCloseTeammates = teammates.filter(t => 
            t !== player && 
            player.pos.dist(t.pos) < 50  // Minimum spacing: 50 pixels
        );

        let targetPos = idealPos;

        // If teammates are too close, spread out!
        if (tooCloseTeammates.length > 0) {
            // Calculate a vector pointing AWAY from clustered teammates
            const awayFromTeammates = tooCloseTeammates.reduce((acc, t) => {
                const away = player.pos.sub(t.pos).normalize();
                return acc.add(away);
            }, new Vector(0, 0)).normalize();

            // Move away from cluster
            targetPos = player.pos.add(awayFromTeammates.mult(50));
        }

        // Move towards target position smoothly
        const desired = targetPos.sub(player.pos).normalize()
            .mult(player.acceleration * this.difficultyConfig.positioningAccuracy);
        const steer = desired.sub(player.vel.mult(0.1)).limit(player.acceleration * 0.6);
        
        player.acc = player.acc.add(steer);
    }

    /**
     * ========================================================================
     * IDEAL FORMATION POSITION - Role-based positioning
     * ========================================================================
     * 
     * Each role has different responsibilities:
     * - Defenders: Protect goal, stay deep
     * - Midfielders: Balance attack and defense
     * - Forwards: Stay high, create attacking threat
     */
    private getIdealFormationPosition(player: Player, ball: Ball): Vector {
        const midLine = player.canvasWidth / 2;
        const ballInOwnHalf = player.team === 'home' ? 
            ball.pos.x < midLine : 
            ball.pos.x > midLine;

        // Return role-specific position
        switch (player.role) {
            case 'defender':
                return this.getDefenderIdealPosition(player, ball, ballInOwnHalf);
            case 'midfielder':
                return this.getMidfielderIdealPosition(player, ball);
            case 'forward':
                return this.getForwardIdealPosition(player, ball, ballInOwnHalf);
            default:
                return player.startPos;
        }
    }

    /**
     * DEFENDER POSITIONING
     * - Stay deep to protect goal
     * - Track ball Y position but don't abandon defensive line
     * - Push up slightly when ball is in opponent's half
     */
    private getDefenderIdealPosition(player: Player, ball: Ball, ballInOwnHalf: boolean): Vector {
        const ownGoalX = player.team === 'home' ? 100 : player.canvasWidth - 100;
        const defenseLineX = player.team === 'home' ? 280 : player.canvasWidth - 280;

        if (ballInOwnHalf) {
            // Ball in own half - get closer to ball but protect goal
            const trackX = Math.abs(ball.pos.x - ownGoalX) < 200 ? 
                ball.pos.x + (ownGoalX - ball.pos.x) * 0.5 : 
                defenseLineX;
            
            // Track ball's Y position (but only 30% to avoid over-committing)
            const trackY = player.startPos.y + (ball.pos.y - player.startPos.y) * 0.3;
            
            return new Vector(trackX, trackY);
        } else {
            // Ball in opponent half - hold defensive line, minimal tracking
            const trackY = player.startPos.y + (ball.pos.y - player.startPos.y) * 0.15;
            return new Vector(defenseLineX, trackY);
        }
    }

    /**
     * MIDFIELDER POSITIONING
     * - Stay central, link defense to attack
     * - Track ball but maintain good spacing
     * - Provide passing options
     */
    private getMidfielderIdealPosition(player: Player, ball: Ball): Vector {
        const midLine = player.canvasWidth / 2;

        // Position behind ball to support play
        const supportX = player.team === 'home' ?
            Math.min(ball.pos.x - 100, midLine + 100) :
            Math.max(ball.pos.x + 100, midLine - 100);
        
        // Track ball Y (40% tracking - more than defenders)
        const trackY = player.startPos.y + (ball.pos.y - player.startPos.y) * 0.4;
        
        return new Vector(supportX, trackY);
    }

    /**
     * FORWARD POSITIONING
     * - Stay high and wide
     * - Don't drop too deep
     * - Be ready for through balls
     */
    private getForwardIdealPosition(player: Player, ball: Ball, ballInOwnHalf: boolean): Vector {
        const attackingThird = player.team === 'home' ? 
            player.canvasWidth * 0.7 : 
            player.canvasWidth * 0.3;

        if (ballInOwnHalf) {
            // Ball in own half - stay forward, don't drop deep
            const forwardX = player.team === 'home' ? attackingThird - 80 : attackingThird + 80;
            return new Vector(forwardX, player.startPos.y);
        } else {
            // Ball in attacking half - stay high
            const forwardX = player.team === 'home' ?
                Math.max(ball.pos.x - 60, attackingThird) :
                Math.min(ball.pos.x + 60, attackingThird);
            
            // Slight Y tracking
            const trackY = player.startPos.y + (ball.pos.y - player.startPos.y) * 0.2;
            return new Vector(forwardX, trackY);
        }
    }

    /**
     * ========================================================================
     * PASSING LOGIC
     * ========================================================================
     */

    /**
     * Check if there's a good teammate available to pass to
     */
    private hasGoodPassingOption(player: Player, players: Player[]): boolean {
        const teammates = players.filter(p => p.team === player.team && p !== player);
        
        // Evaluate all teammates as potential pass targets
        const goodOptions = teammates.filter(teammate => {
            // Prefer forward passes
            const isForward = player.team === 'home' ? 
                teammate.pos.x > player.pos.x : 
                teammate.pos.x < player.pos.x;
            
            // Check if pass lane is clear of opponents
            const isClear = this.isPassLaneClear(player, teammate, players);
            const distance = player.pos.dist(teammate.pos);
            
            // Good pass if: forward, clear lane, reasonable distance
            return isForward && isClear && distance < 300 && distance > 50;
        });

        return goodOptions.length > 0;
    }

    /**
     * Execute a pass to the best available teammate
     */
    private pass(player: Player, ball: Ball, players: Player[]): void {
        const teammates = players.filter(p => p.team === player.team && p !== player);

        // EVALUATE EACH TEAMMATE - Score them as pass targets
        const evaluatedTeammates = teammates.map(teammate => {
            // Is this a forward pass?
            const isForward = player.team === 'home' ? 
                teammate.pos.x > player.pos.x : 
                teammate.pos.x < player.pos.x;
            
            const distance = player.pos.dist(teammate.pos);
            const isClear = this.isPassLaneClear(player, teammate, players);
            const isInSpace = this.isPlayerInSpace(teammate, players);
            
            // SCORING SYSTEM (higher score = better pass target)
            let score = 0;
            if (isForward) score += 60;           // Forward passes preferred
            if (isClear) score += 40;             // Clear passing lane important
            if (isInSpace) score += 30;           // Teammate in space is good
            score -= distance * 0.08;             // Closer is better
            if (teammate.role === 'forward') score += 25;  // Forwards are good targets
            if (distance < 50) score -= 50;       // Too close = bad
            
            return { teammate, score, distance };
        });

        // Sort by score - best target first
        evaluatedTeammates.sort((a, b) => b.score - a.score);
        
        if (evaluatedTeammates.length > 0 && evaluatedTeammates[0].score > 0) {
            const bestTarget = evaluatedTeammates[0];
            const target = bestTarget.teammate;
            const distance = bestTarget.distance;
            
            // Calculate pass direction
            let toTarget = target.pos.sub(player.pos).normalize();
            
            // Add inaccuracy based on difficulty
            const inaccuracy = (1 - this.difficultyConfig.passAccuracy) * 0.4;
            const angleError = (Math.random() - 0.5) * inaccuracy;
            const angle = Math.atan2(toTarget.y, toTarget.x) + angleError;
            toTarget = new Vector(Math.cos(angle), Math.sin(angle));
            
            // Calculate power (longer passes need more power)
            const basePower = 250 + distance * 1.2;
            const powerVariation = basePower * this.difficultyConfig.passPowerVariation * (Math.random() - 0.5);
            const finalPower = Math.min(700, Math.max(200, basePower + powerVariation));
            
            // Execute pass
            ball.vel = toTarget.mult(finalPower);
            player.hasPossession = false;
            
            // Add reaction delay
            this.reactionDelay = this.difficultyConfig.reactionTime / 60;
        } else {
            // No good pass option - just dribble
            this.dribble(player, ball);
        }
    }

    /**
     * Check if a player is in space (not crowded by opponents)
     */
    private isPlayerInSpace(player: Player, players: Player[]): boolean {
        const opponents = players.filter(p => p.team !== player.team);
        
        // Check if any opponent is too close
        for (const opponent of opponents) {
            if (player.pos.dist(opponent.pos) < 80) {
                return false;  // Too crowded
            }
        }
        
        return true;  // Player is in space
    }

    /**
     * Inaccurate pass (for when pass fails due to difficulty)
     */
    private inaccuratePass(player: Player, ball: Ball): void {
        const direction = player.team === 'home' ? 1 : -1;
        const randomAngle = (Math.random() - 0.5) * Math.PI * 0.5;
        const passDir = new Vector(
            Math.cos(randomAngle) * direction,
            Math.sin(randomAngle)
        ).normalize();
        
        ball.vel = passDir.mult(300 + Math.random() * 200);
        player.hasPossession = false;
    }

    /**
     * Check if pass lane is clear (no opponents blocking)
     */
    private isPassLaneClear(passer: Player, receiver: Player, players: Player[]): boolean {
        const opponents = players.filter(p => p.team !== passer.team);
        const passVector = receiver.pos.sub(passer.pos);
        const passDistance = passVector.mag();
        
        // Check each opponent
        for (const opponent of opponents) {
            const toOpponent = opponent.pos.sub(passer.pos);
            const projection = (toOpponent.x * passVector.x + toOpponent.y * passVector.y) / passDistance;
            
            // Is opponent along the pass line?
            if (projection > 0 && projection < passDistance) {
                const perpDist = Math.abs(toOpponent.x * passVector.y - toOpponent.y * passVector.x) / passDistance;
                if (perpDist < 35) {
                    return false;  // Pass is blocked
                }
            }
        }
        
        return true;  // Pass lane is clear
    }

    /**
     * ========================================================================
     * SHOOTING LOGIC
     * ========================================================================
     */

    /**
     * Execute a shot at goal
     */
    private shoot(player: Player, ball: Ball, _players: Player[]): void {
        const goalX = player.team === 'home' ? player.canvasWidth - 50 : 50;
        const goalY = player.canvasHeight / 2;

        // Aim for corners (with randomness)
        const cornerOffset = (Math.random() - 0.5) * 120;
        const targetY = goalY + cornerOffset;

        const toGoal = new Vector(goalX - player.pos.x, targetY - player.pos.y).normalize();

        // Add shooting error based on difficulty
        const shootingError = (1 - this.difficultyConfig.shootingConfidence) * 0.3;
        const angleError = (Math.random() - 0.5) * shootingError;
        const angle = Math.atan2(toGoal.y, toGoal.x) + angleError;
        
        const shootDirection = new Vector(Math.cos(angle), Math.sin(angle));
        const shootPower = (400 + Math.random() * 200) * this.difficultyConfig.shootingConfidence;

        // Add spin for realism
        const spin = (Math.random() - 0.5) * 0.5 * this.difficultyConfig.shootingConfidence;
        ball.kick(shootDirection, shootPower, spin);
        
        player.hasPossession = false;
        this.reactionDelay = this.difficultyConfig.reactionTime / 60;
    }

    /**
     * Check if player is near opponent's goal
     */
    private isNearOpponentGoal(player: Player): boolean {
        const goalX = player.team === 'home' ? player.canvasWidth - 50 : 50;
        const goalY = player.canvasHeight / 2;
        const goalPos = new Vector(goalX, goalY);
        
        return player.pos.dist(goalPos) < 250;
    }

    /**
     * Check if player has a clear shooting angle (no defenders blocking)
     */
    private hasGoodShootingAngle(player: Player, _ball: Ball, players: Player[]): boolean {
        const goalX = player.team === 'home' ? player.canvasWidth - 50 : 50;
        const goalY = player.canvasHeight / 2;
        
        const opponents = players.filter(p => p.team !== player.team);
        const toGoal = new Vector(goalX - player.pos.x, goalY - player.pos.y);
        const distToGoal = toGoal.mag();
        
        // Check if any opponent is blocking the shot
        for (const opponent of opponents) {
            const toOpponent = opponent.pos.sub(player.pos);
            const projectionLength = (toOpponent.x * toGoal.x + toOpponent.y * toGoal.y) / distToGoal;
            
            if (projectionLength > 0 && projectionLength < distToGoal) {
                const perpDist = Math.abs(toOpponent.x * toGoal.y - toOpponent.y * toGoal.x) / distToGoal;
                if (perpDist < 40) {
                    return false;  // Shot is blocked
                }
            }
        }
        
        return true;  // Clear shooting lane
    }

    /**
     * ========================================================================
     * DRIBBLING LOGIC
     * ========================================================================
     */

    /**
     * Dribble towards opponent's goal
     */
    private dribble(player: Player, ball: Ball): void {
        const goalX = player.team === 'home' ? player.canvasWidth - 50 : 50;
        const goalY = player.canvasHeight / 2;

        // Add variation to dribbling (imperfect control)
        const variation = (Math.random() - 0.5) * 100 * (1 - this.difficultyConfig.ballControlPrecision);
        const targetX = goalX;
        const targetY = goalY + variation;

        const toGoal = new Vector(targetX - player.pos.x, targetY - player.pos.y).normalize();
        
        // Accelerate towards goal
        player.acc = player.acc.add(toGoal.mult(player.acceleration));

        // Keep ball close to player's feet
        const ballOffset = toGoal.mult(player.radius + 12);
        const targetBallPos = player.pos.add(ballOffset);
        const toBallTarget = targetBallPos.sub(ball.pos).mult(this.difficultyConfig.ballControlPrecision);
        
        ball.pos = ball.pos.add(toBallTarget.mult(0.3));
        ball.vel = player.vel.mult(0.85);
    }

    /**
     * ========================================================================
     * GOALKEEPER POSITIONING
     * ========================================================================
     */

    /**
     * Position goalkeeper to block shots
     */
    private positionGoalkeeper(player: Player, ball: Ball): void {
        const goalX = player.team === 'home' ? 80 : player.canvasWidth - 80;
        
        // Track ball's Y position but stay in goal area
        const targetY = Math.max(
            player.canvasHeight / 2 - 70,
            Math.min(player.canvasHeight / 2 + 70, ball.pos.y)
        );

        const targetPos = new Vector(goalX, targetY);
        const desired = targetPos.sub(player.pos).normalize().mult(player.acceleration);
        const steer = desired.sub(player.vel.mult(0.1)).limit(player.acceleration * 0.6);
        
        player.acc = player.acc.add(steer);
    }

    /**
     * ========================================================================
     * PRESSURE DETECTION
     * ========================================================================
     */

    /**
     * Check if player is under pressure from opponents
     * Used to trigger quick passes or clearances
     */
    private isUnderPressure(player: Player, players: Player[]): boolean {
        const opponents = players.filter(p => p.team !== player.team);
        
        for (const opponent of opponents) {
            const dist = player.pos.dist(opponent.pos);
            
            // Check if opponent is close (within 70px)
            if (dist < 70) {
                // Check if opponent is moving towards this player
                const toPlayer = player.pos.sub(opponent.pos).normalize();
                const opponentDirection = opponent.vel.normalize();
                const dotProduct = toPlayer.x * opponentDirection.x + toPlayer.y * opponentDirection.y;
                
                // Opponent is either moving towards player OR very close
                if (dotProduct > 0.2 || dist < 45) {
                    return true;  // Under pressure!
                }
            }
        }
        
        return false;  // No pressure
    }

    /**
     * ========================================================================
     * RESET - Called when game is reset
     * ========================================================================
     */
    reset(): void {
        this.passTimer = 0;
        this.reactionDelay = 0;
        this.isDesignatedBallWinner = false;
        this.lastBallWinnerCheck = 0;
    }
}