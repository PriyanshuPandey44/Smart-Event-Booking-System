import { io } from 'socket.io-client';
import { API_URL } from './api';

// One shared connection for live seat counts and seat holds.
const socket = io(API_URL, { transports: ['websocket', 'polling'] });
export default socket;
