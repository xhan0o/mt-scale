// Parses a single MT-SICS response line.
// Format: "CMD STATUS VALUE UNIT" e.g. "S S       1.234 g" or "T A"
const STATUS_MAP = {
  S: 'stable',
  D: 'dynamic',
  '+': 'overload',
  '-': 'underload',
  I: 'busy',
  L: 'unknown_cmd',
  A: 'ack',
  B: 'list_item',
};

export function parseMtSics(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return null;

  const cmd = parts[0];
  const statusCode = parts[1];
  const status = STATUS_MAP[statusCode] ?? 'unknown';

  if (statusCode === '+' || statusCode === '-') {
    return { cmd, statusCode, status, value: null, unit: null };
  }

  if ((statusCode === 'S' || statusCode === 'D') && parts.length >= 4) {
    const value = parseFloat(parts[2]);
    const unit = parts[3];
    if (!isNaN(value)) {
      return { cmd, statusCode, status, value, unit };
    }
  }

  return { cmd, statusCode, status, value: null, unit: null };
}
