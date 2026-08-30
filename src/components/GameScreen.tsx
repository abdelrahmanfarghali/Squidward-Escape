import React, { useEffect, useState, useRef } from 'react';
import { socket } from '../socket';
import { GameState, MAP_WIDTH, MAP_HEIGHT, HOUSE_X, HOUSE_Y, HOUSE_SIZE, PLAYER_SIZE, Player, Role, PROXIMITY_RADIUS } from '../types';
import { OBSTACLES } from '../shared';

interface Props {
  gameState: GameState;
}

const ROLE_COLORS: Record<Role, string> = {
  SHAFIQ: '#2dd4bf', // teal-400
  SPONGEBOB: '#facc15', // yellow-400
  SANDY: '#fdba74', // orange-300
  PATRICK: '#f472b6', // pink-400
  PLANKTON: '#16a34a', // green-600
};

export default function GameScreen({ gameState }: Props) {
  const [localPlayers, setLocalPlayers] = useState<Record<string, Player>>(gameState.players);
  const [anger, setAnger] = useState(gameState.anger);
  const keys = useRef<{ [key: string]: boolean }>({});
  
  const me = localPlayers[socket.id!] || gameState.players[socket.id!];

  useEffect(() => {
    // Sync loop from server
    const handleSync = (data: { players: Record<string, Player>, anger: number }) => {
      setLocalPlayers(data.players);
      setAnger(data.anger);
    };
    
    socket.on('sync', handleSync);
    
    let audioCtx: AudioContext | null = null;
    
    // Audio Cues
    const handlePlayAudio = (data: { type: string, playerId: string, role: string }) => {
      // Create a simple synthetic beep for now
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        if (!audioCtx) audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      }
    };
    socket.on('play_audio', handlePlayAudio);

    return () => {
      socket.off('sync', handleSync);
      socket.off('play_audio', handlePlayAudio);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (e.key === ' ') {
        e.preventDefault(); // Prevent scrolling
        if (me && me.role !== 'SHAFIQ' && !me.isCalling) {
          socket.emit('call', { roomId: gameState.roomId });
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [me, gameState.roomId]);

  // Input loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (!me) return;
      let dx = 0;
      let dy = 0;
      if (keys.current['w'] || keys.current['arrowup']) dy -= 1;
      if (keys.current['s'] || keys.current['arrowdown']) dy += 1;
      if (keys.current['a'] || keys.current['arrowleft']) dx -= 1;
      if (keys.current['d'] || keys.current['arrowright']) dx += 1;

      if (dx !== 0 || dy !== 0) {
        socket.emit('move', { roomId: gameState.roomId, dx, dy });
      }
    }, 1000 / 30); // 30 FPS input polling

    return () => clearInterval(interval);
  }, [me, gameState.roomId]);

  if (!me) return null;

  // Calculate Camera offset
  // We want the player in the center of the screen
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cameraX = Math.max(0, Math.min(MAP_WIDTH - windowSize.w, me.x - windowSize.w / 2));
  const cameraY = Math.max(0, Math.min(MAP_HEIGHT - windowSize.h, me.y - windowSize.h / 2));

  const angerPercentage = Math.min(100, (anger / gameState.maxAnger) * 100);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-emerald-800">
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-50">
        <div className="bg-white/90 backdrop-blur p-4 rounded-2xl shadow-xl border-4 border-gray-900">
          <div className="flex justify-between font-bold mb-2 uppercase text-sm tracking-widest text-gray-700">
            <span>Shafiq's Anger</span>
            <span>{Math.floor(angerPercentage)}%</span>
          </div>
          <div className="h-6 bg-gray-200 rounded-full overflow-hidden border-2 border-gray-900 relative">
            <div 
              className="absolute top-0 left-0 h-full transition-all duration-300 ease-out"
              style={{ 
                width: `${angerPercentage}%`,
                backgroundColor: angerPercentage > 80 ? '#ef4444' : angerPercentage > 50 ? '#f97316' : '#eab308'
              }}
            />
          </div>
          {me.role !== 'SHAFIQ' && (
            <div className="mt-3 text-center text-sm font-bold text-gray-500 uppercase">
              Press <span className="inline-block bg-gray-200 px-2 py-1 rounded text-gray-800 border-b-2 border-gray-400">SPACE</span> to Call
            </div>
          )}
        </div>
      </div>

      {/* Red vignette when anger is high */}
      {angerPercentage > 70 && (
        <div 
          className="absolute inset-0 pointer-events-none z-40 transition-opacity duration-300"
          style={{
            boxShadow: `inset 0 0 100px rgba(239, 68, 68, ${((angerPercentage - 70) / 30) * 0.5})`
          }}
        />
      )}

      {/* World Space */}
      <div 
        className="absolute top-0 left-0"
        style={{
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
          transform: `translate(${-cameraX}px, ${-cameraY}px)`,
          backgroundImage: 'radial-gradient(#0f766e 2px, transparent 2px)',
          backgroundSize: '40px 40px',
        }}
      >
        {/* House */}
        <div 
          className="absolute border-8 border-gray-900 bg-gray-700 flex items-center justify-center overflow-hidden"
          style={{
            left: HOUSE_X,
            top: HOUSE_Y,
            width: HOUSE_SIZE,
            height: HOUSE_SIZE,
            borderRadius: '20px 20px 0 0'
          }}
        >
          <div className="text-4xl">🗿</div>
        </div>

        {/* Obstacles */}
        {OBSTACLES.map((obs, i) => (
          <div 
            key={i}
            className="absolute bg-emerald-900 border-4 border-emerald-950"
            style={{
              left: obs.x,
              top: obs.y,
              width: obs.w,
              height: obs.h,
              borderRadius: 8
            }}
          />
        ))}

        {/* Players */}
        {(Object.values(localPlayers) as Player[]).map(p => {
          if (!p.role) return null;
          const isShafiq = p.role === 'SHAFIQ';
          const isAngry = isShafiq && angerPercentage > 80;
          
          return (
            <div 
              key={p.id}
              className="absolute transition-transform duration-75 flex flex-col items-center justify-center"
              style={{
                left: p.x,
                top: p.y,
                width: PLAYER_SIZE,
                height: PLAYER_SIZE,
                zIndex: isShafiq ? 20 : 10,
              }}
            >
              {/* Proximity Radius for Chasers (only visible to themselves to avoid clutter?) 
                  Let's show it faintly for chasers */}
              {!isShafiq && p.id === me.id && (
                <div 
                  className="absolute border-2 border-dashed border-white/30 rounded-full pointer-events-none"
                  style={{
                    width: PROXIMITY_RADIUS * 2,
                    height: PROXIMITY_RADIUS * 2,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}

              {/* Call indicator */}
              {p.isCalling && (
                <div className="absolute -top-12 animate-bounce bg-white px-2 py-1 rounded-lg font-bold text-xs whitespace-nowrap text-gray-900 shadow-xl border-2 border-gray-900 z-30">
                  HEY SHAFIQ!
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-gray-900"></div>
                </div>
              )}

              {/* Player Body */}
              <div 
                className={`w-full h-full rounded-full border-4 border-gray-900 shadow-lg flex items-center justify-center relative overflow-hidden transition-all duration-300 ${isAngry ? 'bg-red-500 scale-110' : ''}`}
                style={{ backgroundColor: isAngry ? '#ef4444' : ROLE_COLORS[p.role] }}
              >
                {/* Face/Steam for Shafiq */}
                {isAngry && (
                  <>
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-200/50 rounded-full animate-ping"></div>
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-200/50 rounded-full animate-ping"></div>
                  </>
                )}
                {isShafiq ? (
                  <div className={`text-xl ${isAngry ? 'animate-bounce' : ''}`}>{isAngry ? '🤬' : (angerPercentage > 50 ? '😠' : '😐')}</div>
                ) : (
                  <div className="text-sm font-black text-gray-900">{p.role[0]}</div>
                )}
              </div>
              
              {/* Name Tag */}
              <div className="absolute -bottom-6 bg-gray-900/80 text-white text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap">
                {p.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Game Over Overlay */}
      {gameState.status === 'GAME_OVER' && (
        <div className="absolute inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-10 text-center shadow-2xl border-8 border-gray-900 transform scale-110">
            <h2 className="text-5xl font-black mb-4 uppercase">
              {gameState.winner === 'SHAFIQ' ? (
                <span className="text-teal-500">Shafiq Escaped!</span>
              ) : (
                <span className="text-red-500">Shafiq Lost It!</span>
              )}
            </h2>
            <p className="text-xl font-bold text-gray-600 mb-8">
              {gameState.winner === 'SHAFIQ' 
                ? 'He successfully reached the Moai House!' 
                : 'The chasers pushed him over the edge!'}
            </p>
            {me?.isHost ? (
              <button
                onClick={() => socket.emit('start_game', { roomId: gameState.roomId })}
                className="bg-amber-500 hover:bg-amber-600 text-white font-black text-2xl py-4 px-8 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                PLAY AGAIN
              </button>
            ) : (
              <p className="text-xl font-bold text-gray-400">Waiting for host to restart...</p>
            )}
            <div className="mt-4">
              <button
                onClick={() => socket.emit('disconnect')} // Actually, we should emit leave room, but disconnect works for this prototype
                className="text-gray-500 underline font-bold"
              >
                Or leave game (refresh)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
