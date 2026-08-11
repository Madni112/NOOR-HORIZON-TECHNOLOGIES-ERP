import io from 'socket.io-client';
import { Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080';

let socket: typeof Socket | null = null;

// Initialize Socket Connection
export const initializeSocket = (): void => {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      autoConnect: true,
      reconnectionAttempts: 10,
    });

    setupListeners();
  }
};

// Subscribe to an event
export const subscribeToEvent = (
  eventName: string,
  callback: (data: any) => void,
): void => {
  socket?.on(eventName, callback);
};

// Emit an event
export const emitEvent = (eventName: string, data: any): void => {
  socket?.emit(eventName, data);
};

export const subscribeToEvents = (
  events: string[],
  callback: (data: any) => void,
) => {
  events.forEach((event) => {
    socket?.on(event, callback);
  });
};

// Disconnect the socket
export const disconnectSocket = (): void => {
  socket?.disconnect();
};

// Setup default listeners
const setupListeners = (): void => {
  socket?.on('connect', () => {
    console.log('Connected to server:', socket?.id);
  });

  socket?.on('connect_error', (error: Error) => {
    console.error('Connection error:', error.message);
  });

  socket?.on('disconnect', () => {
    console.log('Disconnected from server');
  });
};
