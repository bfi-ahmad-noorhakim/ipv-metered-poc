import { Button, Dialog, Typography } from '@bfi-finance/frontend-ui/components';

type Props = {
  image: string | null;
  sending: boolean;
  onSend: () => void;
  onCancel: () => void;
};

function IpvCaptureDialog({ image, sending, onSend, onCancel }: Props) {
  return (
    <Dialog
      open={image !== null}
      onClose={onCancel}
      title="Send this photo?"
      variant="mobile"
      position="center"
      actionsOrientation="horizontal"
      actions={
        <>
          <Button variant="secondary" text="Cancel" onClick={onCancel} disabled={sending} />
          <Button variant="primary" text="Send" onClick={onSend} isLoading={sending} />
        </>
      }
    >
      {image && (
        <div className="ipv-capture-preview">
          <img src={image} alt="Captured photo" />
          <Typography size="xs" style="regular" color="neutral70">
            Share this captured photo with the other participant?
          </Typography>
        </div>
      )}
    </Dialog>
  );
}

export default IpvCaptureDialog;
