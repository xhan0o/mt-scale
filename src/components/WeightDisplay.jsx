const STATUS_LABELS = {
  stable: 'STABLE',
  dynamic: 'SETTLING',
  overload: 'OVERLOAD',
  underload: 'UNDERLOAD',
  busy: 'BUSY',
};

export default function WeightDisplay({ reading, connected }) {
  const status = reading?.status ?? null;
  const label = STATUS_LABELS[status] ?? '';

  return (
    <div className={`weight-display weight-display--${status ?? 'idle'}`}>
      <div className="weight-status">
        {connected ? label : 'NOT CONNECTED'}
      </div>
      <div className="weight-value">
        {reading?.value != null ? reading.value.toFixed(2) : '---.--'}
      </div>
      <div className="weight-unit">{reading?.unit ?? 'g'}</div>
    </div>
  );
}
