import { useEffect, useRef } from 'react'
import engine, { } from './engine/engine'
// import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Start the game!
    engine(canvasRef.current)
  }, [])

  return (
    <>
      <h1>Football Sim</h1>
      <canvas id="pitch" ref={canvasRef}></canvas>
      <div className="score" id="score">0 - 0</div>
      <div className="controls">
        <button onClick={() => (console.log('resetGame'))}>Reset Game</button>
        <button onClick={() => (console.log('togglePause'))}>Pause/Resume</button>
      </div>
    </>
  )
}

export default App
