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

function addBotsToRoom(room: GameState) {
  const allRoles: Role[] = ['SHAFIQ', 'SPONGEBOB', 'SANDY', 'PATRICK', 'PLANKTON'];
  const takenRoles = Object.values(room.players).map(p => p.role);
  const rolesToAdd = allRoles.filter(r => !takenRoles.includes(r));

  rolesToAdd.forEach((role, i) => {
    const botId = `bot_${role?.toLowerCase()}`;
    room.players[botId] = {
      id: botId,
      name: `Bot ${role}`,
      role: role,
      x: role === 'SHAFIQ' ? 100 : 200 + i * 50,
      y: role === 'SHAFIQ' ? 100 : 200 + i * 50,
      isCalling: false,
      ready: true,
      isHost: false,
      score: 0,
      isBot: true
    };
  });
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

    socket.on('start_practice_match', ({ playerName }) => {
      const roomId = generateRoomId();
      const room = createNewRoom(roomId, 1);
      rooms.set(roomId, room);

      room.players[socket.id] = {
        id: socket.id,
        name: playerName || 'Player',
        role: 'SHAFIQ',
        x: 100,
        y: 100,
        isCalling: false,
        ready: true,
        isHost: true,
        score: 0
      };

      room.status = 'LOBBY';
      room.isPractice = true;

      socket.join(roomId);
      io.to(roomId).emit('game_state', room);
    });

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

        const hostHasRole = room.players[socket.id].role !== null;

        if ((hasShafiq && hasChaser && !startAsPractice) || (startAsPractice && hostHasRole)) {
          room.status = 'PLAYING';
          room.anger = 0;
          room.winner = null;
          room.isPractice = startAsPractice;
          
          if (startAsPractice) {
            addBotsToRoom(room);
          } else {
            // Remove any bots if switching back to normal mode
            Object.keys(room.players).forEach(k => {
              if (room.players[k].isBot) delete room.players[k];
            });
          }
          
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
        // Clean up bots
        Object.keys(room.players).forEach(k => {
          if (room.players[k].isBot) delete room.players[k];
        });
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

    socket.on('leave_room', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room && room.players[socket.id]) {
        const wasHost = room.players[socket.id].isHost;
        delete room.players[socket.id];
        
        socket.leave(roomId);
        socket.emit('left_room');

        const realPlayers = Object.values(room.players).filter(p => !p.isBot);
        if (realPlayers.length === 0) {
          rooms.delete(roomId);
        } else {
          if (wasHost && room.players[realPlayers[0].id]) {
            room.players[realPlayers[0].id].isHost = true;
          }
          if (room.status === 'PLAYING') {
            room.status = 'LOBBY';
            Object.keys(room.players).forEach(k => {
              if (room.players[k].isBot) delete room.players[k];
            });
          }
          io.to(roomId).emit('game_state', room);
        }
      }
    });

    socket.on('disconnect', () => {
      for (const [roomId, room] of rooms.entries()) {
        if (room.players[socket.id]) {
          const wasHost = room.players[socket.id].isHost;
          delete room.players[socket.id];
          
          const realPlayers = Object.values(room.players).filter(p => !p.isBot);
          if (realPlayers.length === 0) {
            rooms.delete(roomId);
          } else {
            if (wasHost && room.players[realPlayers[0].id]) {
              room.players[realPlayers[0].id].isHost = true;
            }
            if (room.status === 'PLAYING') {
              room.status = 'LOBBY';
              Object.keys(room.players).forEach(k => {
                if (room.players[k].isBot) delete room.players[k];
              });
            }
            io.to(roomId).emit('game_state', room);
          }
        }
      }
    });
  });

  const updateBots = (room: GameState) => {
    const shafiq = Object.values(room.players).find(p => p.role === 'SHAFIQ');
    if (!shafiq || room.status !== 'PLAYING') return;

    Object.values(room.players).forEach(bot => {
      if (!bot.isBot) return;

      if (bot.role === 'SHAFIQ') {
        // Shafiq bot runs towards the house
        const targetX = HOUSE_X + HOUSE_SIZE / 2;
        const targetY = HOUSE_Y + HOUSE_SIZE / 2;
        const dx = targetX - bot.x;
        const dy = targetY - bot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          const speed = 7;
          const nx = (dx / dist) * speed;
          const ny = (dy / dist) * speed;

          let newX = bot.x + nx;
          let newY = bot.y + ny;

          if (!checkCollision(newX, bot.y, PLAYER_SIZE)) {
            bot.x = newX;
          }
          if (!checkCollision(bot.x, newY, PLAYER_SIZE)) {
            bot.y = newY;
          }
          
          // Check if bot Shafiq reached the house
          if (
            bot.x < HOUSE_X + HOUSE_SIZE &&
            bot.x + PLAYER_SIZE > HOUSE_X &&
            bot.y < HOUSE_Y + HOUSE_SIZE &&
            bot.y + PLAYER_SIZE > HOUSE_Y
          ) {
            room.status = 'GAME_OVER';
            room.winner = 'SHAFIQ';
            bot.score += 1;
            io.to(room.roomId).emit('game_state', room);
          }
        }
      } else {
        // Chaser bots chase Shafiq
        const dx = shafiq.x - bot.x;
        const dy = shafiq.y - bot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          const speed = 6;
          const nx = (dx / dist) * speed;
          const ny = (dy / dist) * speed;

          let newX = bot.x + nx;
          let newY = bot.y + ny;

          if (!checkCollision(newX, bot.y, PLAYER_SIZE)) {
            bot.x = newX;
          }
          if (!checkCollision(bot.x, newY, PLAYER_SIZE)) {
            bot.y = newY;
          }
        }

        if (dist < 250) { // PROXIMITY_RADIUS
          if (Math.random() < 0.05 && !bot.isCalling) {
            bot.isCalling = true;
            io.to(room.roomId).emit('play_audio', { type: 'call', playerId: bot.id, role: bot.role });
            
            room.anger += 20;
            if (room.anger >= room.maxAnger) {
              room.status = 'GAME_OVER';
              room.winner = 'CHASERS';
              io.to(room.roomId).emit('game_state', room);
            }
            
            setTimeout(() => {
              if (room.players[bot.id]) bot.isCalling = false;
            }, 500);
          }
        }
      }
    });
  };

  // Game loop to broadcast state 20 times a second
  setInterval(() => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.status === 'PLAYING') {
        if (room.isPractice) {
          updateBots(room);
        }
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
