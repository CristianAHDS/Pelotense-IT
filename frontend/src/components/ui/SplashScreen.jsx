import './SplashScreen.css';

export default function SplashScreen({ leaving = false }) {
  return (
    <div className={`splash-screen ${leaving ? 'splash-leave' : ''}`}>
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
