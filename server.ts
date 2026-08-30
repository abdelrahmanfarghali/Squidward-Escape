import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Server, Socket } from 'socket.io';
import http from 'http';
import { GameState, Player, Role, HOUSE_X, HOUSE_Y, HOUSE_SIZE, PLAYER_SIZE, PROXIMITY_RADIUS } from './src/types';
import { checkCollision } from './src/shared';

const PORT = 3000;
const MAX_PLAYERS = 5;

const rooms = new Map<string, GameState>();

const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

function createNewRoom(roomId: string, maxPlayers: number): GameState {
  return {
    roomId,
    status: 'LOBBY',
    players: {},
    anger: 0,
    maxAnger: 1000, // 1000 points to anger
    winner: null,
    maxPlayers,
    isPractice: false,
  };
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  
  // Setup Socket.IO
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', ({ roomId, playerName, maxPlayers }) => {
      roomId = roomId.toUpperCase();
      let room = rooms.get(roomId);
      
      if (!room) {
        room = createNewRoom(roomId, maxPlayers || 5);
        rooms.set(roomId, room);
      }

      const playerCount = Object.keys(room.players).length;
      if (playerCount >= room.maxPlayers && !room.players[socket.id]) {
        socket.emit('error', 'Room is full');
        return;
      }

      if (room.status !== 'LOBBY' && !room.players[socket.id]) {
        socket.emit('error', 'Game already in progress');
        return;
      }

      const isHost = playerCount === 0;

      room.players[socket.id] = {
        id: socket.id,
        name: playerName || `Player ${playerCount + 1}`,
        role: null,
        x: 100, // Lobby default
        y: 100,
        isCalling: false,
        ready: false,
        isHost,
        score: 0
      };

      socket.join(roomId);
      io.to(roomId).emit('game_state', room);
    });

    socket.on('select_role', ({ roomId, role }: { roomId: string, role: Role }) => {
      const room = rooms.get(roomId);
      if (room && room.status === 'LOBBY' && room.players[socket.id]) {
        // Check if role is taken
        const roleTaken = Object.values(room.players).some(p => p.role === role);
        if (!roleTaken) {
          room.players[socket.id].role = role;
          io.to(roomId).emit('game_state', room);
        }
      }
    });

    socket.on('toggle_ready', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room && room.status === 'LOBBY' && room.players[socket.id]) {
        room.players[socket.id].ready = !room.players[socket.id].ready;
        io.to(roomId).emit('game_state', room);
      }
    });

    socket.on('start_game', ({ roomId, practiceMode }) => {
      const room = rooms.get(roomId);
      if (room && (room.status === 'LOBBY' || room.status === 'GAME_OVER') && room.players[socket.id]?.isHost) {
        // Check if Shafiq exists and there is at least one chaser
        const hasShafiq = Object.values(room.players).some(p => p.role === 'SHAFIQ');
        const hasChaser = Object.values(room.players).some(p => p.role !== 'SHAFIQ' && p.role !== null);
        
        const startAsPractice = practiceMode !== undefined ? practiceMode : room.isPractice;

        if ((hasShafiq && hasChaser) || (startAsPractice && hasShafiq)) {
          room.status = 'PLAYING';
          room.anger = 0;
          room.winner = null;
          room.isPractice = startAsPractice;
          
          // Reset positions
          Object.values(room.players).forEach(p => {
            if (p.role === 'SHAFIQ') {
              p.x = 100;
              p.y = 100;
            } else {
              p.x = 200;
              p.y = 200;
            }
          });
          
          io.to(roomId).emit('game_state', room);
        }
      }
    });

    socket.on('return_to_lobby', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room && room.status === 'GAME_OVER' && room.players[socket.id]?.isHost) {
        room.status = 'LOBBY';
        io.to(roomId).emit('game_state', room);
      }
    });

    socket.on('move', ({ roomId, dx, dy }) => {
      const room = rooms.get(roomId);
      if (room && room.status === 'PLAYING' && room.players[socket.id]) {
        const p = room.players[socket.id];
        const speed = p.role === 'SHAFIQ' ? 8 : 7; // Shafiq is slightly faster
        
        // Normalize vector to prevent diagonal speed boost
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
          const nx = (dx / length) * speed;
          const ny = (dy / length) * speed;
          
          let newX = p.x + nx;
          let newY = p.y + ny;

          if (!checkCollision(newX, p.y, PLAYER_SIZE)) {
            p.x = newX;
          }
          if (!checkCollision(p.x, newY, PLAYER_SIZE)) {
            p.y = newY;
          }

          // Check if Shafiq reached the house
          if (p.role === 'SHAFIQ') {
            if (
              p.x < HOUSE_X + HOUSE_SIZE &&
              p.x + PLAYER_SIZE > HOUSE_X &&
              p.y < HOUSE_Y + HOUSE_SIZE &&
              p.y + PLAYER_SIZE > HOUSE_Y
            ) {
              room.status = 'GAME_OVER';
              room.winner = 'SHAFIQ';
              p.score += 1;
              io.to(roomId).emit('game_state', room);
            }
          }
        }
      }
    });

    socket.on('call', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room && room.status === 'PLAYING' && room.players[socket.id]) {
        const p = room.players[socket.id];
        if (p.role !== 'SHAFIQ') {
          p.isCalling = true;
          io.to(roomId).emit('play_audio', { type: 'call', playerId: p.id, role: p.role });
          
          // Check proximity to Shafiq
          const shafiq = Object.values(room.players).find(pl => pl.role === 'SHAFIQ');
          if (shafiq) {
            const dist = Math.sqrt(Math.pow(p.x - shafiq.x, 2) + Math.pow(p.y - shafiq.y, 2));
            if (dist < PROXIMITY_RADIUS) {
              room.anger += 20; // Increase anger
              if (room.anger >= room.maxAnger) {
                room.status = 'GAME_OVER';
                room.winner = 'CHASERS';
                
                // Give points to all chasers
                Object.values(room.players).forEach(pl => {
                   if(pl.role !== 'SHAFIQ') pl.score += 1;
                });
                
                io.to(roomId).emit('game_state', room);
              }
            }
          }
          
          setTimeout(() => {
            if (room.players[socket.id]) {
              room.players[socket.id].isCalling = false;
            }
          }, 500);
        }
      }
    });

    socket.on('disconnect', () => {
      for (const [roomId, room] of rooms.entries()) {
        if (room.players[socket.id]) {
          const wasHost = room.players[socket.id].isHost;
          delete room.players[socket.id];
          
          // Re-assign host if needed
          const remainingPlayers = Object.values(room.players);
          if (remainingPlayers.length === 0) {
            rooms.delete(roomId);
          } else {
            if (wasHost) {
              remainingPlayers[0].isHost = true;
            }
            if (room.status === 'PLAYING') {
              room.status = 'LOBBY'; // End game if someone disconnects
            }
            io.to(roomId).emit('game_state', room);
          }
        }
      }
    });
  });

  // Game loop to broadcast state 20 times a second
  setInterval(() => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.status === 'PLAYING') {
        io.to(roomId).emit('sync', { players: room.players, anger: room.anger });
      }
    }
  }, 1000 / 20);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
