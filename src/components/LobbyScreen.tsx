import React from 'react';
import { socket } from '../socket';
import { GameState, Role } from '../types';
import squidwardImg from '../assets/images/squidward_funky_1788122008186.jpg';
import spongebobImg from '../assets/images/spongebob_funky_1788122021542.jpg';
import sandyImg from '../assets/images/sandy_funky_1788122037010.jpg';
import patrickImg from '../assets/images/patrick_funky_1788122049362.jpg';
import planktonImg from '../assets/images/plankton_funky_1788122060611.jpg';
import bgImg from '../assets/images/bikini_bottom_funky_1788122072020.jpg';

interface Props {
  gameState: GameState;
}

const ROLES: { id: Role, name: string, image: string }[] = [
  { id: 'SHAFIQ', name: 'Shafiq (Squidward)', image: squidwardImg },
  { id: 'SPONGEBOB', name: 'Sponge Bob', image: spongebobImg },
  { id: 'SANDY', name: 'Sandy Cheeks', image: sandyImg },
  { id: 'PATRICK', name: 'Patrick', image: patrickImg },
  { id: 'PLANKTON', name: 'Plankton', image: planktonImg },
];

export default function LobbyScreen({ gameState }: Props) {
  const me = gameState.players[socket.id!];
  
  const handleSelectRole = (role: Role) => {
    socket.emit('select_role', { roomId: gameState.roomId, role });
  };

  const handleReady = () => {
    socket.emit('toggle_ready', { roomId: gameState.roomId });
  };

  const isRoleTaken = (role: Role) => {
    return Object.values(gameState.players).some(p => p.role === role && p.id !== me.id);
  };

  const hasShafiq = Object.values(gameState.players).some(p => p.role === 'SHAFIQ');
  const hasChaser = Object.values(gameState.players).some(p => p.role !== 'SHAFIQ' && p.role !== null);
  const canStart = me.isHost && hasShafiq && hasChaser;
  const canPractice = me.isHost && me.role !== null;

  return (
    <div 
      className="min-h-screen flex flex-col items-center p-8 bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImg})` }}
    >
      <div className="max-w-4xl w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border-4 border-sky-400">
        
        <div className="bg-sky-400 p-6 text-white text-center relative">
          <button 
            onClick={() => socket.emit('leave_room', { roomId: gameState.roomId })}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-lg backdrop-blur transition-all flex items-center gap-2 text-sm shadow-sm"
          >
            ← Leave
          </button>
          <h2 className="text-3xl font-black uppercase tracking-widest drop-shadow-md">
            {gameState.isPractice ? 'Practice Room' : `Room: ${gameState.roomId}`}
          </h2>
          {!gameState.isPractice && (
            <p className="font-semibold mt-2">
              Players: {Object.keys(gameState.players).length} / {gameState.maxPlayers || 5}
            </p>
          )}
          {gameState.winner && !gameState.isPractice && (
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
              {Object.values(gameState.players).map(p => {
                const pRoleInfo = ROLES.find(r => r.id === p.role);
                return (
                  <li key={p.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      {pRoleInfo && (
                        <div 
                          className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-gray-300"
                          style={{ backgroundImage: `url(${pRoleInfo.image})` }}
                        />
                      )}
                      <div className="flex flex-col">
                        <span className="font-bold text-lg leading-tight">{p.name} {p.id === me.id ? '(You)' : ''}</span>
                        {p.isHost && <span className="text-amber-600 text-xs font-bold">HOST</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${p.role ? 'text-gray-800' : 'text-gray-400'}`}>
                        {pRoleInfo ? pRoleInfo.name : 'Selecting...'}
                      </div>
                    </div>
                  </li>
                );
              })}
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
                      <div 
                        className={`w-10 h-10 rounded-full border-2 border-black/10 bg-cover bg-center`}
                        style={{ backgroundImage: `url(${role.image})` }}
                      />
                      <span className={taken && !isMe ? 'text-gray-500' : 'text-gray-800'}>{role.name}</span>
                    </div>
                    {isMe && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sky-500">✓</div>}
                  </button>
                );
              })}
            </div>

            <div className="pt-6">
              {me.isHost ? (
                <div className="flex flex-col gap-3">
                  {!gameState.isPractice && (
                    <button 
                      onClick={() => socket.emit('start_game', { roomId: gameState.roomId, practiceMode: false })}
                      disabled={!canStart}
                      className={`w-full py-4 rounded-xl font-black text-xl text-white transition-all shadow-lg
                        ${canStart ? 'bg-green-500 hover:bg-green-600 hover:scale-105 active:scale-95' : 'bg-gray-400 cursor-not-allowed'}
                      `}
                    >
                      START CHAOS
                    </button>
                  )}
                  <button 
                    onClick={() => socket.emit('start_game', { roomId: gameState.roomId, practiceMode: true })}
                    disabled={!canPractice}
                    className={`w-full ${gameState.isPractice ? 'py-4 text-xl' : 'py-3 text-lg'} rounded-xl font-bold text-white transition-all shadow-md
                      ${canPractice ? 'bg-teal-500 hover:bg-teal-600 hover:scale-105 active:scale-95' : 'bg-gray-300 cursor-not-allowed'}
                    `}
                  >
                    {gameState.isPractice ? 'START PRACTICE' : 'SOLO PRACTICE'}
                  </button>
                </div>
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
