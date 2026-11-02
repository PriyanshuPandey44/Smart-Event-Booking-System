import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import Ticket from '../components/Ticket';

/** Opened by scanning the QR code on a ticket. */
export default function TicketPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getBooking(id, params.get('email') || '').then((d) => setBooking(d.booking)).catch((e) => setError(e.message));
  }, [id, params]);

  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="text-3xl font-extrabold">Your ticket</h1>
      {error && <p role="alert" className="mt-6 rounded-xl bg-glow/10 p-4 font-bold">{error} Check the link, or book again from the events page.</p>}
      {!booking && !error && <div className="mt-6 h-56 animate-pulse rounded-2xl bg-line" />}
      {booking && <div className="mt-6"><Ticket booking={booking} /></div>}
      <Link to="/events" className="btn btn-ghost mt-8">Browse more events</Link>
    </div>
  );
}
