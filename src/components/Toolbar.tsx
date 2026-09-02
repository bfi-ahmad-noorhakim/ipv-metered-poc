import type { ReactNode } from 'react';

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function LogIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

type IconButtonProps = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
};

function IconButton({ icon, label, onClick, disabled, active, danger }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`tb-btn ${active ? 'is-active' : ''} ${danger ? 'is-danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {icon}
      <span className="tb-label">{label}</span>
    </button>
  );
}

type ToolbarProps = {
  joined: boolean;
  inIpv: boolean;
  audioOn: boolean;
  showLog: boolean;
  cameraToggleDisabled?: boolean;
  onJoin: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleLog: () => void;
};

function Toolbar({
  joined,
  inIpv,
  audioOn,
  showLog,
  cameraToggleDisabled,
  onJoin,
  onToggleMic,
  onToggleCamera,
  onToggleLog
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <IconButton icon={<PhoneIcon />} label="Join" onClick={onJoin} disabled={joined} />
      <IconButton
        icon={audioOn ? <MicIcon /> : <MicOffIcon />}
        label={audioOn ? 'Mute' : 'Unmute'}
        onClick={onToggleMic}
        disabled={!joined}
        active={audioOn}
        danger={!audioOn}
      />
      <IconButton
        icon={<SwapIcon />}
        label={inIpv ? 'Video' : 'IPV'}
        onClick={onToggleCamera}
        disabled={!joined || cameraToggleDisabled}
        active={inIpv}
      />
      <IconButton
        icon={<LogIcon />}
        label="Log"
        onClick={onToggleLog}
        active={showLog}
      />
    </div>
  );
}

export default Toolbar;
