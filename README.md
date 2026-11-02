# Convene: Smart Event Booking System (React + Node + MySQL)

Browse events, hold seats in real time, book tickets and download a QR ticket. Admins manage events and bookings.

```
client/   React (Vite) + Tailwind + Framer Motion + parallax landing page + PWA
server/   Node.js + Express + MySQL + Socket.IO
event_booking.sql   schema + sample data
```

## Features
- **Users:** list, search, filter by location and date; event details with Google Maps; 3 ticket categories with dynamic pricing (early-bird discount, demand surge); animated checkout; confetti + downloadable QR ticket on success; animated failure state.
- **Admin:** log in, create / update / delete events, view all bookings, cancel a booking (seats are released), revenue stats.
- **Real time:** live seat counts over Socket.IO. **Bonus:** seats are locked for 5 minutes while someone checks out, so two people can't buy the last seat.
- **Bonus:** installable PWA (manifest + service worker), deploy-ready (`vercel.json`, `_redirects`).

## Setup
Requirements: Node 18+, MySQL 8+.

1. **Database**
   ```bash
   cd server
   cp .env.example .env      # set DB_USER / DB_PASSWORD, JWT_SECRET, ADMIN_EMAIL / ADMIN_PASSWORD
   npm install
   npm run db:setup          # runs event_booking.sql (or: mysql -u root -p < ../event_booking.sql)
   npm run dev               # API + Socket.IO on http://localhost:5000
   ```
2. **Client**
   ```bash
   cd client
   cp .env.example .env      # VITE_API_URL=http://localhost:5000
   npm install
   npm run dev               # http://localhost:5173
   ```
3. Admin login: the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env` at `/admin/login`.

## API
| Method | Route | Notes |
|---|---|---|
| POST | /auth/login | returns admin JWT |
| GET | /events | `search`, `location`, `from`, `to` filters |
| GET | /events/:id | includes ticket tiers with live prices |
| POST / PUT / DELETE | /events, /events/:id | admin only |
| POST | /bookings | books tickets (transactional, prices recomputed on the server) |
| GET | /bookings, /bookings/stats | admin only |
| PATCH | /bookings/:id/cancel | admin only |

Socket events: `seats:update` (server to all), `seats:lock` / `seats:release` (client to server).

## Deployment
Backend on Render/Heroku with a hosted MySQL; set the env vars from `.env.example` and `CLIENT_URL` to your frontend URL. Frontend on Vercel/Netlify with `VITE_API_URL` pointing at the backend.

## Notes
- Landing page follows the structure of the reference site (full-screen hero, upcoming events, steps, pricing, call to action) with its own parallax visual design; adjust copy and imagery to taste.
- Seat locks are held in memory, which suits a single server instance; use Redis to scale out.
