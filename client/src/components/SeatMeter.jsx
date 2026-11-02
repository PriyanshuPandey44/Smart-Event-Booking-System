import { AnimatePresence, motion } from 'framer-motion';
import { useConnection, useLiveSeats } from '../context/SeatsContext';

/** Real-time seat availability: animated bar + count that ticks when seats change. */
export default function SeatMeter({ event, large = false }) {
  const { available, held, total, bookable } = useLiveSeats(event);
  const live = useConnection();
  const soldPct = total ? ((total - available) / total) * 100 : 0;
  const heldPct = total ? (held / total) * 100 : 0;
  const ratio = total ? bookable / total : 0;

  const state = bookable === 0 ? 'soldout' : ratio <= 0.15 || bookable <= 10 ? 'low' : 'ok';
  const label =
    state === 'soldout'
      ? available === 0 ? 'Sold out' : 'All seats on hold'
      : state === 'low' ? 'Filling fast' : 'Seats available';
  const tone = { soldout: 'text-ink/60', low: 'text-glow', ok: 'text-emerald-600' }[state];
  const bar = { soldout: 'bg-ink/40', low: 'bg-glow', ok: 'bg-dusk' }[state];

  return (
    <div aria-live="polite">
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <span className={`flex items-center gap-1.5 text-xs font-bold ${tone}`}>
          <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse' : ''} bg-current`} />
          {label}
        </span>
        <span className={`overflow-hidden font-display font-bold leading-none ${large ? 'text-2xl' : 'text-sm'}`}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={bookable}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="inline-block"
            >
              {bookable}
            </motion.span>
          </AnimatePresence>
          <span className="font-sans text-xs font-medium text-ink/60"> of {total} left</span>
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={total - available}>
        <motion.div className={bar} initial={false} animate={{ width: `${soldPct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        <motion.div
          className="bg-glow/40"
          title="Held by people checking out"
          initial={false}
          animate={{ width: `${heldPct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      {held > 0 && (
        <p className="mt-1 text-xs text-ink/60">{held} seat{held === 1 ? '' : 's'} held by people checking out</p>
      )}
    </div>
  );
}
