import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { fmtDate, fmtTime, money } from '../lib/format';

const ticketUrl = (b) => `${window.location.origin}/ticket/${b.id}?email=${encodeURIComponent(b.email)}`;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Draws the ticket to a canvas and downloads it as a PNG. */
async function downloadTicket(b, qrDataUrl) {
  const W = 1000, H = 420;
  const canvas = document.createElement('canvas');
  canvas.width = W * 2; canvas.height = H * 2; // retina-sharp
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  ctx.fillStyle = '#F4F5FB';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#121638';
  roundRect(ctx, 10, 10, W - 20, H - 20, 28); ctx.fill();

  // stub (right) in white
  ctx.save();
  roundRect(ctx, 10, 10, W - 20, H - 20, 28); ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(680, 10, W - 690, H - 20);
  ctx.restore();
  ctx.strokeStyle = '#c9cce4'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(680, 30); ctx.lineTo(680, H - 30); ctx.stroke(); ctx.setLineDash([]);

  ctx.fillStyle = '#FF4D8D'; ctx.font = '700 20px "DM Sans", sans-serif';
  ctx.fillText(`${b.ticket_type.toUpperCase()}  x ${b.quantity}`, 50, 70);
  ctx.fillStyle = '#ffffff'; ctx.font = '800 38px "Bricolage Grotesque", sans-serif';
  const title = b.event_title.length > 30 ? `${b.event_title.slice(0, 29)}...` : b.event_title;
  ctx.fillText(title, 50, 125);
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '500 22px "DM Sans", sans-serif';
  ctx.fillText(`${fmtDate(b.event_date)} at ${fmtTime(b.event_date)}`, 50, 170);
  ctx.fillText(b.event_location, 50, 205);
  ctx.fillStyle = '#ffffff'; ctx.font = '700 24px "DM Sans", sans-serif';
  ctx.fillText(b.name, 50, 275);
  ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = '500 18px "DM Sans", sans-serif';
  ctx.fillText(`Paid ${money(b.total_amount)}`, 50, 305);
  ctx.fillText(`Booked ${fmtDate(b.booking_date)}`, 50, 332);
  ctx.fillStyle = '#7DD3FC'; ctx.font = '700 22px "DM Sans", sans-serif';
  ctx.fillText(b.ticket_code, 50, 375);

  const qr = await loadImage(qrDataUrl);
  ctx.drawImage(qr, 718, 70, 230, 230);
  ctx.fillStyle = '#121638'; ctx.font = '700 18px "DM Sans", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Scan at the entrance', 833, 335);
  ctx.fillStyle = '#6b6f94'; ctx.font = '500 15px "DM Sans", sans-serif';
  ctx.fillText(b.ticket_code, 833, 360);

  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${b.ticket_code}.png`;
  a.click();
}

export default function Ticket({ booking }) {
  const [qr, setQr] = useState('');
  const cancelled = booking.status === 'cancelled';

  useEffect(() => {
    QRCode.toDataURL(ticketUrl(booking), { margin: 1, width: 360, color: { dark: '#121638', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [booking]);

  return (
    <div className="w-full">
      <div className={`relative flex flex-col overflow-hidden rounded-2xl bg-ink text-white shadow-lift sm:flex-row ${cancelled ? 'opacity-60 grayscale' : ''}`}>
        <div className="flex-1 p-6">
          <p className="text-xs font-bold text-glow">{booking.ticket_type.toUpperCase()} x {booking.quantity}</p>
          <h3 className="mt-1 text-2xl font-extrabold leading-tight">{booking.event_title}</h3>
          <p className="mt-2 text-sm text-white/75">{fmtDate(booking.event_date)} at {fmtTime(booking.event_date)}</p>
          <p className="text-sm text-white/75">{booking.event_location}</p>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div><p className="text-white/55">Name</p><p className="font-bold">{booking.name}</p></div>
            <div><p className="text-white/55">Paid</p><p className="font-bold">{money(booking.total_amount)}</p></div>
            <div><p className="text-white/55">Ticket</p><p className="font-bold text-sky2">{booking.ticket_code}</p></div>
          </div>
        </div>
        <div className="relative flex flex-col items-center justify-center gap-2 border-t-2 border-dashed border-white/25 bg-white p-5 text-ink sm:w-56 sm:border-l-2 sm:border-t-0">
          {qr ? <img src={qr} alt={`QR code for ticket ${booking.ticket_code}`} className="h-36 w-36" /> : <div className="h-36 w-36 animate-pulse rounded bg-line" />}
          <p className="text-xs font-bold">Scan at the entrance</p>
        </div>
        {cancelled && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="-rotate-12 rounded border-4 border-glow px-4 py-1 font-display text-3xl font-extrabold text-glow">CANCELLED</span>
          </div>
        )}
      </div>
      {!cancelled && (
        <button className="btn btn-primary mt-4 w-full" disabled={!qr} onClick={() => downloadTicket(booking, qr)}>
          Download ticket (PNG)
        </button>
      )}
    </div>
  );
}
