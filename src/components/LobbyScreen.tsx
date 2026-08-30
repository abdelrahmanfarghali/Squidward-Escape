import React from 'react';
import { socket } from '../socket';
import { GameState, Role } from '../types';

interface Props {
  gameState: GameState;
}

const ROLES: { id: Role, name: string, color: string }[] = [
  { id: 'SHAFIQ', name: 'Shafiq (Squidward)', color: 'bg-teal-400' },
  { id: 'SPONGEBOB', name: 'Sponge Bob', color: 'bg-yellow-400' },
  { id: 'SANDY', name: 'Sandy Cheeks', color: 'bg-orange-300' },
  { id: 'PATRICK', name: 'Patrick', color: 'bg-pink-400' },
  { id: 'PLANKTON', name: 'Plankton', color: 'bg-green-600' },
];

export default function LobbyScreen({ gameState }: Props) {
  const me = gameState.players[socket.id!];
  
  const handleSelectRole = (role: Role) => {
    socket.emit('select_role', { roomId: gameState.roomId, role });
  };

  const handleReady = () => {
    socket.emit('toggle_ready', { roomId: gameState.roomId });
  };

  const handleStart = () => {
    socket.emit('start_game', { roomId: gameState.roomId });
  };

  const isRoleTaken = (role: Role) => {
    return Object.values(gameState.players).some(p => p.role === role && p.id !== me.id);
  };

  const hasShafiq = Object.values(gameState.players).some(p => p.role === 'SHAFIQ');
  const hasChaser = Object.values(gameState.players).some(p => p.role !== 'SHAFIQ' && p.role !== null);
  const canStart = me.isHost && hasShafiq && hasChaser;

  return (
    <div className="min-h-screen bg-sky-200 flex flex-col items-center p-8">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border-4 border-sky-400">
        
        <div className="bg-sky-400 p-6 text-white text-center relative">
          <h2 className="text-3xl font-black uppercase tracking-widest drop-shadow-md">
            Room: {gameState.roomId}
          </h2>
          <p className="font-semibold mt-2">
            Players: {Object.keys(gameState.players).length} / 5
          </p>
          {gameState.winner && (
            <div className="mt-4 bg-yellow-300 text-yellow-900 font-bold p-3 rounded-lg inline-block shadow-sm">
              Last Winner: {gameState.winner}
            </div>
          )}
        </div>

        <div className="p-8 grid md:grid-cols-2 gap-8">
          
          {/* Players List */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-200 pb-2">Lobby Members</h3>
            <ul className="space-y-3">
              {Object.values(gameState.players).map(p => (
                <li key={p.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">{p.name} {p.id === me.id ? '(You)' : ''}</span>
                    {p.isHost && <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">HOST</span>}
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${p.role ? 'text-gray-800' : 'text-gray-400'}`}>
                      {p.role ? ROLES.find(r => r.id === p.role)?.name : 'Selecting...'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Role Selection */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-200 pb-2">Select Character</h3>
            <div className="grid grid-cols-1 gap-3">
              {ROLES.map(role => {
                const taken = isRoleTaken(role.id);
                const isMe = me.role === role.id;
                return (
                  <button
                    key={role.id}
                    disabled={taken && !isMe}
                    onClick={() => handleSelectRole(role.id)}
                    className={`
                      relative overflow-hidden p-4 rounded-xl font-bold text-lg text-left transition-all
                      ${taken && !isMe ? 'opacity-50 cursor-not-allowed bg-gray-100' : 
                        isMe ? 'ring-4 ring-sky-500 shadow-md scale-[1.02]' : 'hover:bg-gray-50 border-2 border-gray-200 hover:border-sky-300'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full ${role.color} border-2 border-black/10`} />
                      <span className={taken && !isMe ? 'text-gray-500' : 'text-gray-800'}>{role.name}</span>
                    </div>
                    {isMe && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sky-500">✓</div>}
                  </button>
                );
              })}
            </div>

            <div className="pt-6">
              {me.isHost ? (
                <button 
                  onClick={handleStart}
                  disabled={!canStart}
                  className={`w-full py-4 rounded-xl font-black text-xl text-white transition-all shadow-lg
                    ${canStart ? 'bg-green-500 hover:bg-green-600 hover:scale-105 active:scale-95' : 'bg-gray-400 cursor-not-allowed'}
                  `}
                >
                  START CHAOS
                </button>
              ) : (
                <div className="w-full py-4 rounded-xl bg-gray-100 font-bold text-xl text-center text-gray-500">
                  Waiting for host to start...
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
