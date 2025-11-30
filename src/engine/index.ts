/**
 * Football Simulator Game Engine
 * Export main GameEngine class for use in React app
 */

export { GameEngine } from './GameEngine';
export type { GameState } from './GameEngine';

// Export entity classes for advanced usage
export { Ball } from './entities/Ball';
export { Player } from './entities/Player';
export type { PlayerRole, Team } from './entities/Player';

// Export utility classes for advanced usage
export { Vector } from './math/Vector';
export { Renderer } from './renderer/Renderer';
export { Physics } from './physics/Physics';
