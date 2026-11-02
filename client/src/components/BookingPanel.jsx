import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import socket from '../lib/socket';
import { api } from '../lib/api';
import { money } from '../lib/format';
import Ticket from './Ticket';

const MAX_PER_BOOKING = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^\+?[0-9][0-9\s-]{6,14}$/;

const slide = {
  initial: { opacity: 0, x: 36 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.28 } },
  exit: { opacity: 0, x: -36, transition: { duration: 0.18 } },
};
const fieldsContainer = { show: { transition: { staggerChildren: 0.07 } } };
const fieldItem = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#FF4D8D', '#7DD3FC', '#3B2F8F', '#ffffff', '#FFD166'];
  const end = Date.now() + 1400;
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors });
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function BookingPanel({ event, bookable, available }) {
  const [step, setStep] = useState('select'); // select | details | success | failure
  const [tierKey, setTierKey] = useState('general');
  const [qty, setQty] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', mobile: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const [booking, setBooking] = useState(null);
  const [lockEnds, setLockEnds] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const locked = useRef(false);

  const tier = event.tiers.find((t) => t.key === tierKey) || event.tiers[0];
  const maxQty = Math.max(1, Math.min(MAX_PER_BOOKING, step === 'select' ? bookable : available));
  const total = tier.price * qty;
  const eventOver = new Date(event.date) < new Date();

  const release = useCallback(() => {
    if (locked.current) {
      socket.emit('seats:release', { eventId: event.id });
      locked.current = false;
    }
    setLockEnds(null);
  }, [event.id]);

  // Give seats back if the person leaves the page
  useEffect(() => () => {
    if (locked.current) socket.emit('seats:release', { eventId: event.id });
  }, [event.id]);

  // Keep quantity inside what is actually bookable
  useEffect(() => {
    if (step === 'select' && qty > maxQty) setQty(maxQty);
  }, [maxQty, qty, step]);

  // Hold countdown
  useEffect(() => {
    if (!lockEnds) return undefined;
    const tick = () => {
      const s = Math.max(0, Math.ceil((lockEnds - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s === 0) {
        release();
        setStep('select');
        setNotice('Your seat hold expired. Choose your tickets again to keep going.');
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lockEnds, release]);

  // Server told us the hold ran out
  useEffect(() => {
    const onExpired = ({ eventId }) => {
      if (eventId !== event.id) return;
      locked.current = false;
      setLockEnds(null);
      setStep((s) => (s === 'details' ? 'select' : s));
      setNotice('Your seat hold expired. Choose your tickets again to keep going.');
    };
    socket.on('lock:expired', onExpired);
    return () => socket.off('lock:expired', onExpired);
  }, [event.id]);

  const reserve = () => {
    setNotice('');
    if (!socket.connected) { setStep('details'); return; } // works without live holds, server still protects stock
    setBusy(true);
    socket.timeout(5000).emit('seats:lock', { eventId: event.id, quantity: qty }, (err, res) => {
      setBusy(false);
      if (err || !res) { setStep('details'); return; }
      if (!res.ok) { setNotice(res.message); return; }
      locked.current = true;
      setLockEnds(Date.now() + res.ttlMs);
      setStep('details');
    });
  };

  const back = () => { release(); setStep('select'); setErrors({}); };

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter your full name.';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (!MOBILE_RE.test(form.mobile.trim())) e.mobile = 'Enter a valid mobile number (7-15 digits).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const { booking: created } = await api.book({
        event_id: event.id,
        ...form,
        quantity: qty,
        ticket_type: tier.key,
        lock_id: socket.id || null,
      });
      locked.current = false;
      setLockEnds(null);
      setBooking(created);
      setStep('success');
      celebrate();
    } catch (err) {
      release();
      setFailure(err.message);
      setStep('failure');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setStep('select'); setBooking(null); setForm({ name: '', email: '', mobile: '' }); setQty(1); setNotice(''); setFailure(''); };

  const setField = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  if (eventOver) {
    return <div className="rounded-2xl bg-white p-6 ring-1 ring-line"><h2 className="text-xl font-bold">This event has ended</h2><p className="mt-1 text-sm text-ink/70">Ticket sales are closed.</p></div>;
  }

  return (
    <section aria-label="Book tickets" className="overflow-hidden rounded-2xl bg-white p-6 shadow-lift ring-1 ring-line">
      <AnimatePresence mode="wait" initial={false}>
        {step === 'select' && (
          <motion.div key="select" {...slide}>
            <h2 className="text-xl font-bold">Choose your tickets</h2>
            {event.pricing_note === 'early_bird' && <p className="mt-1 text-sm font-medium text-dusk">Early-bird pricing is on: 10% off until half the seats are gone.</p>}
            {event.pricing_note === 'high_demand' && <p className="mt-1 text-sm font-medium text-glow">Demand is high, so prices rise as the last seats go.</p>}

            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Ticket category</legend>
              {event.tiers.map((t) => (
                <label key={t.key} className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border-2 p-3 transition ${tierKey === t.key ? 'border-ink bg-mist' : 'border-line hover:border-ink/40'}`}>
                  <span className="flex items-start gap-3">
                    <input type="radio" name="tier" value={t.key} checked={tierKey === t.key} onChange={() => setTierKey(t.key)} className="mt-1 accent-[#FF4D8D]" />
                    <span>
                      <span className="block font-bold">{t.label}</span>
                      <span className="block text-xs text-ink/65">{t.perks.join(', ')}</span>
                    </span>
                  </span>
                  <motion.span key={t.price} initial={{ opacity: 0.4, y: -6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-lg font-extrabold">{money(t.price)}</motion.span>
                </label>
              ))}
            </fieldset>

            <div className="mt-5 flex items-center justify-between">
              <span className="font-bold" id="qty-label">Tickets</span>
              <div className="flex items-center gap-3" role="group" aria-labelledby="qty-label">
                <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg font-bold hover:border-ink disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Fewer tickets">-</button>
                <motion.span key={qty} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="w-6 text-center font-display text-xl font-extrabold" aria-live="polite">{qty}</motion.span>
                <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg font-bold hover:border-ink disabled:opacity-40" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty || bookable === 0} aria-label="More tickets">+</button>
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
              <span className="text-sm text-ink/70">Total</span>
              <motion.span key={total} initial={{ opacity: 0.4, y: -8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl font-extrabold">{money(total)}</motion.span>
            </div>

            {notice && <p role="alert" className="mt-3 rounded-xl bg-glow/10 p-3 text-sm font-medium text-ink">{notice}</p>}
            <button className="btn btn-primary mt-4 w-full" onClick={reserve} disabled={busy || bookable === 0}>
              {bookable === 0 ? (available === 0 ? 'Sold out' : 'All seats on hold') : busy ? 'Holding your seats...' : 'Continue to checkout'}
            </button>
            <p className="mt-2 text-center text-xs text-ink/55">We hold your seats for 5 minutes while you check out.</p>
          </motion.div>
        )}

        {step === 'details' && (
          <motion.form key="details" {...slide} onSubmit={submit} noValidate>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Your details</h2>
                <p className="text-sm text-ink/70">{qty} x {tier.label} for {money(total)}</p>
              </div>
              {lockEnds && (
                <div className={`rounded-full px-3 py-1 text-xs font-bold ${secondsLeft <= 60 ? 'bg-glow text-white' : 'bg-mist text-ink'}`} role="timer" aria-label="Seat hold time left">
                  Held {mmss(secondsLeft)}
                </div>
              )}
            </div>
            <motion.div variants={fieldsContainer} initial="hidden" animate="show" className="mt-4 space-y-3">
              {[
                ['name', 'Full name', 'text', 'name', 'Asha Verma'],
                ['email', 'Email', 'email', 'email', 'asha@example.com'],
                ['mobile', 'Mobile number', 'tel', 'tel', '98765 43210'],
              ].map(([key, label, type, auto, ph]) => (
                <motion.div key={key} variants={fieldItem}>
                  <label className="label" htmlFor={`f-${key}`}>{label}</label>
                  <input id={`f-${key}`} className={`field ${errors[key] ? '!border-glow' : ''}`} type={type} autoComplete={auto} placeholder={ph} value={form[key]} onChange={setField(key)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `e-${key}` : undefined} />
                  {errors[key] && <p id={`e-${key}`} className="mt-1 text-xs font-bold text-glow">{errors[key]}</p>}
                </motion.div>
              ))}
            </motion.div>
            <div className="mt-5 flex gap-3">
              <button type="button" className="btn btn-ghost" onClick={back} disabled={busy}>Back</button>
              <button type="submit" className="btn btn-primary flex-1" disabled={busy}>{busy ? 'Booking...' : `Pay ${money(total)}`}</button>
            </div>
            <p className="mt-2 text-center text-xs text-ink/55">Demo checkout: no real payment is taken.</p>
          </motion.form>
        )}

        {step === 'success' && booking && (
          <motion.div key="success" {...slide} className="text-center">
            <svg viewBox="0 0 52 52" className="mx-auto h-16 w-16" aria-hidden="true">
              <motion.circle cx="26" cy="26" r="24" fill="none" stroke="#10b981" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
              <motion.path d="M15 27l8 8 14-16" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.4 }} />
            </svg>
            <h2 className="mt-3 text-2xl font-extrabold">You're in, {booking.name.split(' ')[0]}!</h2>
            <p className="mt-1 text-sm text-ink/70">Your tickets are confirmed. Download the QR ticket and show it at the entrance.</p>
            <div className="mt-5 text-left"><Ticket booking={booking} /></div>
            <button className="btn btn-ghost mt-3 w-full" onClick={reset}>Book more tickets</button>
          </motion.div>
        )}

        {step === 'failure' && (
          <motion.div key="failure" {...slide} className="text-center">
            <motion.div animate={{ x: [0, -14, 14, -10, 10, -4, 4, 0] }} transition={{ duration: 0.6 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-glow/15">
              <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="#FF4D8D" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </motion.div>
            <h2 className="mt-3 text-2xl font-extrabold">Booking didn't go through</h2>
            <p role="alert" className="mt-1 text-sm text-ink/75">{failure}</p>
            <p className="mt-1 text-xs text-ink/55">You haven't been charged.</p>
            <button className="btn btn-dark mt-5 w-full" onClick={reset}>Try again</button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
