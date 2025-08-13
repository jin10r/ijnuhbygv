import React, { createContext, useContext, useEffect, useState } from 'react';

const TelegramContext = createContext();

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
};

export const TelegramProvider = ({ children }) => {
  const [tg, setTg] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const telegram = window.Telegram.WebApp;
      setTg(telegram);
      
      // Get user data from Telegram
      if (telegram.initDataUnsafe?.user) {
        setUser(telegram.initDataUnsafe.user);
      } else {
        // For development/testing - mock user data
        setUser({
          id: 123456789,
          first_name: "Test",
          last_name: "User",
          username: "testuser",
          photo_url: "https://picsum.photos/150/150?random=1"
        });
      }
    } else {
      // For development without Telegram
      setUser({
        id: 123456789,
        first_name: "Test",
        last_name: "User", 
        username: "testuser",
        photo_url: "https://picsum.photos/150/150?random=1"
      });
    }
  }, []);

  const showAlert = (message) => {
    if (tg) {
      tg.showAlert(message);
    } else {
      alert(message);
    }
  };

  const showConfirm = (message) => {
    return new Promise((resolve) => {
      if (tg) {
        tg.showConfirm(message, resolve);
      } else {
        resolve(window.confirm(message));
      }
    });
  };

  const hapticFeedback = (type = 'impact', style = 'medium') => {
    if (tg?.HapticFeedback) {
      if (type === 'impact') {
        tg.HapticFeedback.impactOccurred(style);
      } else if (type === 'notification') {
        tg.HapticFeedback.notificationOccurred(style);
      } else if (type === 'selection') {
        tg.HapticFeedback.selectionChanged();
      }
    }
  };

  const value = {
    tg,
    user,
    showAlert,
    showConfirm,
    hapticFeedback,
    isReady: !!user
  };

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
};