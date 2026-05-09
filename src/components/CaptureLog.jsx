export default function CaptureLog({ captures, onClear }) {
  if (captures.length === 0) return null;

  return (
    <section className="capture-log">
      <div className="section-header">
        <h2>Captured Readings</h2>
        <button className="btn btn-ghost btn-sm" onClick={onClear}>Clear</button>
      </div>
      <table className="capture-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Time</th>
            <th>Weight</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {captures.map((c, i) => (
            <tr key={c.id}>
              <td className="muted">{captures.length - i}</td>
              <td className="muted">{c.timestamp}</td>
              <td className="weight-cell">{c.value.toFixed(2)} {c.unit}</td>
              <td className={c.stable ? 'cell-stable' : 'cell-dynamic'}>
                {c.stable ? 'Stable' : 'Settling'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
