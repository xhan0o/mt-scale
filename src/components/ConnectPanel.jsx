export default function ConnectPanel({ connected, onConnect, onDisconnect }) {
  return (
    <div className="connect-panel">
      <span className={`status-dot${connected ? ' status-dot--on' : ''}`} />
      <span className="status-label">{connected ? 'Connected' : 'Disconnected'}</span>
      <button
        className={`btn ${connected ? 'btn-danger' : 'btn-accent'}`}
        onClick={connected ? onDisconnect : onConnect}
      >
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}
