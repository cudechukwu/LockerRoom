import React, { memo } from 'react';
import AttendanceSummary from '../AttendanceSummary';

const AttendanceSummaryRenderer = memo(({ stats, totalMembers }) => {
  return (
    <AttendanceSummary
      stats={stats}
      totalMembers={totalMembers}
    />
  );
});

AttendanceSummaryRenderer.displayName = 'AttendanceSummaryRenderer';
export default AttendanceSummaryRenderer;

