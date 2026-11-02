// Ticket categories + dynamic pricing. The server is the single source of truth:
// the client only displays these prices and the booking route recomputes them.

const TIERS = [
  { key: 'general', label: 'General', multiplier: 1, perks: ['Standard entry', 'Open seating'] },
  { key: 'vip', label: 'VIP', multiplier: 1.75, perks: ['Priority entry', 'Front-section seating', 'Welcome drink'] },
  { key: 'premium', label: 'Premium', multiplier: 2.5, perks: ['Fast-track entry', 'Reserved front row', 'Meet & greet access', 'Event goodies'] },
];

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Demand factor:
 *  - 50% or more sold -> price rises linearly up to +30% when nearly sold out.
 *  - Under 50% sold and the event is 30+ days away -> 10% early-bird discount.
 */
function demand(event) {
  const total = Number(event.total_seats) || 0;
  if (!total) return { factor: 1, note: null };
  const sold = total - Number(event.available_seats);
  const fill = sold / total;
  if (fill >= 0.5) {
    return { factor: 1 + 0.3 * ((fill - 0.5) / 0.5), note: 'high_demand' };
  }
  const daysAway = (new Date(event.date).getTime() - Date.now()) / 86400000;
  if (daysAway >= 30) return { factor: 0.9, note: 'early_bird' };
  return { factor: 1, note: null };
}

function getTiers(event) {
  const { factor, note } = demand(event);
  const base = Number(event.price);
  return {
    note,
    tiers: TIERS.map((t) => ({
      key: t.key,
      label: t.label,
      perks: t.perks,
      price: round2(base * t.multiplier * factor),
    })),
  };
}

module.exports = { TIERS, getTiers, round2 };
