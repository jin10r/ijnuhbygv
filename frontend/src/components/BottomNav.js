import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTelegram } from '../contexts/TelegramContext';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();

  const navItems = [
    {
      path: '/',
      icon: '🗺️',
      label: 'Карта',
      name: 'map'
    },
    {
      path: '/matches',
      icon: '👥',
      label: 'Поиск',
      name: 'matches'
    },
    {
      path: '/user-matches',
      icon: '💕',
      label: 'Совпадения',
      name: 'user-matches'
    },
    {
      path: '/favorites',
      icon: '❤️',
      label: 'Избранное',
      name: 'favorites'
    },
    {
      path: '/profile',
      icon: '👤',
      label: 'Профиль',
      name: 'profile'
    }
  ];

  const handleNavClick = (path) => {
    hapticFeedback('selection');
    navigate(path);
  };

  return (
    <div className="bottom-nav">
      <div className="flex items-center justify-around p-2">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.name}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'text-telegram-accent bg-telegram-button/10' 
                  : 'text-telegram-text/70 hover:text-telegram-text'
              }`}
            >
              <span className="text-lg mb-1">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;