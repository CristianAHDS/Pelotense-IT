import { useState, useCallback, useRef, useEffect, Children, cloneElement } from 'react';
import './InteractiveList.css';

export default function InteractiveList({
  count = 8,
  skeletonDuration = 20000,
  children,
  className = '',
}) {
  const [activeIndex, setActiveIndex] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = useCallback((index) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveIndex(index);
    timerRef.current = setTimeout(() => {
      setActiveIndex(null);
    }, skeletonDuration);
  }, [skeletonDuration]);

  const childArray = Children.toArray(children);
  const items = Array.from({ length: count }, (_, i) => {
    const child = childArray[i % childArray.length] || null;
    const isActive = activeIndex === i;
    return (
      <li
        key={i}
        className={`interactive-list__item ${isActive ? 'interactive-list__item--loading' : ''}`}
        onClick={() => handleClick(i)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(i);
          }
        }}
      >
        <span className="interactive-list__index">{i + 1}</span>
        <span className="interactive-list__skeleton">
          {!isActive && child}
        </span>
        {isActive && (
          <span className="interactive-list__shimmer" aria-label="Loading..." />
        )}
      </li>
    );
  });

  return (
    <ul className={`interactive-list ${className}`}>
      {items}
    </ul>
  );
}
