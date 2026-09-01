export type LogSource = 'metered' | 'ipv' | 'app';

export type LogEntry = {
  id: number;
  time: string;
  source: LogSource;
  message: string;
};
