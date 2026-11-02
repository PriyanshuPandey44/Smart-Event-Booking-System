require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const realtime = require('./realtime');

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in .env (copy .env.example to .env).');
  process.exit(1);
}

const app = express();
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());

app.use(cors({ origin: origins }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'db_unreachable' });
  }
});

app.use('/auth', require('./routes/auth'));
app.use('/events', require('./routes/events'));
app.use('/bookings', require('./routes/bookings'));

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
});

const server = http.createServer(app);
realtime.init(server, origins);

const port = Number(process.env.PORT || 5000);
server.listen(port, () => console.log(`API + Socket.IO listening on :${port}`));
