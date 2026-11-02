const express = require('express');
const pool = require('../db');
const { requireAdmin, asyncHandler } = require('../middleware/auth');
const { getTiers } = require('../pricing');
const realtime = require('../realtime');

const router = express.Router();

const withLive = (e) => {
  const { tiers, note } = getTiers(e);
  return {
    ...e,
    held_seats: realtime.heldFor(e.id),
    current_price: tiers[0].price,
    pricing_note: note,
  };
};

function validateEvent(b) {
  const errors = [];
  const out = {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');

  out.title = str(b.title);
  if (!out.title || out.title.length > 255) errors.push('Title is required (max 255 characters).');
  out.description = str(b.description);
  out.location = str(b.location);
  if (!out.location || out.location.length > 255) errors.push('Location is required (max 255 characters).');

  const d = new Date(b.date);
  if (!b.date || Number.isNaN(d.getTime())) errors.push('A valid date and time is required.');
  else out.date = d;

  out.total_seats = Number(b.total_seats);
  if (!Number.isInteger(out.total_seats) || out.total_seats < 1 || out.total_seats > 100000) {
    errors.push('Total seats must be a whole number between 1 and 100000.');
  }
  out.price = Number(b.price);
  if (!Number.isFinite(out.price) || out.price < 0 || out.price > 9999999) errors.push('Price must be 0 or more.');
  out.img = str(b.img);
  if (out.img && !/^https?:\/\//i.test(out.img)) errors.push('Image must be an http(s) URL.');
  if (out.img.length > 500) errors.push('Image URL is too long.');
  return { errors, out };
}

// GET /events?search=&location=&from=&to=&upcoming=true&limit=
router.get('/', asyncHandler(async (req, res) => {
  const { search, location, from, to, limit } = req.query;
  const where = [];
  const params = [];

  if (req.query.upcoming !== 'false') {
    where.push('date >= ?');
    params.push(new Date());
  }
  if (search && String(search).trim()) {
    const like = `%${String(search).trim()}%`;
    where.push('(title LIKE ? OR description LIKE ? OR location LIKE ?)');
    params.push(like, like, like);
  }
  if (location && String(location).trim()) {
    where.push('location LIKE ?');
    params.push(`%${String(location).trim()}%`);
  }
  if (from && !Number.isNaN(new Date(from).getTime())) {
    where.push('date >= ?');
    params.push(new Date(from));
  }
  if (to && !Number.isNaN(new Date(to).getTime())) {
    where.push('date <= ?');
    params.push(new Date(to));
  }
  const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);
  const sql = `SELECT * FROM events ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY date ASC LIMIT ?`;
  const [rows] = await pool.query(sql, [...params, lim]);
  res.json(rows.map(withLive));
}));

// GET /events/locations -> distinct list for the filter dropdown
router.get('/locations', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT DISTINCT location FROM events WHERE date >= ? ORDER BY location', [new Date()]);
  res.json(rows.map((r) => r.location));
}));

// GET /events/:id
router.get('/:id(\\d+)', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Event not found.' });
  const { tiers, note } = getTiers(rows[0]);
  res.json({ ...withLive(rows[0]), tiers, pricing_note: note });
}));

// POST /events (admin)
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { errors, out } = validateEvent(req.body || {});
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  const [result] = await pool.query(
    `INSERT INTO events (title, description, location, date, total_seats, available_seats, price, img)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [out.title, out.description, out.location, out.date, out.total_seats, out.total_seats, out.price, out.img || null]
  );
  const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [result.insertId]);
  realtime.emit('events:changed', { id: result.insertId, action: 'created' });
  res.status(201).json(withLive(rows[0]));
}));

// PUT /events/:id (admin)
router.put('/:id(\\d+)', requireAdmin, asyncHandler(async (req, res) => {
  const { errors, out } = validateEvent(req.body || {});
  if (errors.length) return res.status(400).json({ message: errors[0], errors });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT total_seats, available_seats FROM events WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!rows[0]) {
      await conn.rollback();
      return res.status(404).json({ message: 'Event not found.' });
    }
    const booked = rows[0].total_seats - rows[0].available_seats;
    if (out.total_seats < booked) {
      await conn.rollback();
      return res.status(400).json({ message: `${booked} seats are already booked, so total seats can't go below ${booked}.` });
    }
    await conn.query(
      `UPDATE events SET title=?, description=?, location=?, date=?, total_seats=?, available_seats=?, price=?, img=? WHERE id=?`,
      [out.title, out.description, out.location, out.date, out.total_seats, out.total_seats - booked, out.price, out.img || null, req.params.id]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
  const [updated] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
  realtime.emit('events:changed', { id: Number(req.params.id), action: 'updated' });
  realtime.broadcastSeats(req.params.id);
  res.json(withLive(updated[0]));
}));

// DELETE /events/:id (admin) - bookings are removed by ON DELETE CASCADE
router.delete('/:id(\\d+)', requireAdmin, asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Event not found.' });
  realtime.emit('events:changed', { id: Number(req.params.id), action: 'deleted' });
  res.json({ message: 'Event deleted.' });
}));

module.exports = router;
