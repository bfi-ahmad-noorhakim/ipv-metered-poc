import type { ChatFile } from '../hooks/useMetered';

type Props = {
  files: ChatFile[];
  onClear: () => void;
};

function FileOverlay({ files, onClear }: Props) {
  return (
    <div className="file-overlay">
      {files.map((file) => (
        <div className="file-card" key={file.id}>
          <img src={file.url} alt={file.fileName} />
          <span className="file-meta">
            <span className="file-name">{file.fileName}</span>
            <span className="file-sender">{file.local ? 'You' : file.senderName}</span>
          </span>
        </div>
      ))}
      <button type="button" className="file-clear" onClick={onClear} aria-label="Clear files">
        ×
      </button>
    </div>
  );
}

export default FileOverlay;
