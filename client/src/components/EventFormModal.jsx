import { useState } from 'react';
import { motion } from 'framer-motion';
import { toLocalInput } from '../lib/format';

const blank = { title: '', description: '', location: '', date: '', total_seats: 100, price: 499, img: '' };

export default function EventFormModal({ event, onClose, onSave }) {
  const [form, setForm] = useState(
    event ? { ...event, date: toLocalInput(event.date), img: event.img || '' } : blank
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({
        title: form.title,
        description: form.description,
        location: form.location,
        date: form.date ? new Date(form.date).toISOString() : '',
        total_seats: Number(form.total_seats),
        price: Number(form.price),
        img: form.img,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-end bg-ink/60 p-0 sm:place-items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.form
        role="dialog" aria-modal="true" aria-label={event ? 'Edit event' : 'New event'}
        onSubmit={submit}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-lift sm:rounded-3xl"
      >
        <h2 className="text-2xl font-extrabold">{event ? 'Edit event' : 'New event'}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label" htmlFor="ev-title">Title</label><input id="ev-title" className="field" required value={form.title} onChange={set('title')} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="ev-desc">Description</label><textarea id="ev-desc" rows={4} className="field" value={form.description} onChange={set('description')} /></div>
          <div><label className="label" htmlFor="ev-loc">Location</label><input id="ev-loc" className="field" required placeholder="City, State" value={form.location} onChange={set('location')} /></div>
          <div><label className="label" htmlFor="ev-date">Date and time</label><input id="ev-date" type="datetime-local" className="field" required value={form.date} onChange={set('date')} /></div>
          <div><label className="label" htmlFor="ev-seats">Total seats</label><input id="ev-seats" type="number" min="1" className="field" required value={form.total_seats} onChange={set('total_seats')} /></div>
          <div><label className="label" htmlFor="ev-price">General ticket price (INR)</label><input id="ev-price" type="number" min="0" step="0.01" className="field" required value={form.price} onChange={set('price')} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="ev-img">Image URL</label><input id="ev-img" type="url" className="field" placeholder="https://..." value={form.img} onChange={set('img')} /></div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-glow/10 p-3 text-sm font-bold">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : event ? 'Save changes' : 'Create event'}</button>
        </div>
      </motion.form>
    </motion.div>
  );
}
