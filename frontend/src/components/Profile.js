import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTelegram } from '../contexts/TelegramContext';
import { METRO_STATIONS } from '../constants/metroStations';

const Profile = () => {
  const { user, hasProfile, createUser, updateUser, loading } = useUser();
  const { user: telegramUser, hapticFeedback, showAlert } = useTelegram();
  const [isEditing, setIsEditing] = useState(!hasProfile);
  const [showMetroSuggestions, setShowMetroSuggestions] = useState(false);
  const [filteredStations, setFilteredStations] = useState([]);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    gender: '',
    about: '',
    price_range_min: '',
    price_range_max: '',
    metro_station: '',
    search_radius: '',
    latitude: 55.7558, // Moscow center
    longitude: 37.6176
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        age: user.age || '',
        gender: user.gender || '',
        about: user.about || '',
        price_range_min: user.price_range_min || '',
        price_range_max: user.price_range_max || '',
        metro_station: user.metro_station || '',
        search_radius: user.search_radius || '',
        latitude: user.latitude || 55.7558,
        longitude: user.longitude || 37.6176
      });
    }
  }, [user]);

  // Removed automatic location detection - users will use metro station coordinates

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    let convertedValue = value;
    if (type === 'number') {
      convertedValue = value === '' ? '' : Number(value);
    }
    
    // Handle metro station autocomplete
    if (name === 'metro_station') {
      const filtered = METRO_STATIONS.filter(station =>
        station.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredStations(filtered);
      setShowMetroSuggestions(value.length > 0 && filtered.length > 0);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: convertedValue
    }));
  };

  const handleMetroSelect = (station) => {
    setFormData(prev => ({
      ...prev,
      metro_station: station
    }));
    setShowMetroSuggestions(false);
    setFilteredStations([]);
  };

  const handleMetroBlur = () => {
    // Delay hiding suggestions to allow for selection
    setTimeout(() => {
      setShowMetroSuggestions(false);
    }, 200);
  };

  const handleInputFocus = (e) => {
    // Auto-scroll to active input field on mobile
    if (window.Telegram?.WebApp) {
      setTimeout(() => {
        const element = e.target;
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Calculate position to center the input between keyboard and top
        // Assume keyboard takes ~40% of screen height
        const keyboardHeight = viewportHeight * 0.4;
        const availableHeight = viewportHeight - keyboardHeight;
        const targetPosition = availableHeight / 2;
        
        // Scroll to position the input field optimally
        const scrollOffset = rect.top - targetPosition;
        window.scrollBy({
          top: scrollOffset,
          behavior: 'smooth'
        });
      }, 300); // Wait for keyboard animation
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    hapticFeedback('impact', 'light');

    try {
      if (hasProfile) {
        await updateUser(formData);
        showAlert('Профиль обновлен!');
      } else {
        await createUser(formData);
        showAlert('Профиль создан!');
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Ошибка при сохранении профиля:', error);
      showAlert(`Ошибка: ${error.message}`);
    }
  };

  const toggleEdit = () => {
    hapticFeedback('selection');
    setIsEditing(!isEditing);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-telegram-bg flex flex-col">
      {/* Header */}
      <div className="bg-telegram-secondary p-4 shadow-lg flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-telegram-text">Профиль</h1>
          {hasProfile && (
            <button
              onClick={toggleEdit}
              className="px-4 py-2 bg-telegram-button text-telegram-text rounded-lg hover:bg-telegram-accent transition-colors"
            >
              {isEditing ? 'Отмена' : 'Редактировать'}
            </button>
          )}
        </div>
      </div>

      {/* Profile Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto pb-4">

        {/* User Info */}
        <div className="bg-telegram-secondary rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            {telegramUser?.photo_url && (
              <img
                src={telegramUser.photo_url}
                alt="Profile"
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h2 className="text-lg font-semibold text-telegram-text">
                {telegramUser?.first_name} {telegramUser?.last_name}
              </h2>
              {telegramUser?.username && (
                <p className="text-telegram-text/70">@{telegramUser.username}</p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form */}
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-2">
                Возраст
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                required
                min="18"
                max="65"
                className="form-input w-full px-3 py-2 rounded-lg"
                placeholder="Введите ваш возраст"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-2">
                Пол
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                required
                className="form-input w-full px-3 py-2 rounded-lg"
              >
                <option value="">Выберите пол</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-2">
                О себе
              </label>
              <textarea
                name="about"
                value={formData.about}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                rows="3"
                className="form-input w-full px-3 py-2 rounded-lg resize-none"
                placeholder="Расскажите немного о себе (необязательно)"
                maxLength="200"
              />
              <div className="text-xs text-telegram-text/60 mt-1">
                {formData.about ? formData.about.length : 0}/200 символов
              </div>
            </div>



            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Бюджет от (₽)
                </label>
                <input
                  type="number"
                  name="price_range_min"
                  value={formData.price_range_min}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  required
                  min="0"
                  className="form-input w-full px-3 py-2 rounded-lg"
                  placeholder="15000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Бюджет до (₽)
                </label>
                <input
                  type="number"
                  name="price_range_max"
                  value={formData.price_range_max}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  required
                  min="0"
                  className="form-input w-full px-3 py-2 rounded-lg"
                  placeholder="80000"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-telegram-text mb-2">
                Станция метро
              </label>
              <input
                type="text"
                name="metro_station"
                value={formData.metro_station}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleMetroBlur}
                required
                className="form-input w-full px-3 py-2 rounded-lg"
                placeholder="Начните вводить название станции..."
                autoComplete="off"
              />
              
              {/* Metro Suggestions Dropdown */}
              {showMetroSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-telegram-secondary border border-telegram-text/20 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredStations.slice(0, 8).map((station, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleMetroSelect(station)}
                      className="w-full text-left px-3 py-2 hover:bg-telegram-button/20 text-telegram-text transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      🚇 {station}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-2">
                Радиус поиска (км)
              </label>
              <input
                type="number"
                name="search_radius"
                value={formData.search_radius}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                required
                min="1"
                max="5"
                className="form-input w-full px-3 py-2 rounded-lg"
                placeholder="3"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-telegram-button text-white py-3 rounded-lg font-medium hover:bg-telegram-accent transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="spinner mr-2"></div>
                  Сохранение...
                </div>
              ) : (
                hasProfile ? 'Обновить профиль' : 'Создать профиль'
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-telegram-secondary rounded-lg p-4">
              <h3 className="text-lg font-semibold text-telegram-text mb-3">Информация о профиле</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-telegram-text/70">Возраст:</span>
                  <span className="text-telegram-text">{user?.age} лет</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-telegram-text/70">Бюджет:</span>
                  <span className="text-telegram-text">
                    {user?.price_range_min?.toLocaleString()} - {user?.price_range_max?.toLocaleString()} ₽
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-text/70">Метро:</span>
                  <span className="text-telegram-text">{user?.metro_station}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-text/70">Радиус поиска:</span>
                  <span className="text-telegram-text">{user?.search_radius} км</span>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Profile;