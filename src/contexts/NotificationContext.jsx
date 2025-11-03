import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastNotification from '../components/ToastNotification';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    senderName: '',
    channelName: '',
    channelId: null,
  });

  const showToast = useCallback(({ message, senderName, channelName, channelId }) => {
    setToast({
      visible: true,
      message,
      senderName,
      channelName,
      channelId,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const handleToastPress = useCallback(() => {
    // Navigate to the channel - this will be handled by the parent component
    // For now, just hide the toast
    hideToast();
  }, [hideToast]);

  return (
    <NotificationContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        senderName={toast.senderName}
        channelName={toast.channelName}
        onPress={handleToastPress}
        onDismiss={hideToast}
      />
    </NotificationContext.Provider>
  );
};

