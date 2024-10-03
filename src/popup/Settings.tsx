// src/popup/Settings.tsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface SettingsProps {
  onClose: () => void;
  currentLocation: { lat: number; lon: number } | null;
}

const Settings: React.FC<SettingsProps> = ({ onClose, currentLocation }) => {
  const { t, i18n } = useTranslation();
  const [popupEnabled, setPopupEnabled] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [pollIntervalValue, setPollIntervalValue] = useState<number>(0.1);
  const [alertTimeoutValue, setAlertTimeoutValue] = useState<number>(100000);
  const [pollingEnabled, setPollingEnabled] = useState<boolean>(true);
  const [language, setLanguage] = useState<string>('en');

  // Fetch settings from chrome.storage when the component mounts
  useEffect(() => {
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
        setPopupEnabled(
          result.showPopup !== undefined ? result.showPopup : false
        );
        setSoundEnabled(
          result.showSound !== undefined ? result.showSound : false
        );
        setPollIntervalValue(
          result.pollInterval ? Number(result.pollInterval) : 0.1
        ); // Default to 0.1 minutes (6 seconds)
        setAlertTimeoutValue(
          result.alertTimeout ? Number(result.alertTimeout) : 100000
        ); // Default to 100000 ms
        setPollingEnabled(
          result.pollingEnabled !== undefined ? result.pollingEnabled : true
        );
        setLanguage(result.language || 'en');
      }
    );
  }, []);

  // Handle settings change and save to chrome.storage
  const handleSaveSettings = () => {
    // Validate pollIntervalValue
    const validatedPollInterval =
      pollIntervalValue < 0.1 ? 0.1 : pollIntervalValue;
    if (pollIntervalValue < 0.1) {
      alert(
        t(
          'Poll interval cannot be less than 0.1 minute (6 seconds). It has been set to 0.1 minute.'
        )
      );
    }

    // Validate alertTimeoutValue
    const validatedAlertTimeout =
      alertTimeoutValue < 1000 ? 1000 : alertTimeoutValue;
    if (alertTimeoutValue < 1000) {
      alert(
        t(
          'Alert timeout cannot be less than 1000 milliseconds. It has been set to 1000 ms.'
        )
      );
    }

    chrome.storage.local.set(
      {
        showPopup: popupEnabled,
        showSound: soundEnabled,
        pollInterval: validatedPollInterval,
        alertTimeout: validatedAlertTimeout,
        pollingEnabled: pollingEnabled,
        language: language,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving settings:', chrome.runtime.lastError);
        } else {
          console.log('Settings saved successfully.');
          onClose(); // Close the settings page after saving
        }
      }
    );
  };

  // Handle language change
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLanguage = e.target.value;
    setLanguage(selectedLanguage);
    i18n.changeLanguage(selectedLanguage);
    chrome.storage.local.set({ language: selectedLanguage }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          'Error saving language setting:',
          chrome.runtime.lastError
        );
      } else {
        console.log('Language setting saved successfully.');
      }
    });
  };

  // Determine text direction based on language
  const direction = i18n.language === 'he' || i18n.language === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="settingsPage" dir={direction}>
      <h2>{t('Settings')}</h2>
      <label>
        {t('Enable Popup')}
        <input
          type="checkbox"
          checked={popupEnabled}
          onChange={() => setPopupEnabled(!popupEnabled)}
        />
      </label>
      <label>
        {t('Enable Sound')}
        <input
          type="checkbox"
          checked={soundEnabled}
          onChange={() => setSoundEnabled(!soundEnabled)}
        />
      </label>
      <label>
        {t('Poll Interval (minutes)')}:
        <input
          type="number"
          value={pollIntervalValue}
          onChange={(e) =>
            setPollIntervalValue(Math.max(0.1, Number(e.target.value)))
          }
          min="0.1"
          step="0.1"
        />
      </label>
      <label>
        {t('Alert Timeout (ms)')}:
        <input
          type="number"
          value={alertTimeoutValue}
          onChange={(e) =>
            setAlertTimeoutValue(Math.max(1000, Number(e.target.value)))
          }
          min="1000"
        />
      </label>
      <label>
        {t('Enable Polling')}
        <input
          type="checkbox"
          checked={pollingEnabled}
          onChange={() => setPollingEnabled(!pollingEnabled)}
        />
      </label>
      <label>
        {t('Language')}:
        <select value={language} onChange={handleLanguageChange}>
          <option value="en">{t('English')}</option>
          <option value="he">{t('Hebrew')}</option>
          <option value="ru">{t('Russian')}</option>
          <option value="ar">{t('Arabic')}</option>
        </select>
      </label>
      <div className="currentLocation">
        <h3>{t('Current Location')}</h3>
        {currentLocation ? (
          <p>
            {t('Latitude')}: {currentLocation.lat.toFixed(4)}, {t('Longitude')}:{' '}
            {currentLocation.lon.toFixed(4)}
          </p>
        ) : (
          <p>{t('Location not available.')}</p>
        )}
      </div>
      <div className="settingsButtons">
        <button onClick={handleSaveSettings}>{t('Save')}</button>
        <button onClick={onClose}>{t('Cancel')}</button>
      </div>
    </div>
  );
};

export default Settings;
