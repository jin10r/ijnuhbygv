import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTelegram } from '../contexts/TelegramContext';
import { apiService } from '../services/api';

const UserMatches = () => {
  const { hasProfile } = useUser();
  const { user: telegramUser, hapticFeedback } = useTelegram();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUserMatches = async () => {
    if (!telegramUser || !hasProfile) return;

    try {
      setLoading(true);
      const data = await apiService.getUserMatches(telegramUser.id);
      setMatches(data);
    } catch (error) {
      console.error('Error fetching user matches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasProfile) {
      fetchUserMatches();
    }
  }, [hasProfile, telegramUser]);

  const handleContactUser = (username) => {
    hapticFeedback('impact', 'medium');
    // Open Telegram chat
    if (username) {
      window.open(`https://t.me/${username}`, '_blank');
    }
  };

  if (!hasProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-telegram-bg p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-telegram-text mb-4">
            Создайте профиль для поиска совпадений
          </h2>
          <button
            onClick={() => window.location.href = '/profile'}
            className="bg-telegram-button text-white px-6 py-3 rounded-lg font-medium hover:bg-telegram-accent transition-colors"
          >
            Создать профиль
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-telegram-bg">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-telegram-bg flex flex-col">
      {/* Header */}
      <div className="bg-telegram-secondary p-4 shadow-lg flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-telegram-text">Совпадения</h1>
          <div className="text-sm text-telegram-text/70">
            {matches.length} совпадений
          </div>
        </div>
      </div>

      {/* Matches List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {matches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💕</div>
            <h3 className="text-lg font-medium text-telegram-text mb-2">
              Пока нет совпадений
            </h3>
            <p className="text-telegram-text/70 text-sm mb-4">
              Ставьте лайки в разделе "Поиск", чтобы найти соседей
            </p>
            <button
              onClick={() => window.location.href = '/matches'}
              className="bg-telegram-button text-white px-6 py-3 rounded-lg font-medium hover:bg-telegram-accent transition-colors"
            >
              Искать соседей
            </button>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {matches.map(match => (
              <div key={match.id} className="user-card p-4">
                <div className="flex items-start space-x-4">
                  {/* Profile Photo */}
                  <div className="flex-shrink-0">
                    {match.profile_photo_url ? (
                      <img
                        src={match.profile_photo_url}
                        alt={match.first_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-telegram-button flex items-center justify-center">
                        <span className="text-white text-lg font-bold">
                          {match.first_name[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-telegram-text">
                        {match.first_name} {match.last_name}
                      </h3>
                      <div className="flex items-center text-red-500">
                        <span className="mr-1">💕</span>
                        <span className="text-sm">Взаимно</span>
                      </div>
                    </div>

                    {match.username && (
                      <p className="text-telegram-text/70 text-sm mb-2">
                        @{match.username}
                      </p>
                    )}

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center text-telegram-text/80">
                        <span className="mr-2">🎂</span>
                        <span>{match.age} лет</span>
                      </div>

                      <div className="flex items-center text-telegram-text/80">
                        <span className="mr-2">💰</span>
                        <span>
                          {match.price_range_min.toLocaleString()} - {match.price_range_max.toLocaleString()} ₽
                        </span>
                      </div>
                      <div className="flex items-center text-telegram-text/80">
                        <span className="mr-2">🚇</span>
                        <span>{match.metro_station}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex space-x-3">
                      <button
                        onClick={() => handleContactUser(match.username)}
                        disabled={!match.username}
                        className="flex-1 bg-telegram-button text-white py-2 px-4 rounded-lg font-medium hover:bg-telegram-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        💬 Написать
                      </button>
                      <button
                        onClick={() => window.location.href = '/favorites'}
                        className="flex-1 bg-telegram-secondary text-telegram-text py-2 px-4 rounded-lg font-medium hover:bg-telegram-button/20 transition-colors border border-telegram-button/30"
                      >
                        🏠 Избранное
                      </button>
                    </div>

                    {/* Match Info */}
                    <div className="mt-3 p-3 bg-telegram-button/10 rounded-lg">
                      <p className="text-xs text-telegram-text/70">
                        <span className="text-green-400">✓</span> У вас взаимный лайк! 
                        Теперь вы можете видеть избранные объявления друг друга и обмениваться контактами.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMatches;