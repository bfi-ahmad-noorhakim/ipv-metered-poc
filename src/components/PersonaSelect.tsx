import { Button, EmptyState, Typography } from '@bfi-finance/frontend-ui/components';
import type { Persona } from '../types/persona';

type Props = {
  onSelect: (persona: Persona) => void;
};

function PersonaSelect({ onSelect }: Props) {
  return (
    <div className="persona">
      <EmptyState
        title="Choose your persona"
        description="Select a persona to start the session."
      />
      <div className="persona-options">
        <div className="persona-option">
          <Button
            isFullWidth
            variant="primary"
            text="User"
            size="medium"
            onClick={() => onSelect('user')}
          />
          <Typography size="xs" style="regular" color="neutral70">
            Video call + IPV
          </Typography>
        </div>
        <div className="persona-option">
          <Button
            isFullWidth
            variant="secondary"
            text="Admin"
            size="medium"
            onClick={() => onSelect('admin')}
          />
          <Typography size="xs" style="regular" color="neutral70">
            Video call only
          </Typography>
        </div>
      </div>
    </div>
  );
}

export default PersonaSelect;
