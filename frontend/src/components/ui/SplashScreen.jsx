import { useEffect, useState } from 'react';
import './SplashScreen.css';

export default function SplashScreen({ onDone, delay = 2200 }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(onDone, 550);
    return () => clearTimeout(t);
  }, [leaving, onDone]);

  return (
    <div className={`splash-screen ${leaving ? 'splash-leave' : ''}`} style={{ '--splash-delay': `${delay}ms` }}>
      <div className="splash-glow" />
      <div className="splash-content">
        <div className="splash-logo-wrap">
          <img src="https://i.imgur.com/mfoPeJL.png" alt="Pelotense IT" className="splash-logo" />
        </div>
        <h1 className="splash-title">Pelotense IT</h1>
        <span className="splash-sub">Gestão de Chamados</span>
        <div className="splash-bar">
          <div className="splash-bar-fill" />
        </div>
      </div>
    </div>
  );
}
