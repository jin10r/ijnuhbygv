import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTelegram } from '../contexts/TelegramContext';
import { apiService } from '../services/api';
import { getMetroStationCoordinates } from '../constants/metroStations';

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

const MapView = () => {
  const { user, hasProfile } = useUser();
  const { user: telegramUser, hapticFeedback, showAlert } = useTelegram();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    propertyType: '',
    rooms: '',
    minPrice: '',
    maxPrice: '',
    metroStation: ''
  });
  
  // Use refs to persist map state
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const mapInitializedRef = useRef(false);

  const initMap = useCallback(() => {
    if (!user || mapInitializedRef.current) return;

    // Get metro station coordinates
    const metroCoordinates = getMetroStationCoordinates(user.metro_station) || [user.latitude, user.longitude];
    
    // Clear existing map if it exists
    if (mapRef.current) {
      mapRef.current.destroy();
      mapRef.current = null;
    }

    const mapInstance = new window.ymaps.Map('map', {
      center: metroCoordinates,
      zoom: 13,
      controls: [] // Remove all controls
    });

    mapRef.current = mapInstance;
    mapInitializedRef.current = true;

    // Add metro station marker
    const metroPlacemark = new window.ymaps.Placemark(
      metroCoordinates,
      {
        balloonContent: `<strong>Метро ${user.metro_station}</strong><br/>Радиус поиска: ${user.search_radius} км`
      },
      {
        preset: 'islands#redCircleDotIcon'
      }
    );

    mapInstance.geoObjects.add(metroPlacemark);

    // Add user location marker
    const userPlacemark = new window.ymaps.Placemark(
      [user.latitude, user.longitude],
      {
        balloonContent: `<strong>Ваше местоположение</strong><br/>Радиус поиска: ${user.search_radius} км`
      },
      {
        preset: 'islands#blueCircleDotIcon'
      }
    );

    mapInstance.geoObjects.add(userPlacemark);

    // Add search radius circle around metro station
    const circle = new window.ymaps.Circle(
      [
        metroCoordinates,
        user.search_radius * 1000 // Convert km to meters
      ],
      {},
      {
        fillColor: '#ff000020',
        strokeColor: '#ff0000',
        strokeOpacity: 0.6,
        strokeWidth: 2
      }
    );

    mapInstance.geoObjects.add(circle);
  }, [user]);

  // Initialize Yandex Maps only once
  useEffect(() => {
    if (!user) return;
    
    const loadMap = async () => {
      if (!window.ymaps) {
        const script = document.createElement('script');
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${process.env.REACT_APP_YANDEX_MAPS_API_KEY || 'your_api_key'}&lang=ru_RU`;
        script.async = true;
        script.onload = () => {
          window.ymaps.ready(() => initMap());
        };
        document.head.appendChild(script);
      } else {
        window.ymaps.ready(() => initMap());
      }
    };

    if (!mapInitializedRef.current) {
      loadMap();
    }

    // Cleanup function
    return () => {
      // Don't destroy map on component unmount to preserve state
    };
  }, [user, initMap]);

  const addPropertyMarkersToMap = useCallback((propertiesToAdd) => {
    if (!mapRef.current) return;

    // Clear existing property markers
    markersRef.current.forEach(marker => {
      mapRef.current.geoObjects.remove(marker);
    });
    markersRef.current = [];

    // Add new markers with price labels
    propertiesToAdd.forEach(property => {
      // Format price for display
      const priceDisplay = property.price >= 1000000 
        ? `${Math.round(property.price / 1000000)}M₽`
        : property.price >= 1000 
          ? `${Math.round(property.price / 1000)}k₽`
          : `${property.price}₽`;

      // Create placemark with custom layout for price display
      const placemark = new window.ymaps.Placemark(
        [property.latitude, property.longitude],
        {
          balloonContent: `
            <div style="padding: 10px; max-width: 300px; background: var(--tg-theme-bg-color, #ffffff); color: var(--tg-theme-text-color, #000000);">
              <h3 style="margin: 0 0 10px 0; color: var(--tg-theme-text-color, #000000);">${property.title}</h3>
              <p style="margin: 0 0 5px 0; color: var(--tg-theme-hint-color, #666666);">${property.address}</p>
              <p style="margin: 0 0 5px 0;"><strong>Цена:</strong> ${property.price.toLocaleString()} ₽/мес</p>
              <p style="margin: 0 0 5px 0;"><strong>Комнат:</strong> ${property.rooms}</p>
              <p style="margin: 0 0 5px 0;"><strong>Площадь:</strong> ${property.area} м²</p>
              <p style="margin: 0 0 10px 0;"><strong>Метро:</strong> ${property.metro_station}</p>
              <div style="display: flex; gap: 10px;">
                <button onclick="window.selectProperty('${property.id}')" 
                        style="background: var(--tg-theme-button-color, #2481cc); color: var(--tg-theme-button-text-color, #ffffff); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; flex: 1;">
                  Подробнее
                </button>
                <button onclick="window.toggleFavorite('${property.id}')" 
                        style="background: ${property.is_liked ? '#ff4444' : 'var(--tg-theme-button-color, #2481cc)'}; color: var(--tg-theme-button-text-color, #ffffff); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; flex: 1;">
                  ${property.is_liked ? '❤️ Убрать' : '🤍 В избранное'}
                </button>
              </div>
            </div>
          `,
          type: 'property',
          propertyId: property.id
        },
        {
          iconLayout: window.ymaps.templateLayoutFactory.createClass(`
            <div style="
              position: relative;
              background: ${property.is_liked ? '#ff4444' : '#2481cc'};
              color: white;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 2px solid white;
              min-width: 40px;
              text-align: center;
            ">
              ${priceDisplay}
              <div style="
                position: absolute;
                bottom: -6px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 6px solid ${property.is_liked ? '#ff4444' : '#2481cc'};
              "></div>
            </div>
          `),
          iconShape: {
            type: 'Rectangle',
            coordinates: [[-20, -15], [20, 5]]
          }
        }
      );
      
      mapRef.current.geoObjects.add(placemark);
      markersRef.current.push(placemark);
    });
  }, []);

  const fetchProperties = useCallback(async () => {
    if (!telegramUser || !hasProfile || !user) return;

    const cachedProperties = sessionStorage.getItem('map_properties');
    if (cachedProperties) {
      const parsedProperties = JSON.parse(cachedProperties);
      setProperties(parsedProperties);
      return;
    }

    try {
      setLoading(true);
      const data = await apiService.getProperties(telegramUser.id);
      
      // Get metro station coordinates for filtering
      const metroCoordinates = getMetroStationCoordinates(user.metro_station);
      
      // Filter properties by distance from metro station and price range
      const filteredProperties = data.filter(property => {
        if (metroCoordinates) {
          const distance = calculateDistance(
            metroCoordinates[0], metroCoordinates[1],
            property.latitude, property.longitude
          );
          
          if (distance > user.search_radius) {
            return false;
          }
        }
        
        if (user.price_range_min && property.price < user.price_range_min) {
          return false;
        }
        
        if (user.price_range_max && property.price > user.price_range_max) {
          return false;
        }
        
        return true;
      });
      
      setProperties(filteredProperties);
      sessionStorage.setItem('map_properties', JSON.stringify(filteredProperties));
      
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  }, [telegramUser, hasProfile, user]);

  // Apply filters to properties
  const applyFilters = (propertiesToFilter, currentFilters) => {
    let result = [...propertiesToFilter];
    
    if (currentFilters.propertyType) {
      result = result.filter(p => p.property_type === currentFilters.propertyType);
    }
    
    if (currentFilters.rooms) {
      result = result.filter(p => p.rooms.toString() === currentFilters.rooms);
    }
    
    if (currentFilters.minPrice) {
      result = result.filter(p => p.price >= parseInt(currentFilters.minPrice));
    }
    
    if (currentFilters.maxPrice) {
      result = result.filter(p => p.price <= parseInt(currentFilters.maxPrice));
    }
    
    if (currentFilters.metroStation) {
      result = result.filter(p => p.metro_station === currentFilters.metroStation);
    }
    
    return result;
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    
    const filteredProperties = applyFilters(properties, newFilters);
    addPropertyMarkersToMap(filteredProperties);
  };

  const clearFilters = () => {
    setFilters({
      propertyType: '',
      rooms: '',
      minPrice: '',
      maxPrice: '',
      metroStation: ''
    });
    addPropertyMarkersToMap(properties);
  };

  useEffect(() => {
    if (hasProfile && mapRef.current) {
      fetchProperties();
    }
  }, [hasProfile, fetchProperties]);

  useEffect(() => {
    if (mapRef.current && properties.length > 0) {
      const filteredProperties = applyFilters(properties, filters);
      addPropertyMarkersToMap(filteredProperties);
    }
  }, [properties, addPropertyMarkersToMap, filters]);

  const handleLikeProperty = useCallback(async (propertyId) => {
    if (!telegramUser) return;

    try {
      hapticFeedback('impact', 'light');
      await apiService.createLike(telegramUser.id, propertyId, 'property');
      
      setProperties(prev => {
        const updated = prev.map(p => {
          if (p.id === propertyId) {
            return { ...p, is_liked: !p.is_liked };
          }
          return p;
        });
        
        // Update session storage
        sessionStorage.setItem('map_properties', JSON.stringify(updated));
        
        // Update map markers
        const filteredProperties = applyFilters(updated, filters);
        addPropertyMarkersToMap(filteredProperties);
        
        return updated;
      });
      
      const currentProperty = properties.find(p => p.id === propertyId);
      const message = currentProperty?.is_liked 
        ? 'Объявление удалено из избранного!' 
        : 'Объявление добавлено в избранное!';
      showAlert(message);
      
    } catch (error) {
      console.error('Error toggling property favorite:', error);
      showAlert('Ошибка при изменении избранного');
    }
  }, [telegramUser, hapticFeedback, showAlert, properties, filters, addPropertyMarkersToMap]);

  // Set up global functions for property selection and favorites
  useEffect(() => {
    window.selectProperty = (propertyId) => {
      const property = properties.find(p => p.id === propertyId);
      if (property) {
        setSelectedProperty(property);
      }
    };

    window.toggleFavorite = async (propertyId) => {
      await handleLikeProperty(propertyId);
    };

    return () => {
      delete window.selectProperty;
      delete window.toggleFavorite;
    };
  }, [properties, handleLikeProperty]);

  if (!hasProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-telegram-bg p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-telegram-text mb-4">
            Добро пожаловать в поиск жилья!
          </h2>
          <p className="text-telegram-text/70 mb-6">
            Для начала нужно создать профиль
          </p>
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

  const filteredProperties = applyFilters(properties, filters);

  return (
    <div className="fixed inset-0 bg-telegram-bg">
      {/* Header */}
      <div className="bg-telegram-secondary p-4 shadow-lg z-10 relative">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-telegram-text">Карта объявлений</h1>
            <div className="text-xs text-telegram-text/60 mt-1">
              📍 {user?.metro_station} • 📏 {user?.search_radius} км • 💰 {user?.price_range_min?.toLocaleString()}-{user?.price_range_max?.toLocaleString()} ₽
            </div>
          </div>
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
      </div>

      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-telegram-secondary rounded-lg p-4 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-telegram-text">Фильтры</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-telegram-text/70 hover:text-telegram-text text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Property Type Filter */}
                <select 
                  value={filters.propertyType}
                  onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                  className="bg-telegram-bg border border-telegram-text/20 rounded-lg px-3 py-2 text-telegram-text text-sm"
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
                  className="bg-telegram-bg border border-telegram-text/20 rounded-lg px-3 py-2 text-telegram-text text-sm"
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
                  className="bg-telegram-bg border border-telegram-text/20 rounded-lg px-3 py-2 text-telegram-text text-sm"
                />
                <input
                  type="number"
                  placeholder="Цена до"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="bg-telegram-bg border border-telegram-text/20 rounded-lg px-3 py-2 text-telegram-text text-sm"
                />
              </div>

              {/* Action buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={clearFilters}
                  className="flex-1 px-4 py-2 text-sm text-telegram-text/70 hover:text-telegram-text transition-colors border border-telegram-text/20 rounded-lg"
                >
                  Очистить
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-2 bg-telegram-button text-white rounded-lg font-medium hover:bg-telegram-accent transition-colors"
                >
                  Применить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Container - Full Screen */}
      <div className="absolute top-32 left-0 right-0 bottom-16">
        <div id="map" className="w-full h-full">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-telegram-bg/80 z-10">
              <div className="spinner"></div>
            </div>
          )}
        </div>
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

            {selectedProperty.photos && selectedProperty.photos.length > 0 && (
              <img
                src={selectedProperty.photos[0]}
                alt={selectedProperty.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-telegram-text/70">Цена:</span>
                <span className="text-telegram-text font-semibold">
                  {selectedProperty.price.toLocaleString()} ₽/мес
                </span>
              </div>
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
                <span className="text-telegram-text/70">Метро:</span>
                <span className="text-telegram-text">{selectedProperty.metro_station}</span>
              </div>
            </div>

            <p className="text-telegram-text/80 mb-4 text-sm">
              {selectedProperty.description}
            </p>

            {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
              <div className="mb-4">
                <h4 className="text-telegram-text font-medium mb-2">Удобства:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProperty.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-telegram-button/20 text-telegram-text rounded text-sm"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => handleLikeProperty(selectedProperty.id)}
              className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                selectedProperty.is_liked
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-telegram-button text-white hover:bg-telegram-accent'
              }`}
            >
              {selectedProperty.is_liked ? '❤️ В избранном' : '🤍 В избранное'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;