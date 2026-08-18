import './SplashScreen.css';
import { getTermos } from '../../termos';

export default function SplashScreen({ leaving = false }) {
  const termos = getTermos();
  return (
    <div className={`splash-screen ${leaving ? 'splash-leave' : ''}`}>
      <div className="splash-glow" />
      <div className="splash-content">
        <div className="splash-logo-wrap">
          <img src="/pelotense_it_icone_app_sem_fundo.png" alt="Pelotense IT" className="splash-logo" />
        </div>
        <h1 className="splash-title">Pelotense IT</h1>
        <span className="splash-sub">{termos.gestaoDe}</span>
        <div className="splash-bar">
          <div className="splash-bar-fill" />
        </div>
      </div>
    </div>
  );
}
