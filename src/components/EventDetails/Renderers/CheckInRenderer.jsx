import React, { memo } from 'react';
import CheckInSection from '../CheckInSection';

const CheckInRenderer = memo(({ 
  userAttendance, 
  event, 
  isCheckingIn, 
  isLoadingAttendance, 
  onCheckInLocation, 
  onCheckOut,
  onCheckInQR 
}) => {
  return (
    <CheckInSection
      userAttendance={userAttendance}
      event={event}
      isCheckingIn={isCheckingIn}
      isLoadingAttendance={isLoadingAttendance}
      onCheckInLocation={onCheckInLocation}
      onCheckOut={onCheckOut}
      onCheckInQR={onCheckInQR}
    />
  );
});

CheckInRenderer.displayName = 'CheckInRenderer';
export default CheckInRenderer;

