import React from 'react';
import { socket } from '../socket';

interface Props {
  playerName: string;
  setPlayerName: (v: string) => void;
  roomId: string;
  setRoomId: (v: string) => void;
}

export default function StartScreen({ playerName, setPlayerName, roomId, setRoomId }: Props) {
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomId.trim()) return;
    socket.emit('join_room', { roomId, playerName });
  };

  return (
    <div className="min-h-screen bg-amber-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 border-4 border-amber-500 text-center">
        <h1 className="text-4xl font-black text-amber-600 mb-6 font-sans drop-shadow-sm uppercase tracking-wider">
          Shafiq's Great Escape
        </h1>
        
        <form onSubmit={handleJoin} className="space-y-4">
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
            <input
              type="text"
              value={roomId}
              onChange={e => setRoomId(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-amber-500 focus:outline-none text-lg uppercase"
              placeholder="e.g. BIKINI"
              maxLength={6}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-lg text-xl transition-transform hover:scale-105 active:scale-95 shadow-md"
          >
            JOIN PARTY
          </button>
        </form>
      </div>
    </div>
  );
}
