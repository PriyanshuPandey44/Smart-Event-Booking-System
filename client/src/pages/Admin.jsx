import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLiveSeats } from '../context/SeatsContext';
import { fmtDateTime, money } from '../lib/format';
import EventFormModal from '../components/EventFormModal';

function Seats({ event }) {
  const s = useLiveSeats(event);
  return <>{s.available} / {s.total}</>;
}

export default function Admin() {
  const { isAdmin, logout } = useAuth();
  const [tab, setTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [modal, setModal] = useState(null); // null | 'new' | event
  const [msg, setMsg] = useState('');

  const guard = useCallback((err) => { if (err.status === 401) logout(); else setMsg(err.message); }, [logout]);
  const load = useCallback(() => {
    api.listEvents({ upcoming: 'false' }).then(setEvents).catch(guard);
    api.listBookings().then(setBookings).catch(guard);
    api.stats().then(setStats).catch(guard);
  }, [guard]);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);
  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  const save = async (body) => {
    if (modal === 'new') await api.createEvent(body); else await api.updateEvent(modal.id, body);
    setModal(null); setMsg(modal === 'new' ? 'Event created.' : 'Event updated.'); load();
  };
  const remove = async (e) => {
    if (!window.confirm(`Delete "${e.title}" and all its bookings? This can't be undone.`)) return;
    try { await api.deleteEvent(e.id); setMsg('Event deleted.'); load(); } catch (err) { guard(err); }
  };
  const cancel = async (b) => {
    if (!window.confirm(`Cancel booking ${b.ticket_code} for ${b.name}? The seats will be released.`)) return;
    try { await api.cancelBooking(b.id); setMsg('Booking cancelled and seats released.'); load(); } catch (err) { guard(err); }
  };

  const cards = stats && [
    ['Upcoming events', stats.upcoming_events], ['Tickets sold', stats.tickets_sold],
    ['Revenue', money(stats.revenue)], ['Cancelled bookings', stats.cancelled],
  ];

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-extrabold">Dashboard</h1>
        <button className="btn btn-primary" onClick={() => setModal('new')}>New event</button>
      </div>
      {msg && <p role="status" className="mt-4 rounded-xl bg-white p-3 text-sm font-bold ring-1 ring-line" onClick={() => setMsg('')}>{msg}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(cards || [0, 1, 2, 3].map(() => ['', ''])).map(([l, v], i) => (
          <div key={i} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <p className="text-sm text-ink/70">{l || '\u00a0'}</p>
            <p className="font-display text-3xl font-extrabold">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-2" role="tablist">
        {[['events', 'Events'], ['bookings', 'Bookings']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`btn ${tab === k ? 'btn-dark' : 'btn-ghost'} !py-2`}>{l}</button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        {tab === 'events' ? (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-ink/70"><tr><th className="p-4">Event</th><th>Date</th><th>Seats left</th><th>Base price</th><th className="pr-4 text-right">Actions</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="p-4"><p className="font-bold">{e.title}</p><p className="text-ink/60">{e.location}</p></td>
                  <td>{fmtDateTime(e.date)}</td><td><Seats event={e} /></td><td>{money(e.price)}</td>
                  <td className="pr-4 text-right">
                    <button className="btn btn-ghost !px-4 !py-1.5" onClick={() => setModal(e)}>Edit</button>{' '}
                    <button className="btn btn-ghost !px-4 !py-1.5 !text-glow" onClick={() => remove(e)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!events.length && <tr><td colSpan="5" className="p-8 text-center text-ink/70">No events yet. Create your first one.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line text-ink/70"><tr><th className="p-4">Ticket</th><th>Customer</th><th>Event</th><th>Qty</th><th>Amount</th><th>Status</th><th className="pr-4 text-right">Actions</th></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0">
                  <td className="p-4 font-bold">{b.ticket_code}</td>
                  <td>{b.name}<p className="text-ink/60">{b.email}</p></td>
                  <td>{b.event_title}</td><td>{b.quantity}</td><td>{money(b.total_amount)}</td>
                  <td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-line text-ink/70'}`}>{b.status}</span></td>
                  <td className="pr-4 text-right">{b.status === 'confirmed' && <button className="btn btn-ghost !px-4 !py-1.5" onClick={() => cancel(b)}>Cancel</button>}</td>
                </tr>
              ))}
              {!bookings.length && <tr><td colSpan="7" className="p-8 text-center text-ink/70">No bookings yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {modal && <EventFormModal event={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={save} />}
      </AnimatePresence>
    </div>
  );
}
