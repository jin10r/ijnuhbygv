import React, { useState, useEffect, useCallback } from 'react';
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
  const [map, setMap] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  const initMap = useCallback(() => {
    if (!user || mapInitialized) return;

    // Get metro station coordinates (for now, use user location as fallback)
    // In a real app, you'd have a metro stations database with coordinates
    const metroCoordinates = getMetroStationCoordinates(user.metro_station) || [user.latitude, user.longitude];

    

    const mapInstance = new window.ymaps.Map('map', {
      center: metroCoordinates,
      zoom: 13, // Closer zoom for metro station view
      controls: ['zoomControl', 'fullscreenControl', 'geolocationControl']
    });

        setMap(mapInstance);
    setMapInitialized(true);

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

  // Initialize Yandex Maps
  useEffect(() => {
    if (!user) return;
    
    // Reset map initialization flag when key parameters change
    setMapInitialized(false);
    
    const loadMap = async () => {
      // Destroy existing map if it exists
      if (map) {
        map.destroy();
        setMap(null);
      }
      
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

    // Small delay to ensure DOM is ready and state is updated
    setTimeout(loadMap, 200);

    // Cleanup function to destroy map on unmount
    return () => {
      if (map) {
        map.destroy();
        setMap(null);
        setMapInitialized(false);
      }
    };
  }, [user?.metro_station, user?.search_radius]); // Only re-initialize when metro station or radius changes

    const addPropertyMarkersToMap = useCallback((propertiesToAdd) => {
    if (!map) return;

    // Clear existing property markers
    const oldMarkers = [];
    map.geoObjects.each(obj => {
      if (obj.properties && obj.properties.get('type') === 'property') {
        oldMarkers.push(obj);
      }
    });
    oldMarkers.forEach(marker => map.geoObjects.remove(marker));

    // Add new markers
    propertiesToAdd.forEach(property => {
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
                        style="background: ${property.is_liked ? '#ff3333' : 'var(--tg-theme-secondary-bg-color, #242f3d)'}; color: ${property.is_liked ? '#ffffff' : 'var(--tg-theme-text-color, #ffffff)'}; border: 1px solid ${property.is_liked ? '#ff3333' : 'var(--tg-theme-text-color, #ffffff)'}; padding: 8px 12px; border-radius: 4px; cursor: pointer; flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  ${property.is_liked ? '❤️' : '🤍'}
                  <span>${property.is_liked ? 'В избранном' : 'В избранное'}</span>
                </button>
              </div>
            </div>
          `,
          type: 'property',
          propertyId: property.id
        },
        {
          preset: property.is_liked ? 'islands#redCircleDotIcon' : 'islands#greenCircleDotIcon'
        }
      );
      map.geoObjects.add(placemark);
    });
  }, [map]);

  const fetchProperties = useCallback(async () => {
        if (!telegramUser || !hasProfile || !user) return;

    const cachedProperties = sessionStorage.getItem('map_properties');
    if (cachedProperties) {
      const parsedProperties = JSON.parse(cachedProperties);
      setProperties(parsedProperties);
      console.log('Loaded properties from cache');
      return; // Properties are loaded, useEffect below will add markers
    }

    try {
      setLoading(true);
      console.log('Fetching properties for user:', telegramUser.id);
      const data = await apiService.getProperties(telegramUser.id);
      console.log('Received properties from API:', data.length);
      
      // Get metro station coordinates for filtering
      const metroCoordinates = getMetroStationCoordinates(user.metro_station);
      console.log('User metro station:', user.metro_station, 'coordinates:', metroCoordinates);
      console.log('User search radius:', user.search_radius);
      console.log('User price range:', user.price_range_min, '-', user.price_range_max);
      
      // Filter properties by distance from metro station and price range
      const filteredProperties = data.filter(property => {
        // Distance filter
        if (metroCoordinates) {
          const distance = calculateDistance(
            metroCoordinates[0], metroCoordinates[1],
            property.latitude, property.longitude
          );
          console.log('Property distance from metro:', distance, 'km');
          
          if (distance > user.search_radius) {
            console.log('Property filtered out due to distance');
            return false;
          }
        }
        
        // Price range filter
        if (user.price_range_min && property.price < user.price_range_min) {
          console.log('Property filtered out due to low price');
          return false;
        }
        
        if (user.price_range_max && property.price > user.price_range_max) {
          console.log('Property filtered out due to high price');
          return false;
        }
        
        return true;
      });
      
      console.log('Filtered properties:', filteredProperties.length);
            setProperties(filteredProperties);
      sessionStorage.setItem('map_properties', JSON.stringify(filteredProperties));
      
      // Markers will be added by the useEffect below
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  }, [telegramUser, hasProfile, user, map]);

  useEffect(() => {
    if (hasProfile && map) {
      fetchProperties();
    }
  }, [hasProfile, map, fetchProperties]);

  // Effect to add/update markers when properties or map changes
  useEffect(() => {
    if (map && properties.length > 0) {
      addPropertyMarkersToMap(properties);
    }
  }, [map, properties, addPropertyMarkersToMap]);

  const updateMapMarkers = useCallback((updatedProperties) => {
    if (!map) return;
    
    console.log('Updating map markers with properties:', updatedProperties);
    
    // Update existing property markers instead of recreating them
    map.geoObjects.each(obj => {
      if (obj.properties && obj.properties.get('type') === 'property') {
        // Find the corresponding property in updatedProperties
        const propertyId = obj.properties.get('propertyId');
        const updatedProperty = updatedProperties.find(p => p.id === propertyId);
        
        if (updatedProperty) {
          // Update the marker's preset (color) based on is_liked status
          obj.options.set('preset', updatedProperty.is_liked ? 'islands#redCircleDotIcon' : 'islands#greenCircleDotIcon');
          
          // Update the balloon content to reflect the new button text
          obj.properties.set('balloonContent', `
            <div style="padding: 10px; max-width: 300px; background: var(--tg-theme-bg-color, #ffffff); color: var(--tg-theme-text-color, #000000);">
              <h3 style="margin: 0 0 10px 0; color: var(--tg-theme-text-color, #000000);">${updatedProperty.title}</h3>
              <p style="margin: 0 0 5px 0; color: var(--tg-theme-hint-color, #666666);">${updatedProperty.address}</p>
              <p style="margin: 0 0 5px 0;"><strong>Цена:</strong> ${updatedProperty.price.toLocaleString()} ₽/мес</p>
              <p style="margin: 0 0 5px 0;"><strong>Комнат:</strong> ${updatedProperty.rooms}</p>
              <p style="margin: 0 0 5px 0;"><strong>Площадь:</strong> ${updatedProperty.area} м²</p>
              <p style="margin: 0 0 10px 0;"><strong>Метро:</strong> ${updatedProperty.metro_station}</p>
              <div style="display: flex; gap: 10px;">
                <button onclick="window.selectProperty('${updatedProperty.id}')" 
                        style="background: var(--tg-theme-button-color, #2481cc); color: var(--tg-theme-button-text-color, #ffffff); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; flex: 1;">
                  Подробнее
                </button>
                <button onclick="window.toggleFavorite('${updatedProperty.id}')" 
                        style="background: ${updatedProperty.is_liked ? '#ff4444' : 'var(--tg-theme-button-color, #2481cc)'}; color: var(--tg-theme-button-text-color, #ffffff); border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; flex: 1;">
                  ${updatedProperty.is_liked ? '❤️ Убрать' : '🤍 В избранное'}
                </button>
              </div>
            </div>
          `);
        }
      }
    });
    
    console.log('Updated existing property markers');
  }, [map]);

  const handleLikeProperty = useCallback(async (propertyId) => {
    if (!telegramUser) return;

    try {
      console.log('Toggling favorite for property:', propertyId);
      hapticFeedback('impact', 'light');
      await apiService.createLike(telegramUser.id, propertyId, 'property');
      
      // Update local state - toggle the liked status
      let updatedProperties = [];
      setProperties(prev => {
        updatedProperties = prev.map(p => {
          if (p.id === propertyId) {
            const newLikedStatus = !p.is_liked;
            console.log('Updating property liked status:', p.id, 'from', p.is_liked, 'to', newLikedStatus);
            return { ...p, is_liked: newLikedStatus };
          }
          return p;
        });
        console.log('Updated properties array:', updatedProperties);
        return updatedProperties;
      });
      
      // Update map markers
      updateMapMarkers(updatedProperties);
      
      // Find current property to determine message
      const currentProperty = updatedProperties.find(p => p.id === propertyId);
      const message = currentProperty?.is_liked 
        ? 'Объявление удалено из избранного!' 
        : 'Объявление добавлено в избранное!';
      console.log('Show alert message:', message);
      showAlert(message);
      
      // Just update the properties state, map will re-render automatically
      // Avoid calling initMap() and fetchProperties() to prevent infinite loops
    } catch (error) {
      console.error('Error toggling property favorite:', error);
      showAlert('Ошибка при изменении избранного');
    }
  }, [telegramUser, hapticFeedback, showAlert, properties, updateMapMarkers]);

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

  return (
    <div className="fixed inset-0 bg-telegram-bg">
      {/* Header */}
      <div className="bg-telegram-secondary p-4 shadow-lg z-10 relative">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-telegram-text">Карта объявлений</h1>
            <div className="text-xs text-telegram-text/60 mt-1">
              📍 {user?.metro_station} • 📏 {user?.search_radius} км • 💰 {user?.price_range_min?.toLocaleString()}-{user?.price_range_max?.toLocaleString()} ₽
            </div>
          </div>
          <div className="text-sm text-telegram-text/70">
            Найдено: {properties.length}
          </div>
        </div>
      </div>

      {/* Map Container - Full Screen */}
      <div className="absolute top-16 left-0 right-0 bottom-0">
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

      {/* Properties List */}
      <div className="p-4">
        <div className="grid gap-4">
          {properties.slice(0, 5).map(property => (
            <div
              key={property.id}
              className="property-card p-4 cursor-pointer"
              onClick={() => setSelectedProperty(property)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-telegram-text text-sm">
                  {property.title}
                </h3>
                <span className="text-telegram-button font-bold text-sm">
                  {property.price.toLocaleString()} ₽
                </span>
              </div>
              <p className="text-telegram-text/70 text-xs mb-2">
                {property.rooms} комн. • {property.area} м² • {property.metro_station}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-telegram-text/60 text-xs">
                  {property.address.slice(0, 40)}...
                </span>
                {property.is_liked && (
                  <span className="text-red-500 text-sm">❤️</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapView;