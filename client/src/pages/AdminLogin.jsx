import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const { isAdmin, login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (isAdmin) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(form.email, form.password); nav('/admin'); }
    catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <div className="container-x grid max-w-md place-items-center py-16">
      <motion.form key={error} animate={error ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.4 }} onSubmit={submit} className="w-full rounded-3xl bg-white p-8 shadow-lift ring-1 ring-line">
        <h1 className="text-3xl font-extrabold">Organiser log in</h1>
        <div className="mt-6"><label className="label" htmlFor="a-email">Email</label><input id="a-email" type="email" required className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="mt-4"><label className="label" htmlFor="a-pass">Password</label><input id="a-pass" type="password" required className="field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        {error && <p role="alert" className="mt-4 text-sm font-bold text-glow">{error}</p>}
        <button className="btn btn-primary mt-6 w-full" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
      </motion.form>
    </div>
  );
}
