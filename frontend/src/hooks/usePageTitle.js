import { useEffect } from 'react';

export default function usePageTitle(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · Pelotense IT` : 'Pelotense IT';
    return () => { document.title = 'Pelotense IT'; };
  }, [titulo]);
}
