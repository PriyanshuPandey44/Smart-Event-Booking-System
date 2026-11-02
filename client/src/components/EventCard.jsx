import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Cover from './Cover';
import SeatMeter from './SeatMeter';
import { fmtDate, fmtTime, money } from '../lib/format';

export const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 140, damping: 18 } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
};

export default function EventCard({ event }) {
  const d = new Date(event.date);
  return (
    <motion.article
      layout
      variants={cardVariants}
      whileHover={{ y: -6 }}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-line"
    >
      <Link to={`/events/${event.id}`} className="relative block aspect-[16/10] overflow-hidden">
        <Cover src={event.img} alt={event.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute left-3 top-3 rounded-xl bg-white px-3 py-1.5 text-center leading-none shadow">
          <div className="font-display text-xl font-extrabold">{d.getDate()}</div>
          <div className="mt-0.5 text-xs font-bold text-glow">{d.toLocaleString('en-IN', { month: 'short' })}</div>
        </div>
        {event.pricing_note === 'high_demand' && (
          <span className="absolute right-3 top-3 rounded-full bg-glow px-3 py-1 text-xs font-bold text-white">High demand</span>
        )}
        {event.pricing_note === 'early_bird' && (
          <span className="absolute right-3 top-3 rounded-full bg-sky2 px-3 py-1 text-xs font-bold text-ink">Early-bird price</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-bold leading-snug">
            <Link to={`/events/${event.id}`} className="hover:text-dusk">{event.title}</Link>
          </h3>
          <p className="mt-1 text-sm text-ink/70">{event.location}</p>
          <p className="text-sm text-ink/70">{fmtDate(event.date)} at {fmtTime(event.date)}</p>
        </div>
        <SeatMeter event={event} />
        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="text-sm text-ink/70">
            From <span className="font-display text-xl font-extrabold text-ink">{money(event.current_price)}</span>
          </p>
          <Link to={`/events/${event.id}`} className="btn btn-dark !px-5 !py-2">View event</Link>
        </div>
      </div>
    </motion.article>
  );
}
