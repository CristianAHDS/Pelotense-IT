import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import './NetworkSpeed.css';

export default function NetworkSpeed() {
  const [speed, setSpeed] = useState({ down: null, up: null, testing: false });

  const testSpeed = useCallback(async () => {
    setSpeed((s) => ({ ...s, testing: true }));
    try {
      const startDown = performance.now();
      await fetch('/api/health');
      const endDown = performance.now();
      const downTime = (endDown - startDown) / 1000;
      const downMbps = downTime > 0 ? ((0.05 / downTime) * 8).toFixed(1) : null;

      const startUp = performance.now();
      await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: '1'.repeat(2048) }),
      });
      const endUp = performance.now();
      const upTime = (endUp - startUp) / 1000;
      const upMbps = upTime > 0 ? ((0.002 / upTime) * 8).toFixed(1) : null;

      setSpeed({ down: downMbps, up: upMbps, testing: false });
    } catch {
      setSpeed({ down: null, up: null, testing: false });
    }
  }, []);

  useEffect(() => {
    testSpeed();
    const interval = setInterval(testSpeed, 30000);
    return () => clearInterval(interval);
  }, [testSpeed]);

  const hasSpeed = speed.down !== null;

  return (
    <div className="network-speed" title={`↓ ${speed.down || '--'} Mbps / ↑ ${speed.up || '--'} Mbps`}>
      {hasSpeed ? <Wifi size={14} /> : <WifiOff size={14} />}
      <span className="speed-values">
        {hasSpeed ? (
          <>
            <span className="speed-down">↓{speed.down}</span>
            <span className="speed-sep">·</span>
            <span className="speed-up">↑{speed.up}</span>
          </>
        ) : (
          <span className="speed-na">--</span>
        )}
      </span>
    </div>
  );
}
