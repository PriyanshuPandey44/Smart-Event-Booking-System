import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import TicketPage from './pages/TicketPage';
import AdminLogin from './pages/AdminLogin';
import Admin from './pages/Admin';

function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="text-4xl font-extrabold">This page doesn't exist</h1>
      <p className="mt-2 text-ink/70">The link may be old or mistyped.</p>
      <Link to="/events" className="btn btn-primary mt-6">Browse events</Link>
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className={`flex-1 ${pathname === '/' ? '' : 'pt-16'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/ticket/:id" element={<TicketPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
