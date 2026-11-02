import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { fmtDate, fmtTime, mapsEmbed, mapsLink } from '../lib/format';
import { useLiveSeats } from '../context/SeatsContext';
import Cover from '../components/Cover';
import SeatMeter from '../components/SeatMeter';
import BookingPanel from '../components/BookingPanel';

function Loaded({ event }) {
  const seats = useLiveSeats(event);
  return (
    <div className="container-x py-8">
      <Link to="/events" className="text-sm font-bold text-dusk hover:underline">All events</Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Cover src={event.img} alt={event.title} className="aspect-[16/9] w-full rounded-3xl object-cover shadow-lift" />
          <h1 className="mt-6 text-4xl font-extrabold leading-tight">{event.title}</h1>
          <p className="mt-2 font-bold text-dusk">{fmtDate(event.date)} at {fmtTime(event.date)}</p>
          <p className="text-ink/70">{event.location}</p>
          <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-line"><SeatMeter event={event} large /></div>
          <h2 className="mt-8 text-xl font-bold">About this event</h2>
          <p className="mt-2 max-w-prose whitespace-pre-line leading-relaxed text-ink/80">{event.description || 'Details coming soon.'}</p>
          <h2 className="mt-8 text-xl font-bold">Where</h2>
          <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-line">
            <iframe title={`Map of ${event.location}`} src={mapsEmbed(event.location)} className="h-72 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <a href={mapsLink(event.location)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-bold text-dusk hover:underline">Open in Google Maps</a>
        </motion.div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BookingPanel event={event} bookable={seats.bookable} available={seats.available} />
        </aside>
      </div>
    </div>
  );
}

export default function EventDetails() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setEvent(null); setError('');
    api.getEvent(id).then(setEvent).catch((e) => setError(e.message));
  }, [id]);

  if (error) return (
    <div className="container-x py-24 text-center">
      <h1 className="text-3xl font-extrabold">{error}</h1>
      <Link to="/events" className="btn btn-primary mt-6">Browse events</Link>
    </div>
  );
  if (!event) return <div className="container-x py-10"><div className="h-[28rem] animate-pulse rounded-3xl bg-line" /></div>;
  return <Loaded event={event} />;
}
