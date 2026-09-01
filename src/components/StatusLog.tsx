import type { LogEntry } from '../types/log';

type Props = {
  logs: LogEntry[];
};

const SOURCE_COLOR: Record<LogEntry['source'], string> = {
  metered: '#7c3aed',
  ipv: '#0d9488',
  app: '#64748b'
};

function StatusLog({ logs }: Props) {
  return (
    <div className="log">
      <h2>Event log</h2>
      <ul>
        {logs.map((entry) => (
          <li key={entry.id}>
            <span className="time">{entry.time}</span>
            <span className="source" style={{ color: SOURCE_COLOR[entry.source] }}>
              [{entry.source}]
            </span>
            <span className="msg">{entry.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default StatusLog;
