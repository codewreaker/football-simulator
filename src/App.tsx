import { useState } from 'react'
import Game from './Game';
import Welcome from './Welcome'
import './index.css'

function App() {
  const [startGame, setStartGame] = useState<boolean>(true);
  const toggleGame = () => setStartGame(prev => !prev);

  if (!startGame) return <Welcome onClick={toggleGame} />
  return <Game onClose={toggleGame} />
}

export default App
