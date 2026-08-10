import { useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import './PageTransition.css';

export default function PageTransition({ children }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState('fadeIn');
  const prevLocation = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevLocation.current) {
      setTransitionStage('fadeOut');
      prevLocation.current = location.pathname;
    }
  }, [location]);

  useEffect(() => {
    if (transitionStage === 'fadeOut') {
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionStage('fadeIn');
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [transitionStage, children]);

  return (
    <div className={`page-transition-${transitionStage}`}>
      {displayChildren}
    </div>
  );
}
