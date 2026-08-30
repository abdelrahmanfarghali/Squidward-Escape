import { io } from 'socket.io-client';

// In development we might be on a different port, but in AI Studio everything goes through port 3000
export const socket = io({
  autoConnect: false
});
