import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../lib/api';
import { dayRange } from '../lib/format';
import EventCard from '../components/EventCard';

const grid = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

export default function Events() {
  const [filters, setFilters] = useState({ search: '', location: '', date: '' });
  const [events, setEvents] = useState(null);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => { api.locations().then(setLocations).catch(() => {}); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = { search: filters.search, location: filters.location };
      if (filters.date) Object.assign(params, dayRange(filters.date));
      api.listEvents(params).then((d) => { setEvents(d); setError(''); }).catch((e) => setError(e.message));
    }, 250); // debounce typing
    return () => clearTimeout(t);
  }, [filters]);

  const clear = () => setFilters({ search: '', location: '', date: '' });
  const filtered = filters.search || filters.location || filters.date;

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl font-extrabold">Upcoming events</h1>
      <form onSubmit={(e) => e.preventDefault()} className="mt-6 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-line sm:grid-cols-[2fr_1fr_1fr_auto]" role="search">
        <div><label className="label" htmlFor="f-search">Search</label><input id="f-search" className="field" placeholder="Event name or keyword" value={filters.search} onChange={set('search')} /></div>
        <div><label className="label" htmlFor="f-loc">Location</label>
          <select id="f-loc" className="field" value={filters.location} onChange={set('location')}>
            <option value="">All locations</option>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select></div>
        <div><label className="label" htmlFor="f-date">Date</label><input id="f-date" type="date" className="field" value={filters.date} onChange={set('date')} /></div>
        <button type="button" className="btn btn-ghost self-end" onClick={clear} disabled={!filtered}>Clear</button>
      </form>

      {error && <p role="alert" className="mt-6 rounded-xl bg-glow/10 p-4 text-sm font-bold">{error}</p>}
      {events === null && !error && <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-96 animate-pulse rounded-2xl bg-line" />)}</div>}

      {events && (
        <motion.div variants={grid} initial="hidden" animate="show" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {events.map((e) => <EventCard key={e.id} event={e} />)}
          </AnimatePresence>
        </motion.div>
      )}
      {events?.length === 0 && (
        <div className="mt-12 text-center">
          <p className="text-lg font-bold">No events match those filters</p>
          <p className="mt-1 text-ink/70">Try a different date or location.</p>
          {filtered && <button className="btn btn-primary mt-4" onClick={clear}>Show all events</button>}
        </div>
      )}
    </div>
  );
}
