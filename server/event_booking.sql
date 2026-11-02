-- Smart Event Booking System - schema + sample data
-- Works on MySQL 8.0.16+ and MariaDB 10.2+
-- Run:  mysql -u root -p < event_booking.sql     (or: npm run db:setup)

CREATE DATABASE IF NOT EXISTS event_booking
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE event_booking;

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS events;

CREATE TABLE events (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(255)  NOT NULL,
  description     TEXT,
  location        VARCHAR(255)  NOT NULL,
  date            DATETIME      NOT NULL,            -- stored in UTC
  total_seats     INT UNSIGNED  NOT NULL,
  available_seats INT UNSIGNED  NOT NULL,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- base (General) price
  img             VARCHAR(500)  NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_seats CHECK (available_seats <= total_seats),
  INDEX idx_events_date (date),
  INDEX idx_events_location (location)
) ENGINE=InnoDB;

CREATE TABLE bookings (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id     INT UNSIGNED  NOT NULL,
  name         VARCHAR(120)  NOT NULL,
  email        VARCHAR(160)  NOT NULL,
  mobile       VARCHAR(20)   NOT NULL,
  quantity     INT UNSIGNED  NOT NULL,
  ticket_type  VARCHAR(20)   NOT NULL DEFAULT 'general',  -- extra column: general | vip | premium
  total_amount DECIMAL(10,2) NOT NULL,
  booking_date DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status       ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  CONSTRAINT fk_bookings_event FOREIGN KEY (event_id)
    REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_bookings_event (event_id),
  INDEX idx_bookings_email (email)
) ENGINE=InnoDB;

-- Sample events (dates are relative to "now" so they are always upcoming)
INSERT INTO events (title, description, location, date, total_seats, available_seats, price, img) VALUES
('Bengaluru DevSummit 2026',
 'Two tracks, forty talks and one very large chai queue. Hear from engineers building developer tools, cloud infrastructure and applied AI, then stay for the evening hack lounge.',
 'Bengaluru, Karnataka', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 9 DAY), 400, 112, 1499.00,
 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=70'),
('Lucknow Sufi Nights',
 'An open-air evening of qawwali and ghazals on the banks of the Gomti, with food stalls from across the city.',
 'Lucknow, Uttar Pradesh', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 14 DAY), 250, 231, 799.00,
 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=70'),
('Mumbai Startup Pitch Day',
 'Twenty early-stage founders pitch to a panel of investors. Includes a networking lunch and a mentor hour.',
 'Mumbai, Maharashtra', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 21 DAY), 180, 24, 999.00,
 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=70'),
('Delhi Design Week',
 'Workshops, studio visits and a gallery night celebrating product, graphic and spatial design.',
 'New Delhi, Delhi', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 33 DAY), 300, 300, 1299.00,
 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=70'),
('Goa Sunset Beats',
 'Four DJs, one beach, and a sunset set that starts at golden hour. 18+ only.',
 'Goa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 40 DAY), 600, 389, 2499.00,
 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=70'),
('Hyderabad AI & Data Conference',
 'A one-day conference on machine learning in production: data pipelines, evaluation, and responsible deployment.',
 'Hyderabad, Telangana', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 47 DAY), 350, 350, 1799.00,
 'https://images.unsplash.com/photo-1475721027785-f74eca89e4e0?auto=format&fit=crop&w=1200&q=70'),
('Jaipur Literature Brunch',
 'Authors read, readers talk. A relaxed Sunday brunch with three short readings and a book swap.',
 'Jaipur, Rajasthan', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 55 DAY), 120, 87, 599.00,
 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=70'),
('Pune Indie Music Fest',
 'Eleven independent bands across two stages. Bring a friend, leave with a new favourite playlist.',
 'Pune, Maharashtra', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 62 DAY), 500, 470, 899.00,
 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=70');

-- A couple of sample bookings so the admin dashboard has data
INSERT INTO bookings (event_id, name, email, mobile, quantity, ticket_type, total_amount, booking_date, status) VALUES
(1, 'Aarav Sharma', 'aarav@example.com', '9876543210', 2, 'general', 2998.00, UTC_TIMESTAMP(), 'confirmed'),
(3, 'Meera Iyer',   'meera@example.com', '9123456780', 1, 'vip',     1748.00, UTC_TIMESTAMP(), 'confirmed');
