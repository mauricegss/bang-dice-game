import React from 'react';
import { useMultiplayer } from './hooks/useMultiplayer';
import MainMenu from './components/MainMenu';
import LobbyScreen from './components/LobbyScreen';
import GameBoard from './components/GameBoard';
import './index.css';

function App() {
  const {
    user,
    room,
    gameState,
    isHost,
    loading,
    error,
    createRoom,
    joinRoom,
    startGame,
    performAction,
    engine
  } = useMultiplayer();

  // Navigation Logic
  if (!room) {
    return (
      <MainMenu
        onJoin={joinRoom}
        onCreate={createRoom}
        user={user}
        loading={loading}
        error={error}
      />
    );
  }

  if (room.phase === 'lobby') {
    return (
      <LobbyScreen
        room={room}
        user={user}
        isHost={isHost}
        onStart={startGame}
        loading={loading}
        error={error}
      />
    );
  }

  if (room.phase === 'playing' || gameState) {
    return (
      <GameBoard
        room={room}
        user={user}
        gameState={gameState}
        performAction={performAction}
        isHost={isHost}
        onExit={() => window.location.reload()} // simplest way to reset
      />
    );
  }

  return <div>Carregando...</div>;
}

export default App;
