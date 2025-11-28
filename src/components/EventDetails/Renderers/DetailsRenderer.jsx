import React, { memo } from 'react';
import EventDetailsCard from '../EventDetailsCard';

const DetailsRenderer = memo(({ event }) => {
  return <EventDetailsCard event={event} />;
});

DetailsRenderer.displayName = 'DetailsRenderer';
export default DetailsRenderer;

