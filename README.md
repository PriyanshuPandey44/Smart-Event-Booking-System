# Convene: Smart Event Booking System

Browse events, watch seat counts change live, hold your seats while you check out, and walk in with a downloadable QR ticket. Organisers log in to create and manage events and to track bookings.

**Stack:** React (Vite) · Tailwind CSS · Framer Motion · Node.js · Express · MySQL · Socket.IO

---

## Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [API reference](#api-reference)
- [How it works](#how-it-works)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Known limitations and next steps](#known-limitations-and-next-steps)

---

## Features

### For visitors
- Browse upcoming events with **search** and **filters by location and date**
- Event details page with description, **Google Maps** location and ticket categories
- **Three ticket categories** (General, VIP, Premium) with **dynamic pricing**
- **Real-time seat availability** on every event card and details page
- Animated checkout, then a **confetti success screen** with a **downloadable QR ticket**
- Animated **failure state** that explains what went wrong
- Parallax landing page

### For admins
- Secure login (JWT)
- Create, update and delete events
- View all bookings and **cancel a booking** (its seats go back on sale)
- Dashboard numbers: revenue, tickets sold, bookings, upcoming events

### Bonus challenges completed
- **Seat locking over WebSockets:** seats are held for 5 minutes while someone checks out
- **Installable PWA:** web manifest and service worker
- **Deploy-ready:** `vercel.json` and `_redirects` for the frontend, env-based config for the backend

---

## Screenshots

> Add your screenshots to a `docs/screenshots/` folder and uncomment the lines below.

<!--
| Landing | Events | Booking success |
|---|---|---|
| ![Landing](docs/screenshots/landing.png) | ![Events](docs/screenshots/events.png) | ![Success](docs/screenshots/success.png) |

| Event details | Admin dashboard |
|---|---|
| ![Details](docs/screenshots/details.png) | ![Admin](docs/screenshots/admin.png) |
-->

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Tailwind CSS, Framer Motion, canvas-confetti, qrcode |
| Backend | Node.js, Express, mysql2, jsonwebtoken, Socket.IO |
| Database | MySQL 8 (MariaDB 10.2+ also works) |
| Real time | Socket.IO (live seat counts and seat holds) |

---

## Project structure

```
Smart-Event-Booking-System/
├── client/                      React app
│   ├── public/                  manifest, service worker, icon, _redirects
│   └── src/
│       ├── components/          Navbar, EventCard, SeatMeter, BookingPanel, Ticket, ...
│       ├── context/             Auth and live-seats providers
│       ├── lib/                 API client, socket connection, formatters
│       └── pages/               Home, Events, EventDetails, TicketPage, Admin, AdminLogin
└── server/                      Express API
    ├── event_booking.sql        database schema + sample data
    ├── scripts/setup-db.js      runs the SQL file for you
    └── src/
        ├── index.js             app entry (Express + Socket.IO)
        ├── db.js                MySQL connection pool
        ├── pricing.js           ticket categories and dynamic pricing
        ├── realtime.js          live seat updates and seat locks
        ├── middleware/auth.js   admin JWT check
        └── routes/              auth.js, events.js, bookings.js
```

---

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org) 18 or newer
- [MySQL](https://dev.mysql.com/downloads/) 8 or newer, running locally

### 1. Clone
```bash
git clone https://github.com/PriyanshuPandey44/Smart-Event-Booking-System.git
cd Smart-Event-Booking-System
```

### 2. Set up the server
```bash
cd server
cp .env.example .env        # Windows: copy .env.example .env
```
Open `server/.env` and set `DB_PASSWORD` to your MySQL password. Then:
```bash
npm install
npm run db:setup            # creates the database, tables and sample events
npm run dev                 # API + Socket.IO on http://localhost:5000
```
Keep this terminal running.

### 3. Set up the client
In a second terminal:
```bash
cd client
cp .env.example .env        # Windows: copy .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Open **http://localhost:5173**.

### Admin login
Go to `/admin/login` and sign in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `server/.env`. The defaults in `.env.example` are `admin@convene.test` and `admin123`. Change them before deploying.

### Scripts

| Where | Command | What it does |
|---|---|---|
| server | `npm run dev` | Start the API with auto-restart |
| server | `npm start` | Start the API (production) |
| server | `npm run db:setup` | Create the database and load sample data (**resets existing tables**) |
| client | `npm run dev` | Start the Vite dev server |
| client | `npm run build` | Production build into `dist/` |
| client | `npm run preview` | Preview the production build |

---

## Environment variables

### `server/.env`

| Variable | Example | Purpose |
|---|---|---|
| `PORT` | `5000` | API port |
| `CLIENT_URL` | `http://localhost:5173` | Allowed frontend origin(s) for CORS and Socket.IO. Separate several with commas. |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | `your_password` | MySQL password |
| `DB_NAME` | `event_booking` | Database name |
| `JWT_SECRET` | long random string | Signs admin login tokens. **Required.** |
| `ADMIN_EMAIL` | `admin@convene.test` | Admin login email |
| `ADMIN_PASSWORD` | `admin123` | Admin login password |

### `client/.env`

| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | Where the frontend finds the API and Socket.IO server |

> `.env` files are git-ignored. Never commit real passwords or secrets.

---

## Database

Defined in [`server/event_booking.sql`](server/event_booking.sql). Run it with `npm run db:setup`, or manually:
```bash
mysql -u root -p < server/event_booking.sql
```

```
events                              bookings
─────────────────────────           ─────────────────────────────
id (PK)                             id (PK)
title                               event_id (FK → events.id, ON DELETE CASCADE)
description                         name
location                            email
date  (stored in UTC)               mobile
total_seats                         quantity
available_seats                     ticket_type   general | vip | premium
price (base / General price)        total_amount
img                                 booking_date
created_at                          status        confirmed | cancelled
```

- `ticket_type` is one extra column on top of the required schema. It records which category was bought.
- Deleting an event also deletes its bookings (`ON DELETE CASCADE`).
- The SQL file includes 8 sample events with dates relative to "now", so they are always upcoming.

---

## API reference

Admin routes need the header `Authorization: Bearer <token>`, where the token comes from `POST /auth/login`.

### Auth
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Body `{ email, password }`, returns `{ token }` |

### Events
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/events` | Public | List events. Query: `search`, `location`, `from`, `to` (ISO dates), `upcoming=false`, `limit` |
| GET | `/events/locations` | Public | Distinct locations for the filter dropdown |
| GET | `/events/:id` | Public | Event details with ticket tiers and current prices |
| POST | `/events` | Admin | Create an event |
| PUT | `/events/:id` | Admin | Update an event (seats already booked are preserved) |
| DELETE | `/events/:id` | Admin | Delete an event |

### Bookings
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/bookings` | Public | Book tickets. Body: `event_id`, `name`, `email`, `mobile`, `quantity`, `ticket_type` |
| GET | `/bookings/:id?email=` | Public | Look up a ticket (opened by the QR code) |
| GET | `/bookings` | Admin | List all bookings |
| GET | `/bookings/stats` | Admin | Revenue, tickets sold, bookings, upcoming events |
| PATCH | `/bookings/:id/cancel` | Admin | Cancel a booking and release its seats |

### Socket.IO events

| Event | Direction | Purpose |
|---|---|---|
| `seats:update` | server → all clients | New seat counts for an event |
| `events:changed` | server → all clients | An event was created, edited or deleted |
| `bookings:changed` | server → all clients | A booking was made or cancelled |
| `seats:lock` | client → server | Hold seats while checking out |
| `seats:release` | client → server | Give held seats back |
| `lock:expired` | server → client | Your 5-minute hold ran out |

---

## How it works

### Dynamic pricing
Prices are calculated on the server in `server/src/pricing.js`, and the booking route recalculates them, so the browser can't change what it pays.

| Category | Price |
|---|---|
| General | base price |
| VIP | 1.75 × base |
| Premium | 2.5 × base |

Then a demand adjustment applies to all categories:
- **High demand:** once 50% or more of seats are sold, prices rise linearly up to **+30%** as the event sells out.
- **Early bird:** while under 50% is sold and the event is 30+ days away, prices are **10% lower**.

### Preventing double-booking
Booking runs inside a database transaction that locks the event row (`SELECT ... FOR UPDATE`), checks the seats left, reduces them and saves the booking in one step. Two people can never take the same last seat, even if they click at the same moment.

### Seat locking
1. A user clicks **Continue to checkout**. The client sends `seats:lock`.
2. The server holds those seats for **5 minutes** and broadcasts the new count. Other users see them as unavailable.
3. The hold is released when the booking completes, the user goes back or leaves, or the time runs out.

### Real-time updates
Every booking, cancellation, hold and admin edit triggers a Socket.IO broadcast, so seat meters and the event list update without a refresh.

---

## Deployment

**Backend (Render, Railway, Heroku)**
1. Create a hosted MySQL database and run `server/event_booking.sql` against it once.
2. Create a web service with root directory `server`, build command `npm install`, start command `npm start`.
3. Set the variables from the table above. Set `CLIENT_URL` to your frontend URL.

**Frontend (Vercel, Netlify)**
1. Root directory `client`, build command `npm run build`, output directory `dist`.
2. Set `VITE_API_URL` to your backend URL.
3. SPA routing is already handled by `vercel.json` and `public/_redirects`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Access denied for user 'root'` | `DB_USER` or `DB_PASSWORD` in `server/.env` is wrong. |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL isn't running. Start the MySQL service. |
| `Missing JWT_SECRET in .env` | Create `server/.env` from `.env.example`. |
| `EADDRINUSE :5000` | Port 5000 is taken. Change `PORT` in `server/.env` and `VITE_API_URL` in `client/.env`. |
| Page loads but no events | The server isn't running, or `VITE_API_URL` points to the wrong address. |
| "Offline" badge instead of "Live" | The client can't reach Socket.IO. Check the server is running and `CLIENT_URL` matches the frontend URL. |
| `npm run db:setup` wiped my data | It drops and recreates both tables by design. Only run it on a fresh setup. |

---

## Known limitations and next steps

- **Payment is a demo.** No real payment is taken. A gateway such as Razorpay or Stripe would be the next step.
- **Seat holds live in server memory,** which suits a single server instance. To run several instances, move holds to Redis with the Socket.IO Redis adapter.
- **Tickets are downloaded, not emailed.** Email delivery of tickets is a natural addition.
- Ideas: seat-map selection, image upload for events, booking history for users, and automated tests.

---

## Author

**Priyanshu Pandey** · [GitHub](https://github.com/PriyanshuPandey44)
