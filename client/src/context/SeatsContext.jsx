import { createContext, useContext, useEffect, useState } from 'react';
import socket from '../lib/socket';

const SeatsContext = createContext({ seats: {}, connected: false });

/** Keeps the latest { available, held } per event, pushed by the server over Socket.IO. */
export function SeatsProvider({ children }) {
  const [seats, setSeats] = useState({});
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onUpdate = (s) => setSeats((prev) => ({ ...prev, [s.eventId]: s }));
    const onUp = () => setConnected(true);
    const onDown = () => setConnected(false);
    socket.on('seats:update', onUpdate);
    socket.on('connect', onUp);
    socket.on('disconnect', onDown);
    return () => {
      socket.off('seats:update', onUpdate);
      socket.off('connect', onUp);
      socket.off('disconnect', onDown);
    };
  }, []);

  return <SeatsContext.Provider value={{ seats, connected }}>{children}</SeatsContext.Provider>;
}

export const useConnection = () => useContext(SeatsContext).connected;

/** Live seat numbers for an event; falls back to what the REST call returned. */
export function useLiveSeats(event) {
  const { seats } = useContext(SeatsContext);
  const live = seats[event.id];
  const available = live ? live.available : event.available_seats;
  const held = live ? live.held : event.held_seats || 0;
  const total = event.total_seats;
  return { available, held, total, bookable: Math.max(0, available - held) };
}
