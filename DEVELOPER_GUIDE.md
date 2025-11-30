# Football Simulator - Developer Guide

## Quick Start

### Using the Game Engine in React

```typescript
import { GameEngine } from './engine/GameEngine';
import type { GameState } from './engine/GameEngine';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: { home: 0, away: 0 },
    paused: false,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create engine instance
    const engine = new GameEngine(canvasRef.current);
    gameEngineRef.current = engine;

    // Listen to state changes
    engine.onStateChange((newState) => {
      setGameState(newState);
    });

    // Start the game
    engine.start();

    return () => engine.destroy();
  }, []);

  return (
    <>
      <canvas ref={canvasRef}></canvas>
      <div>Score: {gameState.score.home} - {gameState.score.away}</div>
      <button onClick={() => gameEngineRef.current?.togglePause()}>
        {gameState.paused ? 'Resume' : 'Pause'}
      </button>
      <button onClick={() => gameEngineRef.current?.resetGame()}>
        Reset
      </button>
    </>
  );
}
```

## Architecture Overview

### Core Components

#### 1. GameEngine (Main Orchestrator)
```typescript
const engine = new GameEngine(canvas);
engine.onStateChange((state) => { /* update UI */ });
engine.start();          // Start game loop
engine.stop();           // Stop game loop
engine.togglePause();    // Toggle pause state
engine.resetGame();      // Reset to initial state
engine.getState();       // Get current state
engine.destroy();        // Cleanup
```

#### 2. Game Entities

**Ball**
```typescript
const ball = new Ball(canvasWidth, canvasHeight);
ball.update();           // Physics update, returns { goalScored, scoredBy }
ball.reset();            // Reset to center
ball.draw(ctx);          // Render to canvas
```

**Player**
```typescript
const player = new Player(x, y, 'home', 'goalkeeper', width, height);
player.update(ball, players);  // AI and physics
player.draw(ctx);              // Render to canvas
```

**Vector**
```typescript
const v1 = new Vector(10, 20);
const v2 = v1.add(new Vector(5, 5));      // (15, 25)
const v3 = v1.normalize();                 // Unit vector
const dist = v1.dist(v2);                  // Distance between
const mag = v1.mag();                      // Magnitude
```

#### 3. Game Systems

**Renderer** - Canvas Drawing
```typescript
const renderer = new Renderer(ctx, width, height);
renderer.drawPitch();              // Draw field
renderer.drawPlayers(players);     // Draw all players
renderer.drawBall(ball);           // Draw ball
renderer.render(players, ball);    // Complete frame
```

**Physics** - Collision Detection
```typescript
Physics.handleCollisions(players);  // Detect and resolve collisions
```

## Game Logic Flow

### Game Loop (60 FPS)
```
requestAnimationFrame(() => {
  1. Ball.update()
     - Apply velocity and friction
     - Bounce off walls
     - Detect goals
  
  2. For each Player:
     - Player.update(ball, players)
       - Determine if has possession
       - Execute AI (pass, dribble, position)
       - Apply physics (acceleration, velocity)
       - Keep within bounds
  
  3. Physics.handleCollisions(players)
     - Detect all player-player collisions
     - Resolve with impulse-based response
  
  4. Renderer.render(players, ball)
     - Clear canvas
     - Draw pitch
     - Draw players
     - Draw ball
})
```

## AI System

### Decision Making

**With Ball (Possession)**
```
Goalkeeper (role === 'goalkeeper'):
├─ Timer < 20 frames: holdBall(ball)
└─ Timer >= 20 frames: pass(ball, players)

Outfield Players:
├─ Timer < 40 frames: dribble(ball)
└─ Timer >= 40 frames:
   └─ 15% chance per frame: pass(ball, players)
   └─ Otherwise: dribble(ball)
```

**Without Ball (Off-Ball)**
```
Goalkeeper:
└─ moveToPosition() -> Track ball vertically at goal

Outfield Player:
├─ If ball is slow (mag < 3):
│  ├─ If closest to ball AND not closest opponent:
│  │  └─ Chase ball
│  ├─ Else if far from formation:
│  │  └─ Return to starting position
│  └─ Else:
│     └─ Support play (position near ball for passing)
└─ Else:
   └─ Return to starting position
```

### Passing Logic
```
1. Get all teammate positions except self
2. Filter teammates in forward direction
3. If forward options exist, use them (prefer forward passes)
4. Otherwise use any teammate
5. Calculate pass power based on distance
6. Apply velocity to ball toward target
```

## Physics Details

### Ball Physics
- **Friction**: 0.97 per frame (3% energy loss)
- **Radius**: 6 pixels
- **Bounce Damping**: 0.7 (loses 30% energy on wall collision)
- **Stop Threshold**: Velocity < 0.05 treated as zero

### Player Physics
- **Radius**: 15 pixels
- **Friction**: 0.88 per frame (12% deceleration)
- **Collision Damping**: 0.3 (loses 70% energy in collisions)
- **Mass**: 2 units (compared to ball's 1)

### Player Speeds (by role)
- Goalkeeper: 1.5
- Defender: 2.0
- Midfielder: 2.3
- Forward: 2.5

### Player Acceleration (by role)
- Goalkeeper: 0.25
- Defender: 0.35
- Midfielder: 0.4
- Forward: 0.45

## Team Formation (4-3-3)

### Home Team (Red) - Attacks Right
```
GK: (100, 300)

Defenders:
- LB:  (200, 150)
- LCB: (200, 250)
- RCB: (200, 350)
- RB:  (200, 450)

Midfielders:
- LM:  (380, 200)
- CM:  (380, 300)
- RM:  (380, 400)

Forwards:
- LW:  (550, 220)
- ST:  (550, 300)
- RW:  (550, 380)
```

### Away Team (Blue) - Attacks Left
```
GK: (800, 300)

Defenders:
- LB:  (700, 150)
- LCB: (700, 250)
- RCB: (700, 350)
- RB:  (700, 450)

Midfielders:
- LM:  (520, 200)
- CM:  (520, 300)
- RM:  (520, 400)

Forwards:
- LW:  (350, 220)
- ST:  (350, 300)
- RW:  (350, 380)
```

## Performance Optimization Tips

1. **Reduce Player Count**: Comment out some players in initializePlayers()
2. **Lower Frame Rate**: Modify requestAnimationFrame frequency
3. **Collision Optimization**: Only check nearby players
4. **Rendering**: Use OffscreenCanvas for pitch drawing
5. **AI Simplification**: Reduce decision frequency

## Extending the Game

### Adding a New Mechanic

1. **Add to Ball.ts** if it affects ball physics
2. **Add to Player.ts** if it affects player behavior
3. **Add to Renderer.ts** if it needs rendering
4. **Update GameEngine.ts** to integrate new logic
5. **Test in App.tsx** with proper state management

### Example: Adding Stamina System

```typescript
// In Player.ts
export class Player {
  stamina: number = 100;
  maxStamina: number = 100;

  update(ball: Ball, players: Player[]) {
    // ... existing code ...
    
    // Stamina recovery
    if (!hasBall) {
      this.stamina = Math.min(this.maxStamina, this.stamina + 0.5);
    } else {
      this.stamina = Math.max(0, this.stamina - 1);
    }
    
    // Reduce speed if tired
    if (this.stamina < 20) {
      this.maxSpeed *= 0.8;
    }
  }
}
```

## Common Debugging

### Ball Not Moving
- Check if paused: `engine.getState().paused`
- Verify velocity is set: `ball.vel.mag() > 0`
- Check friction isn't too high

### Players Not Chasing Ball
- Verify `ball.vel.mag() < 3` condition
- Check distance to ball < 250 pixels
- Verify player is closer than teammates

### Scoring Not Working
- Check goal position: Y between 140-460
- Check X boundary: < 30 or > 870
- Verify ball.reset() is called

## Type Definitions Reference

```typescript
// Core types
interface GameState {
  score: { home: number; away: number };
  paused: boolean;
}

type Team = 'home' | 'away';
type PlayerRole = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';

// Vector operations return new instances (immutable style)
class Vector {
  add(v: Vector): Vector;
  sub(v: Vector): Vector;
  mult(n: number): Vector;
  normalize(): Vector;
  limit(max: number): Vector;
  mag(): number;
  dist(v: Vector): number;
}
```

## Resources

- Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- Vector Math: https://en.wikipedia.org/wiki/Vector_(mathematics_and_physics)
- Physics Collision: https://en.wikipedia.org/wiki/Collision_detection
- TypeScript: https://www.typescriptlang.org/docs/
