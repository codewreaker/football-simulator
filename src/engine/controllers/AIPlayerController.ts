import type { IPlayerController } from './IPlayerController';
import type { Ball } from '../entities/Ball';
import type { Player } from '../entities/Player';
import { Vector } from '../math/Vector';
import type { DifficultyConfig } from '../difficulty/DifficultyConfig';

/**
 * AIPlayerController - Handles AI decision-making for CPU-controlled players
 * Uses difficulty configuration to adjust behavior
 */
export class AIPlayerController implements IPlayerController {
    private difficultyConfig: DifficultyConfig;
    private passTimer: number = 0;
    private reactionDelay: number = 0;
    private targetPosition: Vector | null = null;
    private decisionCooldown: number = 0;

    constructor(difficultyConfig: DifficultyConfig) {
        this.difficultyConfig = difficultyConfig;
    }

    update(player: Player, ball: Ball, players: Player[]): void {
        const distToBall = player.pos.dist(ball.pos);
        
        // Apply reaction time delay (higher difficulty = faster reactions)
        this.reactionDelay -= 1/60; // Assuming 60fps
        if (this.reactionDelay > 0) {
            return; // Still reacting, don't make new decisions
        }

        // Check if player has possession
        if (player.hasPossession) {
            this.handlePossession(player, ball, players);
        } else {
            this.handleOffBall(player, ball, players);
        }
    }

    /**
     * Handle AI behavior when player has the ball
     */
    private handlePossession(player: Player, ball: Ball, players: Player[]): void {
        this.passTimer++;
        const diffConfig = this.difficultyConfig;

        // Goalkeeper behavior - pass quickly
        if (player.role === 'goalkeeper') {
            if (this.passTimer > 15) {
                this.pass(player, ball, players);
                this.passTimer = 0;
            } else {
                // Hold position in goal
                this.positionGoalkeeper(player, ball);
            }
            return;
        }

        // Determine if player should shoot, pass, or dribble
        const nearGoal = this.isNearOpponentGoal(player);
        const hasShootingAngle = this.hasGoodShootingAngle(player, ball, players);
        const isUnderPressure = this.isUnderPressure(player, players);

        // Decision making based on difficulty and situation
        const shouldShoot = nearGoal && 
                           hasShootingAngle && 
                           Math.random() < diffConfig.shootingConfidence;

        const shouldPass = isUnderPressure || 
                          this.passTimer > diffConfig.dribblingTime ||
                          Math.random() < (1 - diffConfig.aggressiveness) * 0.3;

        if (shouldShoot) {
            this.shoot(player, ball, players);
            this.passTimer = 0;
        } else if (shouldPass && this.passTimer > 20) {
            const passSuccess = Math.random() < diffConfig.passAccuracy;
            if (passSuccess) {
                this.pass(player, ball, players);
            } else {
                // Misplaced pass
                this.inaccuratePass(player, ball);
            }
            this.passTimer = 0;
        } else {
            // Dribble towards goal
            this.dribble(player, ball);
        }
    }

    /**
     * Handle AI behavior when player doesn't have the ball
     */
    private handleOffBall(player: Player, ball: Ball, players: Player[]): void {
        this.passTimer = 0;

        if (player.role === 'goalkeeper') {
            this.positionGoalkeeper(player, ball);
        } else {
            this.positionOutfieldPlayer(player, ball, players);
        }
    }

    /**
     * Dribble towards opponent's goal
     */
    private dribble(player: Player, ball: Ball): void {
        const goalX = player.team === 'home' ? player.canvasWidth - 50 : 50;
        const goalY = player.canvasHeight / 2;

        // Add some variation to dribbling direction
        const variation = (Math.random() - 0.5) * 100 * (1 - this.difficultyConfig.ballControlPrecision);
        const targetX = goalX;
        const targetY = goalY + variation;

        const toGoal = new Vector(targetX - player.pos.x, targetY - player.pos.y).normalize();
        
        player.acc = player.acc.add(toGoal.mult(player.acceleration));

        // Keep ball close to player while dribbling
        const ballOffset = toGoal.mult(player.radius + 12);
        const targetBallPos = player.pos.add(ballOffset);
        const toBallTarget = targetBallPos.sub(ball.pos).mult(this.difficultyConfig.ballControlPrecision);
        
        ball.pos = ball.pos.add(toBallTarget.mult(0.3));
        ball.vel = player.vel.mult(0.85);
    }

    /**
     * Pass to a teammate
     */
    private pass(player: Player, ball: Ball, players: Player[]): void {
        const teammates = players.filter(p => p.team === player.team && p !== player);

        // Evaluate teammates based on position and availability
        const evaluatedTeammates = teammates.map(teammate => {
            const isForward = player.team === 'home' ? 
                teammate.pos.x > player.pos.x : 
                teammate.pos.x < player.pos.x;
            
            const distance = player.pos.dist(teammate.pos);
            const isClear = this.isPassLaneClear(player, teammate, players);
            
            // Scoring system for best pass target
            let score = 0;
            if (isForward) score += 50;
            if (isClear) score += 30;
            score -= distance * 0.1; // Prefer closer teammates
            if (teammate.role === 'forward') score += 20;
            
            return { teammate, score, distance };
        });

        // Sort by score and pick best target
        evaluatedTeammates.sort((a, b) => b.score - a.score);
        
        if (evaluatedTeammates.length > 0) {
            const bestTarget = evaluatedTeammates[0];
            const target = bestTarget.teammate;
            const distance = bestTarget.distance;
            
            // Calculate pass direction with difficulty-based accuracy
            let toTarget = target.pos.sub(player.pos).normalize();
            
            // Add inaccuracy based on difficulty
            const inaccuracy = (1 - this.difficultyConfig.passAccuracy) * 0.4;
            const angleError = (Math.random() - 0.5) * inaccuracy;
            const angle = Math.atan2(toTarget.y, toTarget.x) + angleError;
            toTarget = new Vector(Math.cos(angle), Math.sin(angle));
            
            // Calculate pass power based on distance
            const basePower = 250 + distance * 1.2;
            const powerVariation = basePower * this.difficultyConfig.passPowerVariation * (Math.random() - 0.5);
            const finalPower = Math.min(700, Math.max(200, basePower + powerVariation));
            
            ball.vel = toTarget.mult(finalPower);
            player.hasPossession = false;
            
            // Set reaction delay
            this.reactionDelay = this.difficultyConfig.reactionTime / 60;
        }
    }

    /**
     * Inaccurate pass (for lower difficulty)
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
     * Shoot at goal
     */
    private shoot(player: Player, ball: Ball, players: Player[]): void {
        const goalX = player.team === 'home' ? player.canvasWidth - 50 : 50;
        const goalY = player.canvasHeight / 2;

        // Aim for corners with some randomness
        const cornerOffset = (Math.random() - 0.5) * 120;
        const targetY = goalY + cornerOffset;

        let toGoal = new Vector(goalX - player.pos.x, targetY - player.pos.y).normalize();

        // Add shooting error based on difficulty
        const shootingError = (1 - this.difficultyConfig.shootingConfidence) * 0.3;
        const angleError = (Math.random() - 0.5) * shootingError;
        const angle = Math.atan2(toGoal.y, toGoal.x) + angleError;
        
        const shootDirection = new Vector(Math.cos(angle), Math.sin(angle));
        const shootPower = (400 + Math.random() * 200) * this.difficultyConfig.shootingConfidence;

        // Add some spin for realistic shots
        const spin = (Math.random() - 0.5) * 0.5 * this.difficultyConfig.shootingConfidence;
        ball.kick(shootDirection, shootPower, spin);
        
        player.hasPossession = false;
        this.reactionDelay = this.difficultyConfig.reactionTime / 60;
    }

    /**
     * Position goalkeeper
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
     * Position outfield player based on role and game situation
     */
    private positionOutfieldPlayer(player: Player, ball: Ball, players: Player[]): void {
        const ballSpeed = ball.vel.mag();
        const distToBall = player.pos.dist(ball.pos);
        const distToStart = player.pos.dist(player.startPos);
        
        // Determine if ball is in player's half
        const midLine = player.canvasWidth / 2;
        const ballInOwnHalf = player.team === 'home' ? 
            ball.pos.x < midLine : 
            ball.pos.x > midLine;

        let targetPos = player.startPos;
        let urgency = 1.0;

        // Role-specific positioning
        switch (player.role) {
            case 'defender':
                targetPos = this.getDefenderPosition(player, ball, players, ballInOwnHalf);
                urgency = ballInOwnHalf ? 1.2 : 0.8;
                break;
            
            case 'midfielder':
                targetPos = this.getMidfielderPosition(player, ball, players);
                urgency = 1.0;
                break;
            
            case 'forward':
                targetPos = this.getForwardPosition(player, ball, players, ballInOwnHalf);
                urgency = ballInOwnHalf ? 0.7 : 1.1;
                break;
        }

        // Apply positioning with difficulty-based accuracy
        const positioningFactor = this.difficultyConfig.positioningAccuracy;
        const actualTarget = player.startPos.add(
            targetPos.sub(player.startPos).mult(positioningFactor)
        );

        const desired = actualTarget.sub(player.pos).normalize()
            .mult(player.acceleration * urgency * this.difficultyConfig.movementSpeed);
        const steer = desired.sub(player.vel.mult(0.1)).limit(player.acceleration * 0.8);
        
        player.acc = player.acc.add(steer);
    }

    /**
     * Get defender positioning
     */
    private getDefenderPosition(player: Player, ball: Ball, players: Player[], ballInOwnHalf: boolean): Vector {
        const ownGoalX = player.team === 'home' ? 100 : player.canvasWidth - 100;
        const defenseLineX = player.team === 'home' ? 250 : player.canvasWidth - 250;

        if (ballInOwnHalf) {
            const distToBall = player.pos.dist(ball.pos);
            
            if (distToBall < 150 * this.difficultyConfig.defensiveIntensity) {
                // Close to ball - press aggressively
                return ball.pos;
            } else {
                // Position between ball and goal
                const interceptX = ball.pos.x + (ownGoalX - ball.pos.x) * 0.4;
                return new Vector(interceptX, ball.pos.y);
            }
        } else {
            // Ball in opponent's half - hold defensive line
            return new Vector(defenseLineX, player.startPos.y);
        }
    }

    /**
     * Get midfielder positioning
     */
    private getMidfielderPosition(player: Player, ball: Ball, players: Player[]): Vector {
        const distToBall = player.pos.dist(ball.pos);
        const midLine = player.canvasWidth / 2;

        if (distToBall < 120) {
            // Close enough to challenge for ball
            return ball.pos;
        } else {
            // Support play - position between ball and midfield
            const supportX = player.team === 'home' ?
                Math.min(ball.pos.x - 80, midLine + 80) :
                Math.max(ball.pos.x + 80, midLine - 80);
            
            const supportY = player.startPos.y + (ball.pos.y - player.startPos.y) * 0.4;
            return new Vector(supportX, supportY);
        }
    }

    /**
     * Get forward positioning
     */
    private getForwardPosition(player: Player, ball: Ball, players: Player[], ballInOwnHalf: boolean): Vector {
        const distToBall = player.pos.dist(ball.pos);
        const attackingThird = player.team === 'home' ? player.canvasWidth * 0.66 : player.canvasWidth * 0.33;

        if (!ballInOwnHalf && distToBall < 100) {
            // In attacking position, close to ball
            return ball.pos;
        } else {
            // Position for attack - stay forward
            const forwardX = player.team === 'home' ?
                Math.max(ball.pos.x - 60, attackingThird) :
                Math.min(ball.pos.x + 60, attackingThird);
            
            return new Vector(forwardX, player.startPos.y);
        }
    }

    /**
     * Check if player is near opponent's goal
     */
    private isNearOpponentGoal(player: Player): boolean {
        const goalX = player.team === 'home' ? player.canvasWidth - 50 : 50;
        const goalY = player.canvasHeight / 2;
        const goalPos = new Vector(goalX, goalY);
        
        return player.pos.dist(goalPos) < 200;
    }

    /**
     * Check if player has a good shooting angle
     */
    private hasGoodShootingAngle(player: Player, ball: Ball, players: Player[]): boolean {
        const goalX = player.team === 'home' ? player.canvasWidth - 50 : 50;
        const goalY = player.canvasHeight / 2;
        
        // Check if there are defenders blocking
        const opponents = players.filter(p => p.team !== player.team);
        const toGoal = new Vector(goalX - player.pos.x, goalY - player.pos.y);
        const distToGoal = toGoal.mag();
        
        for (const opponent of opponents) {
            const toOpponent = opponent.pos.sub(player.pos);
            const projectionLength = (toOpponent.x * toGoal.x + toOpponent.y * toGoal.y) / distToGoal;
            
            if (projectionLength > 0 && projectionLength < distToGoal) {
                const perpDist = Math.abs(toOpponent.x * toGoal.y - toOpponent.y * toGoal.x) / distToGoal;
                if (perpDist < 40) {
                    return false; // Blocked
                }
            }
        }
        
        return true;
    }

    /**
     * Check if pass lane is clear
     */
    private isPassLaneClear(passer: Player, receiver: Player, players: Player[]): boolean {
        const opponents = players.filter(p => p.team !== passer.team);
        const passVector = receiver.pos.sub(passer.pos);
        const passDistance = passVector.mag();
        
        for (const opponent of opponents) {
            const toOpponent = opponent.pos.sub(passer.pos);
            const projection = (toOpponent.x * passVector.x + toOpponent.y * passVector.y) / passDistance;
            
            if (projection > 0 && projection < passDistance) {
                const perpDist = Math.abs(toOpponent.x * passVector.y - toOpponent.y * passVector.x) / passDistance;
                if (perpDist < 30) {
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * Check if player is under pressure from opponents
     */
    private isUnderPressure(player: Player, players: Player[]): boolean {
        const opponents = players.filter(p => p.team !== player.team);
        
        for (const opponent of opponents) {
            if (player.pos.dist(opponent.pos) < 60) {
                return true;
            }
        }
        
        return false;
    }

    reset(): void {
        this.passTimer = 0;
        this.reactionDelay = 0;
        this.targetPosition = null;
        this.decisionCooldown = 0;
    }
}