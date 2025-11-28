import React, { memo } from 'react';
import EventHero from '../EventHero';

const HeroRenderer = memo(({ event, creatorName, permissions, handleClose, handleEdit, handleDelete }) => {
  return (
    <EventHero
      event={event}
      creatorName={creatorName}
      onClose={handleClose}
      onEdit={handleEdit}
      onDelete={handleDelete}
      canEdit={permissions?.isEventCreator}
      canDelete={permissions?.isEventCreator}
    />
  );
});

HeroRenderer.displayName = 'HeroRenderer';
export default HeroRenderer;

