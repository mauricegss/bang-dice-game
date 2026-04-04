import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { useMultiplayer } from './hooks/useMultiplayer';
import { useLocalGame } from './hooks/useLocalGame';
import MainMenu from './components/MainMenu';
import LobbyScreen from './components/LobbyScreen';
import GameBoard from './components/GameBoard';
import './index.css';

function GameContainer() {
  const { roomCode } = useParams();
  const [mode, setMode] = React.useState('multiplayer');
  
  const multi = useMultiplayer();
  const local = useLocalGame();
  
  const current = mode === 'multiplayer' ? multi : local;
  
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
    leaveRoom,
    performAction,
  } = current;

  // Navigation Logic
  if (!room) {
    return (
      <MainMenu 
        onJoin={joinRoom} 
        onCreate={(name) => { setMode('multiplayer'); createRoom(name); }} 
        onSolo={(name) => { setMode('solo'); local.createRoom(name); }}
        user={user} 
        loading={loading}
        error={error}
        initialCode={roomCode}
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
        onLeave={() => { leaveRoom(); setMode('multiplayer'); }}
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
        onExit={() => {
          if (mode === 'solo') {
            leaveRoom();
            setMode('multiplayer');
          } else {
            window.location.href = '/';
          }
        }}
      />
    );
  }

  return <div>Carregando...</div>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<GameContainer />} />
      <Route path="/:roomCode" element={<GameContainer />} />
    </Routes>
  );
}

export default App;
