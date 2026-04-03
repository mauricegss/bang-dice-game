import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../SupabaseClient';
import { GameEngine } from '../game/GameEngine';

const LS_USER_KEY = 'bang_dice_user';

// Generate a random user ID if one doesn't exist
const getOrCreateUser = () => {
  const stored = localStorage.getItem(LS_USER_KEY);
  if (stored) return JSON.parse(stored);
  const newUser = {
    id: crypto.randomUUID(),
    name: ``,
  };
  localStorage.setItem(LS_USER_KEY, JSON.stringify(newUser));
  return newUser;
};

export function useMultiplayer() {
  const [user, setUser] = useState(getOrCreateUser);
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const engineRef = useRef(new GameEngine(4)); // Default 4

  // Update user name in local storage
  const updateUserName = (newName) => {
    const updated = { ...user, name: newName };
    setUser(updated);
    localStorage.setItem(LS_USER_KEY, JSON.stringify(updated));
  };

  // Sync engine and local state
  const syncEngineToState = useCallback(() => {
    setGameState(engineRef.current.getState());
  }, []);

  // Update game state in Supabase
  const pushState = useCallback(async (newEngineState) => {
    if (!room) return;
    const { error: err } = await supabase
      .from('lobbies')
      .update({ game_state: newEngineState })
      .eq('code', room.code);
    if (err) setError(err.message);
  }, [room]);

  // Create Room
  const createRoom = async (playerName) => {
    setLoading(true);
    updateUserName(playerName);

    // 6-digit random code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newUser = { id: user.id, name: playerName };

    const { data, error: err } = await supabase
      .from('lobbies')
      .insert({
        code,
        host_id: user.id,
        players: [newUser],
        phase: 'lobby'
      })
      .select()
      .single();

    if (err) {
      setError(err.message);
    } else {
      setRoom(data);
      setIsHost(true);
    }
    setLoading(false);
  };

  // Join Room
  const joinRoom = async (code, playerName) => {
    setLoading(true);
    updateUserName(playerName);

    // Find room
    const { data: lobbies, error: findErr } = await supabase
      .from('lobbies')
      .select()
      .eq('code', code.toUpperCase())
      .single();

    if (findErr || !lobbies) {
      setError('Sala não encontrada.');
      setLoading(false);
      return;
    }

    // Add player if not already there
    const updatedPlayers = [...(lobbies.players || [])];
    if (!updatedPlayers.some(p => p.id === user.id)) {
      updatedPlayers.push({ id: user.id, name: playerName });
      const { error: updateErr } = await supabase
        .from('lobbies')
        .update({ players: updatedPlayers })
        .eq('code', code.toUpperCase());

      if (updateErr) {
        setError(updateErr.message);
        setLoading(false);
        return;
      }
    }

    setRoom({ ...lobbies, players: updatedPlayers });
    setIsHost(lobbies.host_id === user.id);
    if (lobbies.game_state) {
      engineRef.current.hydrate(lobbies.game_state);
      syncEngineToState();
    }
    setLoading(false);
  };

  // Leave Room & Cleanup
  const leaveRoom = useCallback(async () => {
    if (!room) return;
    const updatedPlayers = room.players.filter(p => p.id !== user.id);
    
    if (updatedPlayers.length === 0) {
      // Last person left, delete the room
      await supabase.from('lobbies').delete().eq('code', room.code);
    } else {
      // Update players list and pass host if needed
      const newHostId = isHost ? updatedPlayers[0].id : room.host_id;
      await supabase.from('lobbies').update({ 
        players: updatedPlayers,
        host_id: newHostId
      }).eq('code', room.code);
    }
    setRoom(null);
    setGameState(null);
    setIsHost(false);
  }, [room, user.id, isHost]);

  // Handle window close
  useEffect(() => {
    const handleUnload = () => { if (room) leaveRoom(); };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [room, leaveRoom]);

  // Start Game (Host only)
  const startGame = async () => {
    if (!isHost || !room) return;

    const engine = new GameEngine(room.players.length);
    // Overwrite the engine's generic player metadata with the names from the room
    const initialEngineState = engine.getState();
    initialEngineState.players = initialEngineState.players.map((p, idx) => ({
      ...p,
      name: room.players[idx]?.name || `Player ${idx + 1}`,
      socket_id: room.players[idx]?.id, // use as uid
    }));
    engine.hydrate(initialEngineState);

    const { error: err } = await supabase
      .from('lobbies')
      .update({
        phase: 'playing',
        game_state: engine.getState()
      })
      .eq('code', room.code);

    if (err) setError(err.message);
  };

  // Real-time subscription
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room-${room.code}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'lobbies',
        filter: `code=eq.${room.code}`
      }, (payload) => {
        const updated = payload.new;
        setRoom(updated);

        // Update local engine if game_state changed
        if (updated.game_state) {
          // Optimization: Only hydrate if local state is different
          // To keep it simple for now, we'll hydrate every update.
          // Note: In a production app, we'd check timestamps or turn indices.
          engineRef.current.hydrate(updated.game_state);
          syncEngineToState();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.code, syncEngineToState]);

  // Player action wrappers
  const performAction = useCallback((actionFn, ...args) => {
    // Only current player can perform actions in a real multiplayer environment.
    // In our simplified logic, if it's the local player's turn, we update.
    const currentState = engineRef.current.getState();
    const currentPlayer = currentState.players[currentState.currentPlayerIdx];

    // Check ownership: does current player socket_id match my user.id?
    if (currentPlayer.socket_id !== user.id) {
      console.warn('Não é o seu turno!');
      return;
    }

    const result = actionFn.apply(engineRef.current, args);
    const newState = engineRef.current.getState();
    pushState(newState);
    setGameState(newState);
    return result;
  }, [user.id, pushState]);

  return {
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
    engine: engineRef.current,
  };
}
