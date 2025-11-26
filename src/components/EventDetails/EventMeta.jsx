/**
 * EventMeta Component
 * Pure UI composition component
 * 
 * Composes:
 * - EventHero (title, metadata, actions)
 * - EventDetailsCard (date, time, location, recurring)
 * - NotesCard (notes)
 * - AttachmentsCard (attachments)
 * 
 * NO business logic - all logic comes from props
 * This is now a pure presenter component
 */

import React from 'react';
import EventHero from './EventHero';
import EventDetailsCard from './EventDetailsCard';
import AttachmentsCard from './AttachmentsCard';
import NotesCard from './NotesCard';

const EventMeta = ({ 
  event, 
  creatorName, 
  isLoadingCreator = false,
  computedAttachments = [],
  isLoadingAttachments = false,
  onClose,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  onAttachmentPress, // Callback when computed attachment is pressed
}) => {
  if (!event) return null;

  return (
    <>
      {/* Hero Header Section */}
      <EventHero
        event={event}
        creatorName={creatorName}
        isLoadingCreator={isLoadingCreator}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {/* Event Details Card (location, recurring) */}
      <EventDetailsCard event={event} />

      {/* Notes Card */}
      <NotesCard notes={event.notes} />

      {/* Attachments Card */}
      <AttachmentsCard
        computedAttachments={computedAttachments}
        isLoading={isLoadingAttachments}
        onAttachmentPress={onAttachmentPress}
      />
    </>
  );
};

export default EventMeta;
