import { useState } from 'react';

/** Event image with a branded gradient fallback if the URL is missing or broken. */
export default function Cover({ src, alt, className = '' }) {
  const [bad, setBad] = useState(!src);
  if (bad) {
    return (
      <div role="img" aria-label={alt} className={`${className} bg-gradient-to-br from-dusk via-ridge to-glow`} />
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setBad(true)} className={className} />;
}
