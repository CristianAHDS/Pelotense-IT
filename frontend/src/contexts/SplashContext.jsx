import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import SplashScreen from '../components/ui/SplashScreen';

const SplashContext = createContext(null);

const MIN_DISPLAY_MS = 400;

function isProbablyLoggedIn() {
  try {
    return !!(localStorage.getItem('pelotense_token') || localStorage.getItem('pelotense_guest') === '1');
  } catch (_) {
    return false;
  }
}

export function SplashProvider({ children }) {
  const [visible, setVisible] = useState(isProbablyLoggedIn);
  const [leaving, setLeaving] = useState(false);
  const visibleRef = useRef(isProbablyLoggedIn());
  const shownAtRef = useRef(Date.now());
  const hideTimer = useRef(null);
  const fallbackTimer = useRef(null);

  const doHide = useCallback(() => {
    setLeaving(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setLeaving(false);
    }, 550);
  }, []);

  const show = useCallback(() => {
    clearTimeout(hideTimer.current);
    clearTimeout(fallbackTimer.current);
    visibleRef.current = true;
    shownAtRef.current = Date.now();
    setLeaving(false);
    setVisible(true);
    fallbackTimer.current = setTimeout(doHide, 4000);
  }, [doHide]);

  const hide = useCallback(() => {
    if (!visibleRef.current) return;
    visibleRef.current = false;
    clearTimeout(fallbackTimer.current);
    const remaining = Math.max(0, MIN_DISPLAY_MS - (Date.now() - shownAtRef.current));
    if (remaining > 0) {
      hideTimer.current = setTimeout(doHide, remaining);
    } else {
      doHide();
    }
  }, [doHide]);

  useEffect(() => {
    if (visibleRef.current) {
      fallbackTimer.current = setTimeout(doHide, 4000);
    }
    return () => clearTimeout(fallbackTimer.current);
  }, [doHide]);

  return (
    <SplashContext.Provider value={{ show, hide }}>
      {children}
      {visible && <SplashScreen leaving={leaving} />}
    </SplashContext.Provider>
  );
}

export function useSplash() {
  return useContext(SplashContext);
}
