import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../api';

const DEFAULT_PUBLIC_SETTINGS = {
  platform_name: 'Influencer管理平台',
  platform_short_name: 'Influencer平台',
  allow_self_register: true,
  collaboration_reminder_days: 7,
  default_page_size: 10,
  platform_display_names: {
    '抖音': '抖音',
    '小红书': '小红书',
    'B站': 'B站',
    '微博': '微博'
  }
};

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [publicSettings, setPublicSettings] = useState(DEFAULT_PUBLIC_SETTINGS);
  const [allSettings, setAllSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allSettingsLoading, setAllSettingsLoading] = useState(false);

  const fetchPublicSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getPublic();
      setPublicSettings(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.warn('Failed to fetch public settings, using defaults:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllSettings = useCallback(async () => {
    try {
      setAllSettingsLoading(true);
      const data = await settingsApi.getAll();
      setAllSettings(data);
    } catch (error) {
      console.error('Failed to fetch all settings:', error.message);
    } finally {
      setAllSettingsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (settingsToUpdate) => {
    const result = await settingsApi.batchUpdate(settingsToUpdate);
    
    await fetchPublicSettings();
    await fetchAllSettings();
    
    window.dispatchEvent(new CustomEvent('settings-updated', {
      detail: { settings: settingsToUpdate }
    }));
    
    return result;
  }, [fetchPublicSettings, fetchAllSettings]);

  const getPlatformDisplayName = useCallback((platform) => {
    if (!platform) return '';
    const names = publicSettings.platform_display_names || {};
    return names[platform] || platform;
  }, [publicSettings]);

  const getDefaultPageSize = useCallback(() => {
    return publicSettings.default_page_size || 10;
  }, [publicSettings]);

  useEffect(() => {
    fetchPublicSettings();
  }, [fetchPublicSettings]);

  const value = {
    publicSettings,
    allSettings,
    loading,
    allSettingsLoading,
    fetchPublicSettings,
    fetchAllSettings,
    updateSettings,
    getPlatformDisplayName,
    getDefaultPageSize,
    DEFAULT_PUBLIC_SETTINGS
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
