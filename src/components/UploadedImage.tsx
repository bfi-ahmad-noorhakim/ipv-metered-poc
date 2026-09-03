type Props = {
  src: string;
  onRemove: () => void;
};

function UploadedImage({ src, onRemove }: Props) {
  return (
    <div className="upload-overlay">
      <img className="upload-img" src={src} alt="Uploaded document" />
      <button
        type="button"
        className="upload-badge"
        onClick={onRemove}
        aria-label="Remove document"
        title="Remove document"
      >
        ✕
      </button>
    </div>
  );
}

export default UploadedImage;
