import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTelegram } from './TelegramContext';
import { apiService } from '../services/api';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const { user: telegramUser, isReady } = useTelegram();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = async () => {
    if (!telegramUser) return;
    
    try {
      setLoading(true);
      console.log('Fetching user data for telegram_id:', telegramUser.id);
      const userData = await apiService.getCurrentUser(telegramUser.id);
      console.log('Received user data:', userData);
      setUser(userData);
      setError(null);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData) => {
    try {
      setLoading(true);
      console.log('Creating user with data:', userData);
      const newUser = await apiService.createUser({
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        profile_photo_url: telegramUser.photo_url,
        ...userData
      });
      console.log('User created successfully:', newUser);
      setUser(newUser);
      setError(null);
      return newUser;
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userData) => {
    try {
      setLoading(true);
      console.log('Updating user with data:', userData);
      const updatedUser = await apiService.updateCurrentUser(telegramUser.id, userData);
      console.log('User updated successfully:', updatedUser);
      setUser(updatedUser);
      setError(null);
      return updatedUser;
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && telegramUser) {
      fetchUser();
    }
  }, [isReady, telegramUser]);

  const value = {
    user,
    loading,
    error,
    createUser,
    updateUser,
    refreshUser: fetchUser,
    hasProfile: !!user
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};