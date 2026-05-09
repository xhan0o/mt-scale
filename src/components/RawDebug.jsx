import { useEffect, useRef } from 'react';

export default function RawDebug({ lines, open, onToggle }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, open]);

  return (
    <section className="raw-debug">
      <button className="section-toggle" onClick={onToggle}>
        <span className="toggle-arrow">{open ? '▼' : '▶'}</span>
        Raw Serial Output
        {lines.length > 0 && <span className="badge">{lines.length}</span>}
      </button>
      {open && (
        <div className="raw-output">
          {lines.length === 0
            ? <div className="raw-line muted">No data yet.</div>
            : lines.map((line, i) => <div key={i} className="raw-line">{line}</div>)
          }
          <div ref={bottomRef} />
        </div>
      )}
    </section>
  );
}
