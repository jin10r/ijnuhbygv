import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTelegram } from '../contexts/TelegramContext';
import { apiService } from '../services/api';

const SearchMatches = () => {
  const { hasProfile } = useUser();
  const { user: telegramUser, hapticFeedback, showAlert } = useTelegram();
  const [activeTab, setActiveTab] = useState('search');
  const [matches, setMatches] = useState([]);
  const [userMatches, setUserMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minAge: '',
    maxAge: '',
    gender: 'all',
    minPrice: '',
    maxPrice: '',
    metroStation: ''
  });

  const fetchMatches = async () => {
    if (!telegramUser || !hasProfile) return;

    try {
      setLoading(true);
      const data = await apiService.getMatches(telegramUser.id);
      setMatches(data);
      setFilteredMatches(data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserMatches = async () => {
    if (!telegramUser || !hasProfile) return;

    try {
      setLoading(true);
      const data = await apiService.getUserMatches(telegramUser.id);
      setUserMatches(data);
    } catch (error) {
      console.error('Error fetching user matches:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to matches
  const applyFilters = () => {
    let filtered = [...matches];

    // Age filter
    if (filters.minAge || filters.maxAge) {
      filtered = filtered.filter(match => {
        const age = match.age;
        if (!age) return false;
        
        if (filters.minAge && age < parseInt(filters.minAge)) return false;
        if (filters.maxAge && age > parseInt(filters.maxAge)) return false;
        
        return true;
      });
    }

    // Gender filter
    if (filters.gender !== 'all') {
      filtered = filtered.filter(match => match.gender === filters.gender);
    }

    // Price range filter
    if (filters.minPrice) {
      filtered = filtered.filter(match => match.price_range_max >= parseInt(filters.minPrice));
    }
    
    if (filters.maxPrice) {
      filtered = filtered.filter(match => match.price_range_min <= parseInt(filters.maxPrice));
    }

    // Metro station filter
    if (filters.metroStation) {
      filtered = filtered.filter(match => match.metro_station === filters.metroStation);
    }

    setFilteredMatches(filtered);
  };

  // Apply filters when filters or matches change
  useEffect(() => {
    applyFilters();
  }, [filters, matches]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      minAge: '',
      maxAge: '',
      gender: 'all',
      minPrice: '',
      maxPrice: '',
      metroStation: ''
    });
  };

  useEffect(() => {
    if (hasProfile) {
      fetchMatches();
      fetchUserMatches();
    }
  }, [hasProfile, telegramUser]);

  const handleLikeUser = async (userId) => {
    if (!telegramUser) return;

    try {
      hapticFeedback('impact', 'light');
      const result = await apiService.createLike(telegramUser.id, userId, 'user');
      
      // Update local state - set liked to true (one-time action)
      setMatches(prev => prev.map(u => 
        u.id === userId ? { ...u, is_liked: true } : u
      ));

      if (result.is_match) {
        hapticFeedback('notification', 'success');
        showAlert('🎉 У вас новое совпадение! Проверьте вкладку "Совпадения"');
        // Refresh user matches
        fetchUserMatches();
      } else {
        showAlert('Лайк отправлен!');
      }
    } catch (error) {
      console.error('Error liking user:', error);
      showAlert('Ошибка при отправке лайка');
    }
  };

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
            Создайте профиль для поиска соседей
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
        {/* Tabs */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex bg-telegram-bg rounded-lg p-1">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'search'
                  ? 'bg-telegram-button text-white'
                  : 'text-telegram-text/70'
              }`}
            >
              👥 Поиск соседей
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'matches'
                  ? 'bg-telegram-button text-white'
                  : 'text-telegram-text/70'
              }`}
            >
              💕 Совпадения ({userMatches.length})
            </button>
          </div>
        </div>

        {activeTab === 'search' && (
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-telegram-text">Поиск соседей</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  showFilters 
                    ? 'bg-telegram-button text-white' 
                    : 'bg-telegram-bg text-telegram-text border border-telegram-text/20'
                }`}
              >
                🔍 Фильтры
              </button>
              <div className="text-sm text-telegram-text/70">
                {filteredMatches.length} из {matches.length}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-telegram-text">Совпадения</h1>
            <div className="text-sm text-telegram-text/70">
              {userMatches.length} совпадений
            </div>
          </div>
        )}

        {/* Filters Panel - only show for search tab */}
        {activeTab === 'search' && showFilters && (
          <div className="bg-telegram-bg rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Age Range */}
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Возраст от:
                </label>
                <input
                  type="number"
                  value={filters.minAge}
                  onChange={(e) => handleFilterChange('minAge', e.target.value)}
                  placeholder="18"
                  min="18"
                  max="100"
                  className="w-full px-3 py-2 bg-telegram-secondary border border-telegram-text/20 rounded-lg text-telegram-text placeholder-telegram-text/50 focus:outline-none focus:border-telegram-button"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  до:
                </label>
                <input
                  type="number"
                  value={filters.maxAge}
                  onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                  placeholder="65"
                  min="18"
                  max="100"
                  className="w-full px-3 py-2 bg-telegram-secondary border border-telegram-text/20 rounded-lg text-telegram-text placeholder-telegram-text/50 focus:outline-none focus:border-telegram-button"
                />
              </div>
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Бюджет от (₽):
                </label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  placeholder="15000"
                  className="w-full px-3 py-2 bg-telegram-secondary border border-telegram-text/20 rounded-lg text-telegram-text placeholder-telegram-text/50 focus:outline-none focus:border-telegram-button"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  до (₽):
                </label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  placeholder="80000"
                  className="w-full px-3 py-2 bg-telegram-secondary border border-telegram-text/20 rounded-lg text-telegram-text placeholder-telegram-text/50 focus:outline-none focus:border-telegram-button"
                />
              </div>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-2">
                Пол:
              </label>
              <div className="flex space-x-2">
                {[
                  { value: 'all', label: 'Все', emoji: '👥' },
                  { value: 'male', label: 'Мужской', emoji: '👨' },
                  { value: 'female', label: 'Женский', emoji: '👩' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange('gender', option.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filters.gender === option.value
                        ? 'bg-telegram-button text-white'
                        : 'bg-telegram-secondary text-telegram-text border border-telegram-text/20'
                    }`}
                  >
                    {option.emoji} {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-telegram-text/70 hover:text-telegram-text transition-colors"
              >
                Очистить фильтры
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {activeTab === 'search' ? (
          // Search Results
          filteredMatches.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-telegram-text mb-2">
                Пока нет подходящих соседей
              </h3>
              <p className="text-telegram-text/70 text-sm">
                Попробуйте расширить радиус поиска в профиле
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map(match => (
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
                          {match.first_name}
                          {match.last_name && ` ${match.last_name}`}
                        </h3>
                        <div className="flex items-center space-x-2 text-telegram-text/70 text-sm">
                          <span>
                            {match.gender === 'male' ? '👨' : match.gender === 'female' ? '👩' : '👤'} 
                            {match.age ? `${match.age} лет` : 'Возраст не указан'}
                          </span>
                        </div>
                      </div>

                      {match.about && (
                        <p className="text-telegram-text/70 text-sm mb-2">
                          {match.about}
                        </p>
                      )}

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center text-telegram-text/80">
                          <span className="mr-2">💰</span>
                          <span>
                            {match.price_range_min?.toLocaleString()} - {match.price_range_max?.toLocaleString()} ₽
                          </span>
                        </div>
                        <div className="flex items-center text-telegram-text/80">
                          <span className="mr-2">🚇</span>
                          <span>{match.metro_station}</span>
                        </div>
                        <div className="flex items-center text-telegram-text/80">
                          <span className="mr-2">📍</span>
                          <span>Радиус поиска: {match.search_radius} км</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-4">
                        <button
                          onClick={() => handleLikeUser(match.id)}
                          disabled={match.is_liked}
                          className={`like-button px-6 py-2 rounded-lg font-medium transition-all ${
                            match.is_liked
                              ? 'liked bg-gray-500 text-white cursor-not-allowed'
                              : 'bg-telegram-button text-white hover:bg-telegram-accent'
                          }`}
                        >
                          {match.is_liked ? (
                            <span className="flex items-center">
                              <span className="mr-2">❤️</span>
                              Лайк отправлен
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <span className="mr-2">👍</span>
                              Отправить лайк
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // User Matches
          userMatches.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💕</div>
              <h3 className="text-lg font-medium text-telegram-text mb-2">
                Пока нет совпадений
              </h3>
              <p className="text-telegram-text/70 text-sm mb-4">
                Ставьте лайки во вкладке "Поиск соседей", чтобы найти совпадения
              </p>
              <button
                onClick={() => setActiveTab('search')}
                className="bg-telegram-button text-white px-6 py-3 rounded-lg font-medium hover:bg-telegram-accent transition-colors"
              >
                Искать соседей
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {userMatches.map(match => (
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
                          {match.first_name}
                          {match.last_name && ` ${match.last_name}`}
                        </h3>
                        <div className="flex items-center text-red-500">
                          <span className="mr-1">💕</span>
                          <span className="text-sm">Взаимно</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center text-telegram-text/80">
                          <span className="mr-2">🎂</span>
                          <span>{match.age ? `${match.age} лет` : 'Возраст не указан'}</span>
                        </div>

                        <div className="flex items-center text-telegram-text/80">
                          <span className="mr-2">💰</span>
                          <span>
                            {match.price_range_min?.toLocaleString()} - {match.price_range_max?.toLocaleString()} ₽
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
          )
        )}
      </div>
    </div>
  );
};

export default SearchMatches;