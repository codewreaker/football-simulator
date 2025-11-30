const engine = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) {
        console.log("Canvas not mounted");
        return;
    }
    // ============================================
    // CANVAS SETUP
    // ============================================
    const ctx = canvas.getContext('2d');
    canvas.width = 900;
    canvas.height = 600;

    // ============================================
    // GAME STATE VARIABLES
    // ============================================
    let paused = false; // Controls if game is paused
    let score = { home: 0, away: 0 }; // Score tracker for both teams

    // ============================================
    // VECTOR CLASS - Handles 2D math operations
    // ============================================
    class Vector {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }

        // Add two vectors together
        add(v) {
            return new Vector(this.x + v.x, this.y + v.y);
        }

        // Subtract one vector from another
        sub(v) {
            return new Vector(this.x - v.x, this.y - v.y);
        }

        // Multiply vector by a scalar (number)
        mult(n) {
            return new Vector(this.x * n, this.y * n);
        }

        // Get the length/magnitude of the vector
        mag() {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }

        // Convert to unit vector (length = 1, keeps direction)
        normalize() {
            const m = this.mag();
            return m > 0 ? this.mult(1 / m) : new Vector(0, 0);
        }

        // Cap the maximum magnitude of a vector
        limit(max) {
            const m = this.mag();
            return m > max ? this.normalize().mult(max) : this;
        }

        // Get distance between two vectors
        dist(v) {
            return this.sub(v).mag();
        }
    }

    // ============================================
    // BALL CLASS - Handles ball physics
    // ============================================
    class Ball {
        constructor() {
            this.pos = new Vector(canvas.width / 2, canvas.height / 2); // Ball position
            this.vel = new Vector(0, 0); // Ball velocity
            this.radius = 6; // Ball size in pixels
            this.friction = 0.97; // How quickly ball slows down (0.97 = loses 3% speed per frame)
            this.mass = 1; // Mass for collision calculations
        }

        // Update ball position and handle physics
        update() {
            // Apply velocity to position
            this.pos = this.pos.add(this.vel);

            // Apply friction to slow ball down over time
            this.vel = this.vel.mult(this.friction);

            // Stop ball completely if moving very slowly (prevents infinite tiny movements)
            if (this.vel.mag() < 0.05) {
                this.vel = new Vector(0, 0);
            }

            // BOUNDARY COLLISION - Bounce off pitch edges
            // Left and right walls (with padding for pitch boundaries)
            if (this.pos.x < 50 || this.pos.x > canvas.width - 50) {
                this.vel.x *= -0.7; // Reverse direction and lose 30% energy
                this.pos.x = Math.max(50, Math.min(canvas.width - 50, this.pos.x));
            }

            // Top and bottom walls
            if (this.pos.y < 50 || this.pos.y > canvas.height - 50) {
                this.vel.y *= -0.7;
                this.pos.y = Math.max(50, Math.min(canvas.height - 50, this.pos.y));
            }

            // GOAL DETECTION - Check if ball entered goal area
            // Goal is between Y coordinates and past X boundary
            const goalTop = canvas.height / 2 - 80;
            const goalBottom = canvas.height / 2 + 80;

            if (this.pos.y > goalTop && this.pos.y < goalBottom) {
                // Left goal (away team scores)
                if (this.pos.x < 30) {
                    score.away++;
                    updateScore();
                    this.reset();
                }
                // Right goal (home team scores)
                if (this.pos.x > canvas.width - 30) {
                    score.home++;
                    updateScore();
                    this.reset();
                }
            }
        }

        // Reset ball to center after goal
        reset() {
            this.pos = new Vector(canvas.width / 2, canvas.height / 2);
            this.vel = new Vector(0, 0);
        }

        // Draw ball on canvas
        draw() {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            // Add shadow for depth
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.arc(this.pos.x + 2, this.pos.y + 2, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ============================================
    // PLAYER CLASS - Handles player AI and physics
    // ============================================
    class Player {
        constructor(x, y, team, role) {
            this.pos = new Vector(x, y); // Current position
            this.vel = new Vector(0, 0); // Current velocity
            this.acc = new Vector(0, 0); // Acceleration
            this.startPos = new Vector(x, y); // Starting position for formation
            this.team = team; // 'home' or 'away'
            this.role = role; // 'goalkeeper', 'defender', 'midfielder', 'forward'
            this.radius = 15; // Player size in pixels
            this.mass = 2; // Mass for collision calculations

            // Set max speed based on role (tweak these for faster/slower players)
            this.maxSpeed = this.getMaxSpeed();

            // Set acceleration rate based on role
            this.acceleration = role === 'goalkeeper' ? 0.25 :
                role === 'defender' ? 0.35 :
                    role === 'midfielder' ? 0.4 : 0.45;

            this.passTimer = 0; // Timer for when to pass ball
            this.possessionTime = 0; // How long player has had ball
        }

        // Determine max speed based on player role
        getMaxSpeed() {
            switch (this.role) {
                case 'goalkeeper': return 1.5;
                case 'defender': return 2.0;
                case 'midfielder': return 2.3;
                case 'forward': return 2.5;
                default: return 2.0;
            }
        }

        // Main update function called every frame
        update(ball, players) {
            // Calculate distance to ball
            const distToBall = this.pos.dist(ball.pos);

            // Check if player has possession (close to ball and ball is slow)
            const hasBall = distToBall < this.radius + ball.radius + 5 && ball.vel.mag() < 4;

            // Different behavior if player has ball vs doesn't have ball
            if (hasBall) {
                this.possessionTime++;
                this.passTimer++;

                // GOALKEEPER BEHAVIOR - Always pass out quickly
                if (this.role === 'goalkeeper') {
                    if (this.passTimer > 20) {
                        this.pass(ball, players);
                        this.passTimer = 0;
                        this.possessionTime = 0;
                    } else {
                        this.holdBall(ball);
                    }
                }
                // OUTFIELD PLAYER BEHAVIOR
                else {
                    // Decide whether to pass (15% chance every frame after 40 frames)
                    if (this.passTimer > 40 && Math.random() < 0.15) {
                        this.pass(ball, players);
                        this.passTimer = 0;
                        this.possessionTime = 0;
                    } else {
                        this.dribble(ball);
                    }
                }
            } else {
                this.possessionTime = 0;
                // Move to strategic position when not in possession
                this.moveToPosition(ball, players);
            }

            // Apply physics
            this.vel = this.vel.add(this.acc).limit(this.maxSpeed);
            this.pos = this.pos.add(this.vel);

            // Apply friction (player slows down without input)
            this.vel = this.vel.mult(0.88);
            this.acc = this.acc.mult(0);

            // Keep player within pitch boundaries
            const padding = 55; // Distance from edge
            this.pos.x = Math.max(padding, Math.min(canvas.width - padding, this.pos.x));
            this.pos.y = Math.max(padding, Math.min(canvas.height - padding, this.pos.y));

            // GOALKEEPER SPECIFIC - Stay near goal
            if (this.role === 'goalkeeper') {
                const goalX = this.team === 'home' ? 80 : canvas.width - 80;
                const maxDistance = 100; // How far keeper can stray from goal
                if (Math.abs(this.pos.x - goalX) > maxDistance) {
                    this.pos.x = goalX + (this.pos.x > goalX ? maxDistance : -maxDistance);
                }
            }
        }

        // Hold ball stationary (used by goalkeeper)
        holdBall(ball) {
            ball.pos = this.pos.add(new Vector(this.team === 'home' ? 20 : -20, 0));
            ball.vel = new Vector(0, 0);
        }

        // Move with ball towards goal (dribbling)
        dribble(ball) {
            // Determine which goal to attack
            const goalX = this.team === 'home' ? canvas.width - 50 : 50;
            const goalY = canvas.height / 2;

            // Calculate direction to goal
            const toGoal = new Vector(goalX - this.pos.x, goalY - this.pos.y).normalize();

            // Apply acceleration towards goal
            this.acc = this.acc.add(toGoal.mult(this.acceleration));

            // Keep ball in front of player
            const ballOffset = toGoal.mult(this.radius + 10);
            ball.pos = this.pos.add(ballOffset);
            ball.vel = this.vel.mult(0.9);
        }

        // Pass ball to a teammate
        pass(ball, players) {
            // Get all teammates except this player
            const teammates = players.filter(p => p.team === this.team && p !== this);

            // Prefer passing forward (towards opponent goal)
            const forwardTeammates = teammates.filter(p => {
                if (this.team === 'home') return p.pos.x > this.pos.x;
                return p.pos.x < this.pos.x;
            });

            // Choose who to pass to (prefer forward passes)
            const passTargets = forwardTeammates.length > 0 ? forwardTeammates : teammates;

            if (passTargets.length > 0) {
                // Pick a random teammate to pass to
                const target = passTargets[Math.floor(Math.random() * passTargets.length)];

                // Calculate pass direction and power
                const toTarget = target.pos.sub(this.pos).normalize();
                const distance = this.pos.dist(target.pos);

                // Pass power based on distance (tweak these values for pass strength)
                const passPower = Math.min(12, 6 + distance * 0.015);

                // Apply velocity to ball
                ball.vel = toTarget.mult(passPower);
            }
        }

        // AI for positioning when player doesn't have ball
        moveToPosition(ball, players) {
            let targetPos = this.startPos; // Default: return to formation position

            // GOALKEEPER POSITIONING
            if (this.role === 'goalkeeper') {
                const goalX = this.team === 'home' ? 80 : canvas.width - 80;
                // Move vertically to match ball's Y position
                targetPos = new Vector(goalX, Math.max(150, Math.min(canvas.height - 150, ball.pos.y)));
            }
            // OUTFIELD PLAYER POSITIONING
            else {
                const distToBall = this.pos.dist(ball.pos);
                const distToStart = this.pos.dist(this.startPos);

                // If ball is slow/stationary, decide whether to chase it
                if (ball.vel.mag() < 3) {
                    // Find closest teammate to ball
                    const closestTeammate = players
                        .filter(p => p.team === this.team && p !== this && p.role !== 'goalkeeper')
                        .reduce((closest, p) => {
                            const d = p.pos.dist(ball.pos);
                            return d < closest.dist ? { player: p, dist: d } : closest;
                        }, { dist: Infinity });

                    // Find closest opponent to ball
                    const closestOpponent = players
                        .filter(p => p.team !== this.team && p.role !== 'goalkeeper')
                        .reduce((closest, p) => {
                            const d = p.pos.dist(ball.pos);
                            return d < closest.dist ? { player: p, dist: d } : closest;
                        }, { dist: Infinity });

                    // Chase ball if: closest to it AND closer than opponent AND within range
                    if (distToBall < closestTeammate.dist &&
                        distToBall < closestOpponent.dist &&
                        distToBall < 250) {
                        targetPos = ball.pos;
                    }
                    // If far from formation, return to position
                    else if (distToStart > 150) {
                        targetPos = this.startPos;
                    }
                    // Otherwise, position for support play
                    else {
                        const supportDistance = 80;
                        const supportX = this.team === 'home' ?
                            ball.pos.x - supportDistance :
                            ball.pos.x + supportDistance;

                        // Spread out vertically
                        const spreadY = ball.pos.y + (Math.random() - 0.5) * 120;
                        targetPos = new Vector(supportX, spreadY);
                    }
                }
            }

            // Calculate steering force towards target
            const desired = targetPos.sub(this.pos).normalize().mult(this.maxSpeed);
            const steer = desired.sub(this.vel).limit(0.4); // 0.4 = steering strength
            this.acc = this.acc.add(steer);
        }

        // Draw player on canvas
        draw() {
            // Choose color based on team
            const color = this.team === 'home' ? '#FF4444' : '#4444FF';

            // Goalkeeper gets different color
            if (this.role === 'goalkeeper') {
                ctx.fillStyle = this.team === 'home' ? '#FFD700' : '#00CED1';
            } else {
                ctx.fillStyle = color;
            }

            // Draw player circle
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.arc(this.pos.x + 2, this.pos.y + 2, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ============================================
    // PITCH DRAWING FUNCTION
    // ============================================
    function drawPitch() {
        // Base grass color
        ctx.fillStyle = '#2d7a2d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Pitch markings color and width
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;

        // OUTER BOUNDARY
        ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

        // CENTER LINE (splits pitch in half)
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 50);
        ctx.lineTo(canvas.width / 2, canvas.height - 50);
        ctx.stroke();

        // CENTER CIRCLE
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, Math.PI * 2);
        ctx.stroke();

        // CENTER SPOT
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // GOALS (the nets behind goal line)
        ctx.strokeRect(20, canvas.height / 2 - 80, 30, 160); // Left goal
        ctx.strokeRect(canvas.width - 50, canvas.height / 2 - 80, 30, 160); // Right goal

        // PENALTY AREAS (large boxes)
        ctx.strokeRect(50, canvas.height / 2 - 130, 130, 260); // Left penalty area
        ctx.strokeRect(canvas.width - 180, canvas.height / 2 - 130, 130, 260); // Right penalty area

        // GOAL AREAS (small boxes)
        ctx.strokeRect(50, canvas.height / 2 - 60, 50, 120); // Left goal area
        ctx.strokeRect(canvas.width - 100, canvas.height / 2 - 60, 50, 120); // Right goal area

        // PENALTY SPOTS
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(170, canvas.height / 2, 3, 0, Math.PI * 2); // Left penalty spot
        ctx.fill();
        ctx.beginPath();
        ctx.arc(canvas.width - 170, canvas.height / 2, 3, 0, Math.PI * 2); // Right penalty spot
        ctx.fill();

        // PENALTY ARCS (D-shaped arcs at top of penalty box)
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.arc(170, canvas.height / 2, 70, -Math.PI / 2.5, Math.PI / 2.5); // Left arc
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(canvas.width - 170, canvas.height / 2, 70, Math.PI - Math.PI / 2.5, Math.PI + Math.PI / 2.5); // Right arc
        ctx.stroke();

        // CORNER ARCS (quarter circles in each corner)
        const cornerRadius = 10;
        // Top-left
        ctx.beginPath();
        ctx.arc(50, 50, cornerRadius, 0, Math.PI / 2);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.arc(canvas.width - 50, 50, cornerRadius, Math.PI / 2, Math.PI);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.arc(50, canvas.height - 50, cornerRadius, -Math.PI / 2, 0);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.arc(canvas.width - 50, canvas.height - 50, cornerRadius, Math.PI, Math.PI * 1.5);
        ctx.stroke();
    }

    // ============================================
    // GAME INITIALIZATION
    // ============================================
    const ball = new Ball();

    // CREATE PLAYERS - 11 per team (1 goalkeeper + 10 outfield)
    // Formation: 4-3-3 (4 defenders, 3 midfielders, 3 forwards)
    const players = [
        // ===== HOME TEAM (Red) - Attacks right =====
        new Player(100, canvas.height / 2, 'home', 'goalkeeper'), // GK

        // Defenders (4 players)
        new Player(200, canvas.height / 2 - 150, 'home', 'defender'), // Left back
        new Player(200, canvas.height / 2 - 50, 'home', 'defender'), // Left center back
        new Player(200, canvas.height / 2 + 50, 'home', 'defender'), // Right center back
        new Player(200, canvas.height / 2 + 150, 'home', 'defender'), // Right back

        // Midfielders (3 players)
        new Player(380, canvas.height / 2 - 100, 'home', 'midfielder'), // Left mid
        new Player(380, canvas.height / 2, 'home', 'midfielder'), // Center mid
        new Player(380, canvas.height / 2 + 100, 'home', 'midfielder'), // Right mid

        // Forwards (3 players)
        new Player(550, canvas.height / 2 - 80, 'home', 'forward'), // Left wing
        new Player(550, canvas.height / 2, 'home', 'forward'), // Striker
        new Player(550, canvas.height / 2 + 80, 'home', 'forward'), // Right wing

        // ===== AWAY TEAM (Blue) - Attacks left =====
        new Player(800, canvas.height / 2, 'away', 'goalkeeper'), // GK

        // Defenders (4 players)
        new Player(700, canvas.height / 2 - 150, 'away', 'defender'),
        new Player(700, canvas.height / 2 - 50, 'away', 'defender'),
        new Player(700, canvas.height / 2 + 50, 'away', 'defender'),
        new Player(700, canvas.height / 2 + 150, 'away', 'defender'),

        // Midfielders (3 players)
        new Player(520, canvas.height / 2 - 100, 'away', 'midfielder'),
        new Player(520, canvas.height / 2, 'away', 'midfielder'),
        new Player(520, canvas.height / 2 + 100, 'away', 'midfielder'),

        // Forwards (3 players)
        new Player(350, canvas.height / 2 - 80, 'away', 'forward'),
        new Player(350, canvas.height / 2, 'away', 'forward'),
        new Player(350, canvas.height / 2 + 80, 'away', 'forward'),
    ];

    // ============================================
    // UI FUNCTIONS
    // ============================================

    // Update score display on screen
    function updateScore() {
        document.getElementById('score').textContent = `${score.home} - ${score.away}`;
    }

    // Reset entire game state
    function resetGame() {
        score = { home: 0, away: 0 };
        updateScore();
        ball.reset();

        // Reset all players to starting positions
        players.forEach(p => {
            p.pos = new Vector(p.startPos.x, p.startPos.y);
            p.vel = new Vector(0, 0);
            p.acc = new Vector(0, 0);
            p.passTimer = 0;
            p.possessionTime = 0;
        });
    }

    // Toggle pause state
    function togglePause() {
        paused = !paused;
    }

    // ============================================
    // COLLISION DETECTION (between players)
    // ============================================
    function handleCollisions() {
        // Check every pair of players for collision
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const p1 = players[i];
                const p2 = players[j];
                const distance = p1.pos.dist(p2.pos);
                const minDist = p1.radius + p2.radius;

                // If players are overlapping
                if (distance < minDist) {
                    // Calculate collision normal (direction to push apart)
                    const normal = p1.pos.sub(p2.pos).normalize();

                    // Separate players so they're not overlapping
                    const overlap = minDist - distance;
                    const separation = normal.mult(overlap / 2);
                    p1.pos = p1.pos.add(separation);
                    p2.pos = p2.pos.sub(separation);

                    // Apply physics - players bounce off each other slightly
                    const relativeVel = p1.vel.sub(p2.vel);
                    const speed = relativeVel.x * normal.x + relativeVel.y * normal.y;

                    if (speed < 0) continue; // Players moving apart already

                    // Elastic collision with damping (0.3 = energy loss)
                    const impulse = (2 * speed) / (p1.mass + p2.mass);
                    p1.vel = p1.vel.sub(normal.mult(impulse * p2.mass * 0.3));
                    p2.vel = p2.vel.add(normal.mult(impulse * p1.mass * 0.3));
                }
            }
        }
    }

    // ============================================
    // MAIN GAME LOOP - Runs every frame (~60fps)
    // ============================================
    function gameLoop() {
        if (!paused) {
            // Clear and redraw pitch
            drawPitch();

            // Update game objects
            ball.update();
            players.forEach(p => p.update(ball, players));
            handleCollisions();

            // Draw everything
            players.forEach(p => p.draw());
            ball.draw();
        }

        // Request next frame
        requestAnimationFrame(gameLoop);
    }

    // Start the game!
    gameLoop();
}

export default engine