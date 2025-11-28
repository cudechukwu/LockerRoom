import React, { memo } from 'react';
import NotesCard from '../NotesCard';

const NotesRenderer = memo(({ notes }) => {
  return <NotesCard notes={notes} />;
});

NotesRenderer.displayName = 'NotesRenderer';
export default NotesRenderer;

