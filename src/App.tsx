/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { socket } from './socket';
import { GameState } from './types';
import StartScreen from './components/StartScreen';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    socket.connect();

    socket.on('game_state', (state: GameState) => {
      setGameState(state);
    });

    socket.on('error', (msg: string) => {
      alert(msg);
    });

    return () => {
      socket.disconnect();
      socket.off('game_state');
      socket.off('error');
    };
  }, []);

  if (!gameState) {
    return (
      <StartScreen 
        playerName={playerName} 
        setPlayerName={setPlayerName}
        roomId={roomId}
        setRoomId={setRoomId}
      />
    );
  }

  if (gameState.status === 'LOBBY') {
    return <LobbyScreen gameState={gameState} />;
  }

  return <GameScreen gameState={gameState} />;
}

