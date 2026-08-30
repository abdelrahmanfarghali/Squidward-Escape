import React, { useState } from 'react';
import { socket } from '../socket';

interface Props {
  playerName: string;
  setPlayerName: (v: string) => void;
  roomId: string;
  setRoomId: (v: string) => void;
}

export default function StartScreen({ playerName, setPlayerName, roomId, setRoomId }: Props) {
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [maxPlayers, setMaxPlayers] = useState(5);

  const generateRandomRoom = () => {
    setRoomId(Math.random().toString(36).substring(2, 8).toUpperCase());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomId.trim()) return;
    
    const payload = mode === 'create' 
      ? { roomId, playerName, maxPlayers }
      : { roomId, playerName };
      
    socket.emit('join_room', payload);
  };

  return (
    <div className="min-h-screen bg-amber-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 border-4 border-amber-500 text-center">
        <h1 className="text-4xl font-black text-amber-600 mb-6 font-sans drop-shadow-sm uppercase tracking-wider">
          Shafiq's Great Escape
        </h1>
        
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${mode === 'join' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Join Room
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('create');
              if (!roomId) generateRandomRoom();
            }}
            className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${mode === 'create' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Create Room
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-left text-sm font-bold text-gray-700 mb-1">Player Name</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-amber-500 focus:outline-none text-lg"
              placeholder="Enter your name"
              maxLength={15}
              required
            />
          </div>
          
          <div>
            <label className="block text-left text-sm font-bold text-gray-700 mb-1">Room Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={e => setRoomId(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-amber-500 focus:outline-none text-lg uppercase"
                placeholder="e.g. BIKINI"
                maxLength={6}
                required
              />
              {mode === 'create' && (
                <button
                  type="button"
                  onClick={generateRandomRoom}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-lg font-bold transition-colors"
                  title="Randomize Room Code"
                >
                  🎲
                </button>
              )}
            </div>
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-left text-sm font-bold text-gray-700 mb-1">Max Players</label>
              <select
                value={maxPlayers}
                onChange={e => setMaxPlayers(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-amber-500 focus:outline-none text-lg"
              >
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
                <option value={4}>4 Players</option>
                <option value={5}>5 Players</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-lg text-xl transition-transform hover:scale-105 active:scale-95 shadow-md mt-6"
          >
            {mode === 'create' ? 'CREATE PARTY' : 'JOIN PARTY'}
          </button>
        </form>
      </div>
    </div>
  );
}
