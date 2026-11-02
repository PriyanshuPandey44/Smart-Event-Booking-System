import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { api } from '../lib/api';
import EventCard from '../components/EventCard';

const ridge = (d, fill) => <path d={d} fill={fill} />;

function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const sunY = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const far = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const mid = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[640px] overflow-hidden bg-gradient-to-b from-ink via-dusk to-glow">
      <motion.div style={{ y: sunY }} className="absolute left-1/2 top-[48%] h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-b from-[#FFD166] to-glow blur-[2px] sm:h-96 sm:w-96" aria-hidden />
      <motion.svg style={{ y: far }} className="absolute inset-x-0 bottom-0 h-[55%] w-full" viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden>
        {ridge('M0 220 L180 120 L320 210 L520 70 L720 200 L900 100 L1100 220 L1280 130 L1440 210 L1440 400 L0 400Z', '#3B2F8F')}
      </motion.svg>
      <motion.svg style={{ y: mid }} className="absolute inset-x-0 bottom-0 h-[42%] w-full" viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden>
        {ridge('M0 170 L220 80 L400 160 L640 40 L860 170 L1080 70 L1260 150 L1440 90 L1440 300 L0 300Z', '#2A2F6B')}
      </motion.svg>
      <svg className="absolute inset-x-0 bottom-0 h-[28%] w-full" viewBox="0 0 1440 200" preserveAspectRatio="none" aria-hidden>
        {ridge('M0 120 L260 40 L480 110 L760 20 L1000 120 L1240 50 L1440 110 L1440 200 L0 200Z', '#121638')}
      </svg>
      <motion.div style={{ y: textY, opacity: fade }} className="container-x relative z-10 flex h-full flex-col justify-center pb-24 pt-16 text-white">
        <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-3xl text-5xl font-extrabold leading-[1.02] sm:text-7xl">
          The night worth leaving the house for.
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} className="mt-5 max-w-xl text-lg text-white/85">
          Concerts, summits, comedy and workshops. Watch seats fill in real time, hold yours while you check out, and walk in with a QR code.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-8 flex flex-wrap gap-3">
          <Link to="/events" className="btn btn-primary">Browse events</Link>
          <a href="#how" className="btn border border-white/40 text-white hover:bg-white/10">How it works</a>
        </motion.div>
      </motion.div>
    </section>
  );
}

const steps = [
  { t: 'Find your event', d: 'Search by name, filter by city or pick a date.' },
  { t: 'Hold your seats', d: 'Choose a ticket type. Your seats are held for five minutes while you check out.' },
  { t: 'Get your QR ticket', d: 'Pay once, then download a ticket you can scan at the door.' },
];

export default function Home() {
  const [events, setEvents] = useState(null);
  useEffect(() => { api.listEvents({ limit: 3 }).then(setEvents).catch(() => setEvents([])); }, []);

  return (
    <>
      <Hero />
      <section className="container-x py-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Coming up soon</h2>
          <Link to="/events" className="text-sm font-bold text-dusk hover:underline">See all events</Link>
        </div>
        <motion.div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} transition={{ staggerChildren: 0.12 }}>
          {events === null && [0, 1, 2].map((i) => <div key={i} className="h-96 animate-pulse rounded-2xl bg-line" />)}
          {events?.map((e) => <EventCard key={e.id} event={e} />)}
          {events?.length === 0 && <p className="text-ink/70">No upcoming events yet. Check back soon.</p>}
        </motion.div>
      </section>

      <section id="how" className="bg-white py-20">
        <div className="container-x">
          <h2 className="text-3xl font-extrabold sm:text-4xl">From search to seat in three steps</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.t} className="border-t-4 border-ink pt-5">
                <span className="font-display text-5xl font-extrabold text-glow">{i + 1}</span>
                <h3 className="mt-2 text-xl font-bold">{s.t}</h3>
                <p className="mt-1 text-ink/70">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-x py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Three ticket types, fair prices</h2>
            <p className="mt-3 max-w-md text-ink/70">General, VIP and Premium on every event. Early bookers get a discount; when an event is more than half full, prices rise a little with demand.</p>
          </div>
          <div className="grid gap-3">
            {[['General', 'Standard entry, open seating', 'Base price'], ['VIP', 'Priority entry, front-section seats, welcome drink', '1.75x'], ['Premium', 'Fast-track, reserved front row, meet & greet', '2.5x']].map(([n, d, p]) => (
              <div key={n} className="flex items-center justify-between rounded-2xl bg-white p-5 ring-1 ring-line">
                <div><p className="font-display text-lg font-bold">{n}</p><p className="text-sm text-ink/70">{d}</p></div>
                <span className="font-display text-lg font-extrabold text-dusk">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-16 text-center text-white">
        <h2 className="text-3xl font-extrabold">Running an event?</h2>
        <p className="mx-auto mt-2 max-w-md text-white/70">Create events, track bookings and see revenue from one dashboard.</p>
        <Link to="/admin/login" className="btn btn-primary mt-6">Open the dashboard</Link>
      </section>
    </>
  );
}
