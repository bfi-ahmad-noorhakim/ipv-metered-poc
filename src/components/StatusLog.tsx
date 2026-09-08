import { Button, Dialog, Typography } from '@bfi-finance/frontend-ui/components';
import { Color } from '@bfi-finance/frontend-ui/foundations';
import type { LogEntry } from '../types/log';

const SOURCE_COLOR: Record<LogEntry['source'], string> = {
  metered: Color.ACCENT.PURPLE[500],
  ipv: Color.ACCENT.AQUA[700],
  app: Color.NEUTRAL[80]
};

type Props = {
  open: boolean;
  logs: LogEntry[];
  onClose: () => void;
};

function StatusLog({ open, logs, onClose }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Event log"
      variant="mobile"
      position="end"
      actions={
        <Button isFullWidth variant="secondary" text="Close" onClick={onClose} />
      }
    >
      <div className="log-list">
        {logs.length === 0 ? (
          <Typography size="sm" style="regular">
            No events yet.
          </Typography>
        ) : (
          logs.map((entry) => (
            <div className="log-row" key={entry.id}>
              <Typography component="span" size="xs" style="regular" color="neutral70">
                {entry.time}
              </Typography>
              <span className="log-source" style={{ color: SOURCE_COLOR[entry.source] }}>
                [{entry.source}]
              </span>
              <Typography component="span" size="xs" style="regular">
                {entry.message}
              </Typography>
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
}

export default StatusLog;
