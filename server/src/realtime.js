// Socket.IO: live seat counts + temporary seat locks (bonus feature).
//
// Locks live in memory (fine for a single server instance; use Redis to scale out).
// A socket can hold seats for ONE event at a time, for LOCK_TTL_MS.
const { Server } = require('socket.io');
const pool = require('./db');

const LOCK_TTL_MS = 5 * 60 * 1000;
const locks = new Map(); // eventId -> Map(socketId -> { qty, expiresAt })
let io = null;

function purgeExpired() {
  const expired = [];
  const now = Date.now();
  for (const [eventId, bySocket] of locks) {
    for (const [socketId, l] of bySocket) {
      if (l.expiresAt <= now) {
        bySocket.delete(socketId);
        expired.push({ eventId, socketId });
      }
    }
    if (!bySocket.size) locks.delete(eventId);
  }
  return expired;
}

/** Seats currently held by other people (optionally excluding one socket). */
function heldFor(eventId, excludeSocketId = null) {
  purgeExpired();
  const bySocket = locks.get(Number(eventId));
  if (!bySocket) return 0;
  let sum = 0;
  for (const [socketId, l] of bySocket) if (socketId !== excludeSocketId) sum += l.qty;
  return sum;
}

function removeLock(eventId, socketId) {
  const bySocket = locks.get(Number(eventId));
  if (!bySocket) return false;
  const had = bySocket.delete(socketId);
  if (!bySocket.size) locks.delete(Number(eventId));
  return had;
}

async function broadcastSeats(eventId) {
  if (!io) return;
  try {
    const [rows] = await pool.query('SELECT available_seats, total_seats FROM events WHERE id = ?', [eventId]);
    if (!rows[0]) return;
    io.emit('seats:update', {
      eventId: Number(eventId),
      available: rows[0].available_seats,
      total: rows[0].total_seats,
      held: heldFor(eventId),
    });
  } catch (err) {
    console.error('broadcastSeats failed', err.message);
  }
}

const emit = (name, payload) => io && io.emit(name, payload);

function init(httpServer, origins) {
  io = new Server(httpServer, { cors: { origin: origins, methods: ['GET', 'POST'] } });

  io.on('connection', (socket) => {
    socket.on('seats:lock', async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const eventId = Number(payload && payload.eventId);
        const qty = Number(payload && payload.quantity);
        if (!Number.isInteger(eventId) || !Number.isInteger(qty) || qty < 1 || qty > 10) {
          return reply({ ok: false, message: 'Invalid lock request.' });
        }
        const [rows] = await pool.query('SELECT available_seats FROM events WHERE id = ?', [eventId]);
        if (!rows[0]) return reply({ ok: false, message: 'Event not found.' });

        // Drop any previous lock held by this socket (on any event)
        for (const [eId, bySocket] of [...locks]) {
          if (bySocket.has(socket.id)) {
            removeLock(eId, socket.id);
            broadcastSeats(eId);
          }
        }
        const free = rows[0].available_seats - heldFor(eventId, socket.id);
        if (qty > free) {
          return reply({
            ok: false,
            message: free > 0
              ? `Only ${free} seat${free === 1 ? ' is' : 's are'} free right now (others are checking out).`
              : 'All remaining seats are being held by other people. Try again in a few minutes.',
          });
        }
        if (!locks.has(eventId)) locks.set(eventId, new Map());
        locks.get(eventId).set(socket.id, { qty, expiresAt: Date.now() + LOCK_TTL_MS });
        reply({ ok: true, ttlMs: LOCK_TTL_MS });
        broadcastSeats(eventId);
      } catch (err) {
        console.error('seats:lock failed', err);
        reply({ ok: false, message: 'Could not hold seats.' });
      }
    });

    socket.on('seats:release', (payload) => {
      const eventId = Number(payload && payload.eventId);
      if (removeLock(eventId, socket.id)) broadcastSeats(eventId);
    });

    socket.on('disconnect', () => {
      for (const [eventId, bySocket] of [...locks]) {
        if (bySocket.has(socket.id)) {
          removeLock(eventId, socket.id);
          broadcastSeats(eventId);
        }
      }
    });
  });

  // Free expired locks and tell the owner
  setInterval(() => {
    for (const { eventId, socketId } of purgeExpired()) {
      io.to(socketId).emit('lock:expired', { eventId });
      broadcastSeats(eventId);
    }
  }, 10000).unref();

  return io;
}

module.exports = { init, heldFor, removeLock, broadcastSeats, emit };
