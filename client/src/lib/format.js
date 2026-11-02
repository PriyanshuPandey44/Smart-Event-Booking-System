export const money = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(Number(n) || 0);

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export const fmtDateTime = (d) => `${fmtDate(d)}, ${fmtTime(d)}`;

/** ISO string -> value for <input type="datetime-local"> in local time */
export const toLocalInput = (d) => {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
};

/** 'YYYY-MM-DD' (local day) -> { from, to } ISO range covering that whole local day */
export const dayRange = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return {
    from: new Date(y, m - 1, d, 0, 0, 0).toISOString(),
    to: new Date(y, m - 1, d, 23, 59, 59).toISOString(),
  };
};

export const mapsEmbed = (q) => `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
export const mapsLink = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
