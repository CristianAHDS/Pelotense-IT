import { useOffline } from '../../contexts/OfflineContext';
import { WifiOff, RefreshCw } from 'lucide-react';
import './OfflineBanner.css';

export default function OfflineBanner() {
  const { isOnline, pendingCount } = useOffline();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`offline-banner ${isOnline ? 'syncing' : 'offline'}`}>
      {!isOnline ? (
        <>
          <WifiOff size={15} />
          <span>Sem conexão — alterações serão salvas e sincronizadas quando a rede voltar.</span>
        </>
      ) : (
        <>
          <RefreshCw size={15} className="spin" />
          <span>{pendingCount} alteração(ões) pendente(s) de sincronização...</span>
        </>
      )}
    </div>
  );
}
