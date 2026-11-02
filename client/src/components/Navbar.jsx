import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../context/SeatsContext';

export default function Navbar() {
  const { pathname } = useLocation();
  const { isAdmin, logout } = useAuth();
  const live = useConnection();
  const [scrolled, setScrolled] = useState(false);
  const overHero = pathname === '/' && !scrolled;

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const link = ({ isActive }) =>
    `rounded-full px-3 py-1.5 text-sm font-bold transition ${
      overHero ? 'text-white/80 hover:text-white' : 'text-ink/70 hover:text-ink'
    } ${isActive ? (overHero ? '!text-white underline underline-offset-8' : '!text-ink underline underline-offset-8 decoration-glow decoration-2') : ''}`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        overHero ? 'bg-transparent' : 'border-b border-line bg-white/90 backdrop-blur'
      }`}
    >
      <div className="container-x flex h-16 items-center justify-between">
        <Link to="/" className={`flex items-center gap-2 font-display text-xl font-extrabold ${overHero ? 'text-white' : 'text-ink'}`}>
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          Convene
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          <NavLink to="/events" className={link}>Events</NavLink>
          {isAdmin ? (
            <>
              <NavLink to="/admin" className={link}>Dashboard</NavLink>
              <button onClick={logout} className={`${link({ isActive: false })}`}>Log out</button>
            </>
          ) : (
            <NavLink to="/admin/login" className={link}>Admin</NavLink>
          )}
          <span
            className={`ml-2 hidden items-center gap-1.5 text-xs font-bold sm:flex ${overHero ? 'text-white/80' : 'text-ink/60'}`}
            title={live ? 'Seat counts update live' : 'Reconnecting to live updates'}
          >
            <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-emerald-400' : 'bg-amber-400'}`} />
            {live ? 'Live' : 'Offline'}
          </span>
        </nav>
      </div>
    </header>
  );
}
