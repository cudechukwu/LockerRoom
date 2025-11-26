/**
 * useHandleQRScan Hook
 * Handles QR scan data from parent and triggers controller handler
 * 
 * Keeps modal component ultra-light by extracting this effect
 */

import { useEffect, useRef } from 'react';

/**
 * Hook to handle QR scan data from parent
 * @param {string|null} qrScanData - QR data from parent
 * @param {Function} onQRScanSuccess - Handler to call when QR is scanned
 * @param {boolean} visible - Whether modal is visible
 * @param {string|null} eventId - Event ID (for cleanup when event changes)
 */
export function useHandleQRScan(qrScanData, onQRScanSuccess, visible, eventId = null) {
  const previousQrScanDataRef = useRef(null);

  // Handle QR scan success from parent - call controller handler
  useEffect(() => {
    // Block when modal/screen isn't visible to prevent stale state updates
    if (!visible) return;
    
    // Only process if qrScanData changed (new scan)
    if (qrScanData && qrScanData !== previousQrScanDataRef.current && onQRScanSuccess) {
      previousQrScanDataRef.current = qrScanData;
      onQRScanSuccess(qrScanData);
    }
  }, [qrScanData, onQRScanSuccess, visible]);

  // Cleanup when modal closes or event changes
  useEffect(() => {
    if (!visible || !eventId) {
      // Reset QR scan data ref when modal closes or event changes
      previousQrScanDataRef.current = null;
    }
  }, [visible, eventId]);
}

