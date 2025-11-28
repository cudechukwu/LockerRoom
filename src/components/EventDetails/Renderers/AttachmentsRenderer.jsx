import React, { memo } from 'react';
import AttachmentsCard from '../AttachmentsCard';

const AttachmentsRenderer = memo(({ attachments, isLoading, onPress }) => {
  return (
    <AttachmentsCard
      computedAttachments={attachments}
      isLoading={isLoading}
      onAttachmentPress={onPress}
    />
  );
});

AttachmentsRenderer.displayName = 'AttachmentsRenderer';
export default AttachmentsRenderer;

