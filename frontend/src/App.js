import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { TelegramProvider } from './contexts/TelegramContext';
import { UserProvider } from './contexts/UserContext';
import BottomNav from './components/BottomNav';
import MapView from './components/MapView';
import Profile from './components/Profile';
import Matches from './components/Matches';
import Favorites from './components/Favorites';
import UserMatches from './components/UserMatches';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      // Set theme
      document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#17212b');
      document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#ffffff');
      document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#708499');
      document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
      document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
      document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
      document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#242f3d');
    }
    
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-telegram-bg">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <TelegramProvider>
      <UserProvider>
        <Router>
          <div className="tg-web-app bg-telegram-bg text-telegram-text min-h-screen">
            <div className="pb-16">
              <Routes>
                <Route path="/" element={<MapView />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/user-matches" element={<UserMatches />} />
              </Routes>
            </div>
            <BottomNav />
          </div>
        </Router>
      </UserProvider>
    </TelegramProvider>
  );
}

export default App;