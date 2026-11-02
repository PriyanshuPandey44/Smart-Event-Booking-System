const express = require('express');
const pool = require('../db');
const { requireAdmin, asyncHandler } = require('../middleware/auth');
const { getTiers, round2 } = require('../pricing');
const realtime = require('../realtime');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^\+?[0-9][0-9\s-]{6,14}$/;
const MAX_PER_BOOKING = 10;

const SELECT_BOOKING = `
  SELECT b.*, e.title AS event_title, e.location AS event_location, e.date AS event_date
  FROM bookings b JOIN events e ON e.id = b.event_id`;

const shape = (b) => ({
  ...b,
  ticket_code: `SEB-${String(b.id).padStart(6, '0')}`,
  unit_price: b.quantity ? round2(b.total_amount / b.quantity) : 0,
});

// POST /bookings  -> book tickets
router.post('/', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const eventId = Number(b.event_id);
  const quantity = Number(b.quantity);
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const mobile = String(b.mobile || '').trim();
  const ticketType = String(b.ticket_type || 'general');
  const lockId = typeof b.lock_id === 'string' ? b.lock_id : null;

  const errors = [];
  if (!Number.isInteger(eventId)) errors.push('Event is required.');
  if (name.length < 2 || name.length > 120) errors.push('Enter your full name.');
  if (!EMAIL_RE.test(email) || email.length > 160) errors.push('Enter a valid email address.');
  if (!MOBILE_RE.test(mobile)) errors.push('Enter a valid mobile number (7-15 digits).');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PER_BOOKING) {
    errors.push(`You can book 1 to ${MAX_PER_BOOKING} tickets at a time.`);
  }
  if (errors.length) return res.status(400).json({ message: errors[0], errors });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Row lock => two people can never take the same last seat
    const [rows] = await conn.query('SELECT * FROM events WHERE id = ? FOR UPDATE', [eventId]);
    const event = rows[0];
    if (!event) {
      await conn.rollback();
      return res.status(404).json({ message: 'Event not found.' });
    }
    if (new Date(event.date) < new Date()) {
      await conn.rollback();
      return res.status(400).json({ message: 'This event has already taken place.' });
    }
    const heldByOthers = realtime.heldFor(eventId, lockId);
    const free = event.available_seats - heldByOthers;
    if (quantity > free) {
      await conn.rollback();
      return res.status(409).json({
        message: free > 0
          ? `Only ${free} seat${free === 1 ? '' : 's'} left. Reduce the quantity and try again.`
          : 'Sorry, this event just sold out.',
      });
    }
    const tier = getTiers(event).tiers.find((t) => t.key === ticketType);
    if (!tier) {
      await conn.rollback();
      return res.status(400).json({ message: 'Unknown ticket category.' });
    }
    const total = round2(tier.price * quantity);

    await conn.query('UPDATE events SET available_seats = available_seats - ? WHERE id = ?', [quantity, eventId]);
    const [result] = await conn.query(
      `INSERT INTO bookings (event_id, name, email, mobile, quantity, ticket_type, total_amount, booking_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [eventId, name, email, mobile, quantity, tier.key, total, new Date()]
    );
    await conn.commit();

    if (lockId) realtime.removeLock(eventId, lockId);
    realtime.broadcastSeats(eventId);
    realtime.emit('bookings:changed', { eventId });

    const [created] = await pool.query(`${SELECT_BOOKING} WHERE b.id = ?`, [result.insertId]);
    res.status(201).json({ booking: shape(created[0]) });
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}));

// GET /bookings/stats  (admin)
router.get('/stats', requireAdmin, asyncHandler(async (req, res) => {
  const [[s]] = await pool.query(`
    SELECT COUNT(*) AS bookings,
           COALESCE(SUM(CASE WHEN status='confirmed' THEN quantity END), 0) AS tickets_sold,
           COALESCE(SUM(CASE WHEN status='confirmed' THEN total_amount END), 0) AS revenue,
           COALESCE(SUM(status='cancelled'), 0) AS cancelled
    FROM bookings`);
  const [[ev]] = await pool.query('SELECT COUNT(*) AS upcoming_events FROM events WHERE date >= ?', [new Date()]);
  res.json({
    bookings: Number(s.bookings),
    tickets_sold: Number(s.tickets_sold),
    revenue: Number(s.revenue),
    cancelled: Number(s.cancelled),
    upcoming_events: Number(ev.upcoming_events),
  });
}));

// GET /bookings (admin) ?event_id=
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const params = [];
  let sql = SELECT_BOOKING;
  if (req.query.event_id) {
    sql += ' WHERE b.event_id = ?';
    params.push(Number(req.query.event_id));
  }
  sql += ' ORDER BY b.booking_date DESC, b.id DESC LIMIT 500';
  const [rows] = await pool.query(sql, params);
  res.json(rows.map(shape));
}));

// GET /bookings/:id?email=  -> public ticket lookup (the QR code opens this)
router.get('/:id(\\d+)', asyncHandler(async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const [rows] = await pool.query(`${SELECT_BOOKING} WHERE b.id = ?`, [req.params.id]);
  if (!rows[0] || rows[0].email.toLowerCase() !== email) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }
  res.json({ booking: shape(rows[0]) });
}));

// PATCH /bookings/:id/cancel (admin) -> frees the seats again
router.patch('/:id(\\d+)/cancel', requireAdmin, asyncHandler(async (req, res) => {
  const conn = await pool.getConnection();
  let eventId;
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM bookings WHERE id = ? FOR UPDATE', [req.params.id]);
    const booking = rows[0];
    if (!booking) {
      await conn.rollback();
      return res.status(404).json({ message: 'Booking not found.' });
    }
    if (booking.status === 'cancelled') {
      await conn.rollback();
      return res.status(400).json({ message: 'This booking is already cancelled.' });
    }
    eventId = booking.event_id;
    await conn.query("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [booking.id]);
    await conn.query(
      'UPDATE events SET available_seats = LEAST(total_seats, available_seats + ?) WHERE id = ?',
      [booking.quantity, eventId]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
  realtime.broadcastSeats(eventId);
  realtime.emit('bookings:changed', { eventId });
  res.json({ message: 'Booking cancelled and seats released.' });
}));

module.exports = router;
