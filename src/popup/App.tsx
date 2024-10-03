// src/popup/App.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Settings from './Settings';
import './styles.css';
import { useTranslation } from 'react-i18next';
import { AlertItem } from '../types';
import i18n from '../i18n';

const App: React.FC = () => {
  const { t } = useTranslation();

  const [warnings, setWarnings] = useState<AlertItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showSound, setShowSound] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Function to send geolocation to background
  const sendGeolocationToBackground = useCallback(
    (geo: { lat: number; lon: number }) => {
      chrome.runtime.sendMessage(
        { type: 'UPDATE_GEOLOCATION', data: geo },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              'Error sending geolocation to background:',
              chrome.runtime.lastError
            );
          } else {
            console.log('Geolocation sent to background:', response);
          }
        }
      );
    },
    []
  );

  // Fetch settings from chrome.storage
  const fetchSettings = useCallback(() => {
    chrome.storage.local.get(
      [
        'showPopup',
        'showSound',
        'pollInterval',
        'alertTimeout',
        'pollingEnabled',
        'language',
      ],
      (result) => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error getting settings from storage:',
            chrome.runtime.lastError
          );
          return;
        }
        setShowSound(result.showSound !== undefined ? result.showSound : false);
        if (result.language && result.language !== i18n.language) {
          // Change language only if it's different from the current language
          i18n.changeLanguage(result.language);
        }
      }
    );
  }, []);

  // Fetch accurate geolocation function
  const fetchAccurateGeolocation = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const geolocation = await getAccurateGeolocation();
      setCurrentLocation(geolocation);
      sendGeolocationToBackground(geolocation);
    } catch (error: unknown) {
      console.error('Error obtaining geolocation:', error);
      try {
        const ipGeo = await getIPGeolocation();
        if (ipGeo) {
          setCurrentLocation(ipGeo);
          sendGeolocationToBackground(ipGeo);
        } else {
          setErrorMessage(t('Unable to retrieve location.'));
        }
      } catch (ipError: unknown) {
        console.error('Error obtaining IP-based geolocation:', ipError);
        setErrorMessage(t('Unable to retrieve location.'));
      }
    } finally {
      setLoading(false);
    }
  }, [sendGeolocationToBackground, t]); // If t is stable, it's okay; otherwise, consider excluding

  const getAccurateGeolocation = (): Promise<{ lat: number; lon: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            resolve({ lat: latitude, lon: longitude });
          },
          (error) => reject(error),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    });
  };

  const getIPGeolocation = async (): Promise<{
    lat: number;
    lon: number;
  } | null> => {
    try {
      const response = await fetch('http://ip-api.com/json/');
      if (!response.ok)
        throw new Error(`IP Geolocation API error: ${response.status}`);
      const data = await response.json();
      if (data.status === 'success') {
        return { lat: data.lat, lon: data.lon };
      } else {
        return null;
      }
    } catch {
      return null;
    }
  };

  // Separate useEffect for language changes (runs once on mount)
  useEffect(() => {
    // Initial fetch of settings including language
    fetchSettings();
  }, [fetchSettings]);

  // Main useEffect for initializing audio, fetching geolocation, and handling warnings
  useEffect(() => {
    audioRef.current = new Audio(chrome.runtime.getURL('sounds/alert.mp3'));
    audioRef.current.loop = false;
    audioRef.current.preload = 'auto';
    fetchAccurateGeolocation();

    // Listen for changes in latestWarnings and language in chrome.storage
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local') {
        if ('latestWarnings' in changes) {
          const change = changes.latestWarnings;
          const newWarnings = change.newValue as AlertItem[] | undefined;
          if (newWarnings) {
            setWarnings(newWarnings);
            setLastUpdated(new Date());

            if (newWarnings.length > 0 && showSound) {
              audioRef.current?.play();
            }
          }
        }

        if ('language' in changes) {
          const change = changes.language;
          const newLanguage = change.newValue as string | undefined;
          if (newLanguage && newLanguage !== i18n.language) {
            i18n.changeLanguage(newLanguage);
          }
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // Fetch initial warnings
    chrome.storage.local.get(['latestWarnings'], (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          'Error getting latestWarnings from storage:',
          chrome.runtime.lastError
        );
        return;
      }
      if (result.latestWarnings) {
        setWarnings(result.latestWarnings);
        setLastUpdated(new Date());
        if (result.latestWarnings.length > 0 && showSound) {
          audioRef.current?.play();
        }
      }
    });

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [fetchAccurateGeolocation, showSound]);

  const handleSettingsOpen = () => setIsSettingsOpen(true);
  const handleSettingsClose = () => setIsSettingsOpen(false);

  // Determine the text direction based on current language
  const direction = i18n.language === 'he' ? 'rtl' : 'ltr';

  if (isSettingsOpen) {
    return (
      <Settings
        onClose={handleSettingsClose}
        currentLocation={currentLocation}
      />
    );
  }

  return (
    <div className="container" dir={direction}>
      <header className="header">
        <h1 className="headerTitle">{t('Missile Alert')}</h1>
      </header>
      <div className="content">
        {loading ? (
          <p className="loading">{t('Fetching your location...')}</p>
        ) : errorMessage ? (
          <p className="errorMessage">{errorMessage}</p>
        ) : warnings.length > 0 ? (
          <div className="warningsContainer">
            {warnings.map((warning) => (
              <div key={warning.id} className="warningBox">
                <p className="warningMessage">
                  {t('Missile alert for')} {warning.header}
                </p>
                <p className="warningDetails">
                  {t('Message')}: {warning.text}
                </p>
              </div>
            ))}
            <p className="lastUpdated">
              {t('Last updated')}: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        ) : (
          <p className="noWarning">{t('No current warnings')}</p>
        )}
      </div>
      <footer className="footer">
        <button onClick={handleSettingsOpen} className="settingsButton">
          ⚙️ {t('Settings')}
        </button>
      </footer>
    </div>
  );
};

export default App;
