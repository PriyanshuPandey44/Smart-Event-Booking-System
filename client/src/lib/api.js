export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'convene_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth && tokenStore.get()) headers.Authorization = `Bearer ${tokenStore.get()}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw Object.assign(new Error("Can't reach the server. Check your connection and try again."), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed.'), { status: res.status });
  return data;
}

const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== '' && v != null && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  listEvents: (params) => request(`/events${qs(params)}`),
  locations: () => request('/events/locations'),
  getEvent: (id) => request(`/events/${id}`),
  createEvent: (body) => request('/events', { method: 'POST', body, auth: true }),
  updateEvent: (id, body) => request(`/events/${id}`, { method: 'PUT', body, auth: true }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE', auth: true }),

  book: (body) => request('/bookings', { method: 'POST', body }),
  getBooking: (id, email) => request(`/bookings/${id}${qs({ email })}`),
  listBookings: () => request('/bookings', { auth: true }),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: 'PATCH', auth: true }),
  stats: () => request('/bookings/stats', { auth: true }),

  login: (body) => request('/auth/login', { method: 'POST', body }),
};
