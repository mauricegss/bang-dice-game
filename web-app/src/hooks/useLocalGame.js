import { useState, useEffect, useCallback, useRef } from 'react';
import { GameEngine, Phase } from '../game/GameEngine';

export function useLocalGame() {
  const [user, setUser] = useState({ id: 'local-player', name: 'Você' });
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [isHost, setIsHost] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const engineRef = useRef(new GameEngine(3));

  const sync = useCallback(() => {
    setGameState(engineRef.current.getState());
  }, []);

  const createSoloGame = useCallback((name) => {
    const userName = name || 'Você';
    setUser(u => ({ ...u, name: userName }));
    
    // Mock a 3-player lobby immediately starting the game
    const mockRoom = {
      code: 'DEBUG',
      host_id: 'local-player',
      players: [
        { id: 'local-player', name: userName },
        { id: 'bot-1', name: '🤖 Cowboy Bot' },
        { id: 'bot-2', name: '🤖 Outlaw Bot' },
      ],
      phase: 'playing',
    };
    
    setRoom(mockRoom);
    
    const engine = engineRef.current;
    engine.reset();
    const initialState = engine.getState();
    
    // Setup player names and IDs
    initialState.players = initialState.players.map((p, i) => ({
      ...p,
      name: mockRoom.players[i].name,
      socket_id: mockRoom.players[i].id
    }));
    
    engine.hydrate(initialState);
    sync();
  }, [sync]);

  const performAction = useCallback((actionFn, ...args) => {
    const result = actionFn.call(engineRef.current, engineRef.current, ...args);
    sync();
    return result;
  }, [sync]);

  // Basic Bot Logic
  useEffect(() => {
    if (!gameState || gameState.gameOver) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIdx];
    
    if (currentPlayer && currentPlayer.socket_id.startsWith('bot-')) {
       const timer = setTimeout(() => {
          if (gameState.phase === Phase.Rolling) {
             engineRef.current.roll();
             sync();
          } else if (gameState.phase === Phase.Resolving) {
             const targets = gameState.validTargets;
             if (targets && targets.length > 0) {
                const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                engineRef.current.selectTarget(randomTarget);
                sync();
             } else {
                engineRef.current.forceContinue();
                sync();
             }
          }
       }, 1200);
       
       return () => clearTimeout(timer);
    }
  }, [gameState, sync]);

  return {
    user,
    room,
    gameState,
    isHost,
    loading,
    error,
    createRoom: createSoloGame,
    joinRoom: () => {}, 
    startGame: () => {},
    leaveRoom: () => {
      setRoom(null);
      setGameState(null);
    },
    performAction,
    engine: engineRef.current,
  };
}
