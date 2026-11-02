import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-ink text-white/70">
      <div className="container-x flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-xl font-extrabold text-white">Convene</p>
          <p className="mt-1 text-sm">Find an event. Hold your seats. Walk in with a QR code.</p>
        </div>
        <nav className="flex gap-6 text-sm font-bold" aria-label="Footer">
          <Link to="/events" className="hover:text-white">Browse events</Link>
          <Link to="/admin/login" className="hover:text-white">Organisers</Link>
        </nav>
      </div>
    </footer>
  );
}
