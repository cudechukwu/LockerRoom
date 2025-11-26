/**
 * Attendance Service
 * Pure business logic for attendance calculations and formatting
 */

/**
 * Get status color (hex format)
 */
export function getStatusColor(status) {
  switch (status) {
    case 'present':
      return '#10B981'; // COLORS.SUCCESS
    case 'late_10':
    case 'late_30':
      return '#F59E0B'; // COLORS.WARNING
    case 'very_late':
      return '#FF6B35';
    case 'absent':
      return '#EF4444'; // COLORS.ERROR
    case 'excused':
      return '#9CA3AF';
    default:
      return '#6B7280';
  }
}

/**
 * Get status label
 */
export function getStatusLabel(status) {
  switch (status) {
    case 'present':
      return 'Present';
    case 'late_10':
      return 'Late (<10min)';
    case 'late_30':
      return 'Late (<30min)';
    case 'very_late':
      return 'Very Late';
    case 'absent':
      return 'Absent';
    case 'excused':
      return 'Excused';
    default:
      return 'Not Checked In';
  }
}

/**
 * Format time from timestamp
 */
export function formatTime(timestamp) {
  if (!timestamp) return null;
  try {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

/**
 * Get avatar background color with opacity
 * Handles hex, rgb, rgba, hsl formats
 */
export function getAvatarBackgroundColor(statusColor) {
  // If it's a 6-digit hex, add opacity
  if (/^#[0-9A-F]{6}$/i.test(statusColor)) {
    return statusColor + '20'; // 20 = ~12% opacity in hex
  }
  
  // For other formats, return as-is (component should handle opacity via StyleSheet)
  return statusColor;
}

/**
 * Calculate attendance stats
 * @param {Array} attendance - Array of attendance records
 * @returns {Object} { present, late, absent, excused, total }
 */
export function calculateAttendanceStats(attendance) {
  if (!attendance || !Array.isArray(attendance)) {
    return { present: 0, late: 0, absent: 0, excused: 0, total: 0 };
  }

  const stats = {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    total: attendance.length,
  };

  attendance.forEach((record) => {
    const status = record.status;
    if (status === 'present') {
      stats.present++;
    } else if (status === 'late_10' || status === 'late_30' || status === 'very_late') {
      stats.late++;
    } else if (status === 'absent') {
      stats.absent++;
    } else if (status === 'excused') {
      stats.excused++;
    }
  });

  return stats;
}

/**
 * Get a user's attendance record from attendance data
 * Accepts either an Array or Map for O(1) lookup when Map is provided
 * @param {Array|Map} attendance - Array of attendance records OR Map<userId, attendance>
 * @param {string} userId - User ID to find
 * @returns {Object|null} Attendance record or null if not found
 */
export function getUserAttendanceStatus(attendance, userId) {
  if (!attendance || !userId) {
    return null;
  }
  
  // If it's a Map, use O(1) lookup
  if (attendance instanceof Map) {
    return attendance.get(userId) || null;
  }
  
  // If it's an array, use O(n) find (fallback for backwards compatibility)
  if (Array.isArray(attendance)) {
    return attendance.find(record => record.user_id === userId) || null;
  }
  
  return null;
}

/**
 * Sort members by attendance status, then alphabetically
 * Priority: present → late → excused → absent → not checked in
 */
export function sortMembersByAttendance(members, attendanceByUserId) {
  if (!members || !Array.isArray(members)) return [];

  const statusPriority = {
    present: 1,
    late_10: 2,
    late_30: 2,
    very_late: 2,
    excused: 3,
    absent: 4,
    null: 5, // Not checked in
  };

  return [...members].sort((a, b) => {
    const aAttendance = attendanceByUserId.get(a.id);
    const bAttendance = attendanceByUserId.get(b.id);
    
    const aStatus = aAttendance?.status || null;
    const bStatus = bAttendance?.status || null;
    
    const aPriority = statusPriority[aStatus] || statusPriority.null;
    const bPriority = statusPriority[bStatus] || statusPriority.null;
    
    // First sort by status priority
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Then sort alphabetically by name
    return a.name.localeCompare(b.name);
  });
}
