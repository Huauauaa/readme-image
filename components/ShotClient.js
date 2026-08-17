import { useEffect, useRef, useState } from 'react';
import { createShot } from '../src/shot/createScene';
import { DURATION } from '../src/shot/timeline';

export default function ShotClient() {
  const canvasRef = useRef(null);
  const apiRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    let api;
    let ro;
    let tick;

    try {
      if (!canvasRef.current) return undefined;
      api = createShot(canvasRef.current);
      apiRef.current = api;
      setReady(true);
      ro = new ResizeObserver(() => api.resize());
      ro.observe(canvasRef.current.parentElement || canvasRef.current);
      tick = setInterval(() => {
        if (!apiRef.current) return;
        setTime(apiRef.current.getTime());
        setPlaying(apiRef.current.isPlaying());
      }, 100);
    } catch (e) {
      setErr(String(e && e.message ? e.message : e));
    }

    return () => {
      if (tick) clearInterval(tick);
      if (ro) ro.disconnect();
      if (api) api.dispose();
      apiRef.current = null;
    };
  }, []);

  return (
    <div style={wrap}>
      <div style={phone}>
        <canvas ref={canvasRef} style={canvas} />
        {!ready && !err && <div style={hud}>loading…</div>}
        {err && <div style={hud}>{err}</div>}
      </div>
      <div style={controls}>
        <button type="button" onClick={() => apiRef.current && apiRef.current.restart()} disabled={!ready}>
          Replay 6s
        </button>
        <button
          type="button"
          onClick={() => {
            if (!apiRef.current) return;
            if (apiRef.current.isPlaying()) apiRef.current.pause();
            else apiRef.current.play();
          }}
          disabled={!ready}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={DURATION}
          step={0.01}
          value={time}
          disabled={!ready}
          onChange={(e) => {
            const v = Number(e.target.value);
            setTime(v);
            if (apiRef.current) apiRef.current.seek(v);
          }}
          style={{ width: 180 }}
        />
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {time.toFixed(2)}s / {DURATION}s
        </span>
      </div>
      <p style={note}>
        Fixed 45° high camera · 9:16 · procedural stand-in (not photoreal / @图1). Route: /shot
      </p>
    </div>
  );
}

const wrap = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  background: '#1a1a1a',
  color: '#eee',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
};

const phone = {
  position: 'relative',
  width: 'min(360px, 92vw)',
  aspectRatio: '9 / 16',
  background: '#000',
  borderRadius: 12,
  overflow: 'hidden',
  boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
};

const canvas = { width: '100%', height: '100%', display: 'block' };

const hud = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(0,0,0,0.55)',
  padding: 16,
  textAlign: 'center',
};

const controls = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  alignItems: 'center',
  justifyContent: 'center',
};

const note = {
  opacity: 0.65,
  fontSize: 13,
  maxWidth: 360,
  textAlign: 'center',
  margin: 0,
};
