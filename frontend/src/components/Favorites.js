import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTelegram } from '../contexts/TelegramContext';
import { apiService } from '../services/api';

const Favorites = () => {
  const { hasProfile } = useUser();
  const { user: telegramUser } = useTelegram();
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    propertyType: '',
    rooms: '',
    minPrice: '',
    maxPrice: '',
    metroStation: ''
  });

  const fetchLikedProperties = async () => {
    if (!telegramUser || !hasProfile) return;

    try {
      setLoading(true);
      const data = await apiService.getLikedProperties(telegramUser.id);
      setProperties(data);
      setFilteredProperties(data);
    } catch (error) {
      console.error('Error fetching liked properties:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to properties
  const applyFilters = (propertiesToFilter, currentFilters) => {
    let result = [...propertiesToFilter];
    
    // Filter by property type
    if (currentFilters.propertyType) {
      result = result.filter(p => p.property_type === currentFilters.propertyType);
    }
    
    // Filter by rooms
    if (currentFilters.rooms) {
      result = result.filter(p => p.rooms.toString() === currentFilters.rooms);
    }
    
    // Filter by min price
    if (currentFilters.minPrice) {
      result = result.filter(p => p.price >= parseInt(currentFilters.minPrice));
    }
    
    // Filter by max price
    if (currentFilters.maxPrice) {
      result = result.filter(p => p.price <= parseInt(currentFilters.maxPrice));
    }
    
    // Filter by metro station
    if (currentFilters.metroStation) {
      result = result.filter(p => p.metro_station === currentFilters.metroStation);
    }
    
    return result;
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    const filtered = applyFilters(properties, newFilters);
    setFilteredProperties(filtered);
  };

  const clearFilters = () => {
    setFilters({
      propertyType: '',
      rooms: '',
      minPrice: '',
      maxPrice: '',
      metroStation: ''
    });
    setFilteredProperties(properties);
  };

  const removeFromFavorites = async (propertyId) => {
    if (!telegramUser) return;

    try {
      await apiService.createLike(telegramUser.id, propertyId, 'property');
      
      // Update local state by removing the property
      setProperties(prev => prev.filter(p => p.id !== propertyId));
      setFilteredProperties(prev => prev.filter(p => p.id !== propertyId));
      
      // Close modal if this property was selected
      if (selectedProperty && selectedProperty.id === propertyId) {
        setSelectedProperty(null);
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  useEffect(() => {
    if (hasProfile) {
      fetchLikedProperties();
    }
  }, [hasProfile, telegramUser]);

  // Get unique metro stations from properties for filter
  const uniqueMetroStations = [...new Set(properties.map(p => p.metro_station))];

  if (!hasProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-telegram-bg p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-telegram-text mb-4">
            Создайте профиль для просмотра избранного
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
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-telegram-text">Избранное</h1>
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
              {filteredProperties.length} из {properties.length}
            </div>
          </div>
        </div>
        
        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-telegram-bg rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Property Type Filter */}
              <select 
                value={filters.propertyType}
                onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                className="bg-telegram-secondary border border-telegram-text/20 rounded-lg px-3 py-2 text-telegram-text text-sm"
              >
                <option value="">Тип жилья</option>
                <option value="apartment">Квартира</option>
                <option value="room">Комната</option>
                <option value="studio">Студия</option>
              </select>
              
              {/* Rooms Filter */}
              <select 
                value={filters.rooms}
                onChange={(e) => handleFilterChange('rooms', e.target.value)}
                className="bg-telegram-secondary border border-telegram-text/20 rounded-lg px-3 py-2 text-telegram-text text-sm"
              >
                <option value="">Комнат</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4+</option>
              </select>
            </div>
            
            {/* Price Range Filter */}
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Цена от"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                className="bg-telegram-secondary border border-telegram-text/20 rounded-lg px-3 py-2 text-telegram-text text-sm"
              />
              <input
                type="number"
                placeholder="Цена до"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                className="bg-telegram-secondary border border-telegram-text/20 rounded-lg px-3 py-2 text-telegram-text text-sm"
              />
            </div>

            {/* Metro Station Filter */}
            {uniqueMetroStations.length > 0 && (
              <select 
                value={filters.metroStation}
                onChange={(e) => handleFilterChange('metroStation', e.target.value)}
                className="w-full bg-telegram-secondary border border-telegram-text/20 rounded-lg px-3 py-2 text-telegram-text text-sm"
              >
                <option value="">Все станции метро</option>
                {uniqueMetroStations.map(station => (
                  <option key={station} value={station}>{station}</option>
                ))}
              </select>
            )}

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

      {/* Properties List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❤️</div>
            <h3 className="text-lg font-medium text-telegram-text mb-2">
              {properties.length === 0 ? 'Нет избранных объявлений' : 'Нет объявлений по фильтрам'}
            </h3>
            <p className="text-telegram-text/70 text-sm mb-4">
              {properties.length === 0 
                ? 'Добавляйте понравившиеся объявления с карты'
                : 'Попробуйте изменить параметры фильтров'
              }
            </p>
            {properties.length === 0 ? (
              <button
                onClick={() => window.location.href = '/'}
                className="bg-telegram-button text-white px-6 py-3 rounded-lg font-medium hover:bg-telegram-accent transition-colors"
              >
                Перейти к карте
              </button>
            ) : (
              <button
                onClick={clearFilters}
                className="bg-telegram-button text-white px-6 py-3 rounded-lg font-medium hover:bg-telegram-accent transition-colors"
              >
                Очистить фильтры
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProperties.map(property => (
              <div
                key={property.id}
                className="property-card p-4 cursor-pointer card-hover"
                onClick={() => setSelectedProperty(property)}
              >
                <div className="flex space-x-4">
                  {/* Property Image */}
                  <div className="flex-shrink-0">
                    {property.photos && property.photos.length > 0 ? (
                      <img
                        src={property.photos[0]}
                        alt={property.title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-telegram-button/20 rounded-lg flex items-center justify-center">
                        <span className="text-telegram-text text-2xl">🏠</span>
                      </div>
                    )}
                  </div>

                  {/* Property Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-telegram-text text-sm leading-tight">
                        {property.title}
                      </h3>
                      <div className="flex items-center ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromFavorites(property.id);
                          }}
                          className="text-red-500 mr-2 hover:text-red-700 transition-colors p-1"
                          title="Удалить из избранного"
                        >
                          ❤️
                        </button>
                        <span className="text-telegram-button font-bold text-sm">
                          {property.price.toLocaleString()} ₽
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-telegram-text/70">
                      <div className="flex items-center">
                        <span className="mr-2">📍</span>
                        <span className="truncate">{property.address}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <span className="mr-1">🏠</span>
                          <span>{property.rooms} комн.</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-1">📐</span>
                          <span>{property.area} м²</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-1">🚇</span>
                          <span>{property.metro_station}</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">🏢</span>
                        <span>{property.floor} из {property.total_floors} этаж</span>
                      </div>
                    </div>

                    {property.amenities && property.amenities.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {property.amenities.slice(0, 3).map((amenity, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-telegram-button/10 text-telegram-text rounded text-xs"
                            >
                              {amenity}
                            </span>
                          ))}
                          {property.amenities.length > 3 && (
                            <span className="px-2 py-1 bg-telegram-button/10 text-telegram-text rounded text-xs">
                              +{property.amenities.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Property Details Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-telegram-secondary rounded-t-lg p-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-telegram-text">
                {selectedProperty.title}
              </h3>
              <button
                onClick={() => setSelectedProperty(null)}
                className="text-telegram-text/70 hover:text-telegram-text text-xl"
              >
                ×
              </button>
            </div>

            {/* Property Images */}
            {selectedProperty.photos && selectedProperty.photos.length > 0 && (
              <div className="mb-4">
                <img
                  src={selectedProperty.photos[0]}
                  alt={selectedProperty.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
                {selectedProperty.photos.length > 1 && (
                  <div className="flex space-x-2 mt-2 overflow-x-auto">
                    {selectedProperty.photos.slice(1, 4).map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`${selectedProperty.title} ${index + 2}`}
                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Property Details */}
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-telegram-text/70">Цена:</span>
                <span className="text-telegram-text font-bold text-lg">
                  {selectedProperty.price.toLocaleString()} ₽/мес
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-telegram-text/70">Комнат:</span>
                  <span className="text-telegram-text">{selectedProperty.rooms}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-text/70">Площадь:</span>
                  <span className="text-telegram-text">{selectedProperty.area} м²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-text/70">Этаж:</span>
                  <span className="text-telegram-text">
                    {selectedProperty.floor} из {selectedProperty.total_floors}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-text/70">Тип:</span>
                  <span className="text-telegram-text">{selectedProperty.property_type}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-telegram-text/70">Метро:</span>
                <span className="text-telegram-text">{selectedProperty.metro_station}</span>
              </div>
              <div>
                <span className="text-telegram-text/70 block mb-1">Адрес:</span>
                <span className="text-telegram-text text-sm">{selectedProperty.address}</span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <span className="text-telegram-text/70 block mb-2">Описание:</span>
              <p className="text-telegram-text/80 text-sm leading-relaxed">
                {selectedProperty.description}
              </p>
            </div>

            {/* Amenities */}
            {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
              <div className="mb-4">
                <span className="text-telegram-text/70 block mb-2">Удобства:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedProperty.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-telegram-button/20 text-telegram-text rounded-full text-xs"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => removeFromFavorites(selectedProperty.id)}
                className="w-full flex items-center justify-center p-3 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <span className="text-red-500 mr-2">💔</span>
                <span className="text-telegram-text text-sm font-medium">Удалить из избранного</span>
              </button>
              
              <button
                onClick={() => {
                  setSelectedProperty(null);
                  window.location.href = '/';
                }}
                className="w-full bg-telegram-button text-white py-3 rounded-lg font-medium hover:bg-telegram-accent transition-colors"
              >
                Показать на карте
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Favorites;