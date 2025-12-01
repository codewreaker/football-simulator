import type { IPlayerController } from './IPlayerController';
import type { Ball } from '../entities/Ball';
import type { Player } from '../entities/Player';
import { Vector } from '../math/Vector';

/**
 * HumanPlayerController - Handles keyboard input for human-controlled players
 */
export class HumanPlayerController implements IPlayerController {
    private pressedKeys: Set<string> = new Set();
    private isSelected: boolean = false;
    private lastActionTime: number = 0;
    private actionDelay: number = 0.2; // 0.2 seconds between actions
    private chargeTime: number = 0;
    private isCharging: boolean = false;
    private maxChargeTime: number = 1.0; // 1 second max charge

    /**
     * Set whether this player is currently selected
     */
    setSelected(selected: boolean): void {
        this.isSelected = selected;
    }

    update(player: Player, ball: Ball, players: Player[]): void {
        // Auto-switch to nearest player when ball changes significantly
        if (this.isSelected) {
            const distToBall = player.pos.dist(ball.pos);
            
            // If ball is far and moving fast, consider auto-switching
            if (distToBall > 150 && ball.vel.mag() > 200) {
                this.checkAutoSwitch(player, ball, players);
            }
        }

        // Only control the selected player
        if (!this.isSelected) {
            // Non-selected players use simple AI positioning
            this.autoPosition(player, ball);
            return;
        }

        // Handle movement
        this.handleMovement(player);

        // Handle sprinting
        this.handleSprinting(player);

        // Handle ball actions (pass/shoot)
        this.handleBallActions(player, ball, players);

        // Handle ball control when close to ball
        this.handleBallControl(player, ball);
    }

    /**
     * Check if we should auto-switch to a closer player
     */
    private checkAutoSwitch(currentPlayer: Player, ball: Ball, players: Player[]): void {
        // Find all human-controlled players on same team
        const teammates = players.filter(p => 
            p.team === currentPlayer.team && 
            p !== currentPlayer &&
            p.role !== 'goalkeeper'
        );

        // Find closest teammate to ball
        let closestTeammate: Player | null = null;
        let minDist = Infinity;

        teammates.forEach(teammate => {
            const dist = teammate.pos.dist(ball.pos);
            if (dist < minDist) {
                minDist = dist;
                closestTeammate = teammate;
            }
        });

        // If closest teammate is significantly closer (more than 100 pixels), suggest switch
        const currentDist = currentPlayer.pos.dist(ball.pos);
        if (closestTeammate && minDist < currentDist - 100) {
            // This will be handled by the game engine's player switching
            // The current implementation allows manual switching with Q/Tab
        }
    }

    /**
     * Handle player movement from keyboard input
     */
    private handleMovement(player: Player): void {
        const moveVector = new Vector(0, 0);

        // Arrow keys or WASD
        if (this.pressedKeys.has('arrowup') || this.pressedKeys.has('w')) {
            moveVector.y -= 1;
        }
        if (this.pressedKeys.has('arrowdown') || this.pressedKeys.has('s')) {
            moveVector.y += 1;
        }
        if (this.pressedKeys.has('arrowleft') || this.pressedKeys.has('a')) {
            moveVector.x -= 1;
        }
        if (this.pressedKeys.has('arrowright') || this.pressedKeys.has('d')) {
            moveVector.x += 1;
        }

        // Apply movement if any input detected
        if (moveVector.mag() > 0) {
            const normalized = moveVector.normalize();
            player.acc = player.acc.add(normalized.mult(player.acceleration));
        }
    }

    /**
     * Handle sprint input
     */
    private handleSprinting(player: Player): void {
        const isSprinting = this.pressedKeys.has('shift');
        player.setSprinting(isSprinting);
    }

    /**
     * Handle pass and shoot actions
     */
    private handleBallActions(player: Player, ball: Ball, players: Player[]): void {
        const actionKey = this.pressedKeys.has(' ') || this.pressedKeys.has('enter');
        const currentTime = performance.now() / 1000;

        // Start charging when action key is pressed
        if (actionKey && !this.isCharging && player.hasPossession) {
            this.isCharging = true;
            this.chargeTime = 0;
        }

        // Increase charge while key is held
        if (actionKey && this.isCharging) {
            this.chargeTime += 1/60; // Assuming 60fps
            this.chargeTime = Math.min(this.chargeTime, this.maxChargeTime);
        }

        // Release action when key is released
        if (!actionKey && this.isCharging) {
            this.executeAction(player, ball, players);
            this.isCharging = false;
            this.chargeTime = 0;
            this.lastActionTime = currentTime;
        }

        // Quick tap if player doesn't have possession but is close to ball
        if (actionKey && !player.hasPossession && currentTime - this.lastActionTime > this.actionDelay) {
            const distToBall = player.pos.dist(ball.pos);
            if (distToBall < player.radius + ball.radius + 25) {
                this.quickPass(player, ball);
                this.lastActionTime = currentTime;
            }
        }
    }

    /**
     * Execute pass or shoot based on charge time and position
     */
    private executeAction(player: Player, ball: Ball, players: Player[]): void {
        const nearGoal = this.isNearOpponentGoal(player);
        const chargePercent = this.chargeTime / this.maxChargeTime;

        if (nearGoal && chargePercent > 0.4) {
            // Strong charge near goal = shoot
            this.shoot(player, ball, chargePercent);
        } else {
            // Otherwise pass
            this.pass(player, ball, players, chargePercent);
        }
    }

    /**
     * Quick pass with minimal power
     */
    private quickPass(player: Player, ball: Ball): void {
        const direction = player.team === 'home' ? 
            new Vector(1, 0) : 
            new Vector(-1, 0);
        
        ball.vel = direction.mult(300);
    }

    /**
     * Pass to teammate or in direction of movement
     */
    private pass(player: Player, ball: Ball, _players: Player[], chargePercent: number): void {
        // Determine pass direction
        let passDirection = new Vector(0, 0);

        // Use movement keys to determine direction
        if (this.pressedKeys.has('arrowup') || this.pressedKeys.has('w')) {
            passDirection.y -= 1;
        }
        if (this.pressedKeys.has('arrowdown') || this.pressedKeys.has('s')) {
            passDirection.y += 1;
        }
        if (this.pressedKeys.has('arrowleft') || this.pressedKeys.has('a')) {
            passDirection.x -= 1;
        }
        if (this.pressedKeys.has('arrowright') || this.pressedKeys.has('d')) {
            passDirection.x += 1;
        }

        // If no direction specified, pass forward
        if (passDirection.mag() === 0) {
            passDirection = new Vector(player.team === 'home' ? 1 : -1, 0);
        }

        passDirection = passDirection.normalize();

        // Calculate power based on charge time (200-600 pixels/sec)
        const basePower = 200;
        const maxPower = 600;
        const power = basePower + (maxPower - basePower) * chargePercent;

        ball.vel = passDirection.mult(power);
        player.hasPossession = false;
    }

    /**
     * Shoot at goal
     */
    private shoot(player: Player, ball: Ball, chargePercent: number): void {
        const goalX = player.team === 'home' ? player.canvasWidth - 50 : 50;
        const goalY = player.canvasHeight / 2;

        // Allow aiming with arrow keys
        let aimOffset = 0;
        if (this.pressedKeys.has('arrowup') || this.pressedKeys.has('w')) {
            aimOffset = -60;
        } else if (this.pressedKeys.has('arrowdown') || this.pressedKeys.has('s')) {
            aimOffset = 60;
        }

        const targetY = goalY + aimOffset;
        const shootDirection = new Vector(
            goalX - player.pos.x,
            targetY - player.pos.y
        ).normalize();

        // Power based on charge (300-700 pixels/sec)
        const basePower = 300;
        const maxPower = 700;
        const power = basePower + (maxPower - basePower) * chargePercent;

        // Add slight spin for realism
        const spin = (Math.random() - 0.5) * 0.3;
        ball.kick(shootDirection, power, spin);
        
        player.hasPossession = false;
    }

    /**
     * Handle ball control when player is close
     */
    private handleBallControl(player: Player, ball: Ball): void {
        if (!player.hasPossession) return;

        // Keep ball close to player's feet
        const moveVector = new Vector(0, 0);
        
        if (this.pressedKeys.has('arrowup') || this.pressedKeys.has('w')) {
            moveVector.y -= 1;
        }
        if (this.pressedKeys.has('arrowdown') || this.pressedKeys.has('s')) {
            moveVector.y += 1;
        }
        if (this.pressedKeys.has('arrowleft') || this.pressedKeys.has('a')) {
            moveVector.x -= 1;
        }
        if (this.pressedKeys.has('arrowright') || this.pressedKeys.has('d')) {
            moveVector.x += 1;
        }

        // Position ball in direction of movement, or in front if stationary
        let ballDirection: Vector;
        if (moveVector.mag() > 0) {
            ballDirection = moveVector.normalize();
        } else {
            ballDirection = new Vector(player.team === 'home' ? 1 : -1, 0);
        }

        const ballOffset = ballDirection.mult(player.radius + 10);
        const targetBallPos = player.pos.add(ballOffset);
        
        // Smoothly move ball to target position
        const toBallTarget = targetBallPos.sub(ball.pos);
        ball.pos = ball.pos.add(toBallTarget.mult(0.4));
        ball.vel = player.vel.mult(0.85);
    }

    /**
     * Auto-position non-selected players
     */
    private autoPosition(player: Player, ball: Ball): void {
        // Simple AI for non-selected players - stay in formation
        const distToStart = player.pos.dist(player.startPos);
        const distToBall = player.pos.dist(ball.pos);

        let targetPos = player.startPos;

        // Move towards ball if very close
        if (distToBall < 80 && ball.vel.mag() < 100) {
            targetPos = ball.pos;
        } else if (distToStart > 100) {
            // Return to starting position if too far
            targetPos = player.startPos;
        }

        const desired = targetPos.sub(player.pos).normalize().mult(player.acceleration * 0.6);
        const steer = desired.sub(player.vel.mult(0.1)).limit(player.acceleration * 0.4);
        
        player.acc = player.acc.add(steer);
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
     * Handle keyboard input from game engine
     */
    handleInput(keys: Set<string>): void {
        this.pressedKeys = keys;
    }

    reset(): void {
        this.pressedKeys.clear();
        this.lastActionTime = 0;
        this.chargeTime = 0;
        this.isCharging = false;
    }
}