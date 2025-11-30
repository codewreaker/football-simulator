import { useEffect, useRef, useState } from 'react'
import { GameEngine } from './engine/GameEngine'
import type { GameState } from './engine/GameEngine'
import type { GameMode } from './engine/modes/GameMode'
import type { GameDifficulty } from './engine/difficulty/DifficultyConfig'
import { getGameModeName } from './engine/modes/GameMode'
import './App.css'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: { home: 0, away: 0 },
    paused: false,
  });
  const [selectedMode, setSelectedMode] = useState<GameMode>('ai-vs-ai');
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>('normal');

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize game engine
    const engine = new GameEngine(canvasRef.current);
    gameEngineRef.current = engine;

    // Set the selected game mode and difficulty
    engine.setGameMode(selectedMode, selectedDifficulty);

    // Register state change callback
    engine.onStateChange((newState) => {
      setGameState(newState);
    });

    // Start the game
    engine.start();

    // Cleanup on unmount
    return () => {
      engine.destroy();
    };
  }, [selectedMode, selectedDifficulty]);

  const handleResetGame = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.resetGame();
    }
  };

  const handleTogglePause = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.togglePause();
    }
  };

  const handleGameModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMode(e.target.value as GameMode);
  };

  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDifficulty(e.target.value as GameDifficulty);
  };

  const difficultyOptions = ['easy', 'normal', 'hard', 'expert'] as const;
  const modeOptions = [
    { value: 'ai-vs-ai', label: 'CPU vs CPU' },
    { value: 'human-vs-human', label: 'You vs You' },
    { value: 'human-vs-ai', label: 'You vs CPU' },
    { value: 'ai-vs-human', label: 'CPU vs You' },
  ] as const;

  return (
    <>
      <h1>Football Sim ⚽</h1>
      <div className="controls-section">
        <div className="control-group">
          <label htmlFor="game-mode">Game Mode:</label>
          <select
            id="game-mode"
            value={selectedMode}
            onChange={handleGameModeChange}
          >
            {modeOptions.map(mode => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="difficulty">Difficulty:</label>
          <select
            id="difficulty"
            value={selectedDifficulty}
            onChange={handleDifficultyChange}
          >
            {difficultyOptions.map(difficulty => (
              <option key={difficulty} value={difficulty}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <canvas id="pitch" ref={canvasRef}></canvas>

      <div className="score" id="score">
        {gameState.score.home} - {gameState.score.away}
      </div>

      <div className="game-info">
        <p>Mode: {getGameModeName(selectedMode as GameMode)}</p>
        <p>Difficulty: {selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}</p>
      </div>

      <div className="controls">
        <button onClick={handleResetGame}>Reset Game</button>
        <button onClick={handleTogglePause}>
          {gameState.paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="instructions">
        <h3>Controls:</h3>
        <p>Arrow Keys or WASD: Move player</p>
        <p>Space or Enter: Pass/Shoot</p>
      </div>
    </>
  )
}

export default App
