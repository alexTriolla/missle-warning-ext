import React, { useState, useEffect } from 'react';
import { styles } from './styles';
import { AlertItem } from '../types';

const App: React.FC = () => {
  const [warning, setWarning] = useState<AlertItem | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showPopup, setShowPopup] = useState<boolean>(true);

  useEffect(() => {
    // Fetch the initial setting for showing popup
    chrome.storage.local.get(['showPopup'], (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          'Error getting showPopup setting:',
          chrome.runtime.lastError
        );
        return;
      }
      setShowPopup(result.showPopup !== undefined ? result.showPopup : true); // Default to true if not set
    });

    const fetchLatestWarning = () => {
      chrome.storage.local.get(['latestWarning'], (result) => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error getting latestWarning from storage:',
            chrome.runtime.lastError
          );
          return;
        }

        console.log(
          'Fetched latestWarning from storage:',
          result.latestWarning
        );

        if (result.latestWarning) {
          setWarning(result.latestWarning as AlertItem);
          setLastUpdated(new Date());
          console.log('Warning state updated:', result.latestWarning);
        } else {
          setWarning(null);
          console.log('No latestWarning found in storage.');
        }
      });
    };

    fetchLatestWarning();

    type StorageChanges = { [key: string]: chrome.storage.StorageChange };

    const onStorageChange = (changes: StorageChanges, areaName: string) => {
      if (areaName === 'local' && 'latestWarning' in changes) {
        const storageChange = changes.latestWarning;
        const newValue = storageChange.newValue as AlertItem | undefined;
        console.log('Storage change detected for latestWarning:', newValue);

        if (newValue) {
          setWarning(newValue);
          setLastUpdated(new Date());
          console.log('Warning state updated from storage change:', newValue);
        } else {
          setWarning(null);
          console.log('latestWarning removed from storage.');
        }
      }
    };

    chrome.storage.onChanged.addListener(onStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(onStorageChange);
      console.log('Storage change listener removed.');
    };
  }, []);

  const handleClose = () => {
    window.close();
  };

  // Toggle the popup setting
  const handleTogglePopup = () => {
    const newShowPopup = !showPopup;
    chrome.storage.local.set({ showPopup: newShowPopup }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error setting showPopup:', chrome.runtime.lastError);
      } else {
        setShowPopup(newShowPopup);
        console.log(`Popup setting updated to: ${newShowPopup ? 'ON' : 'OFF'}`);
      }
    });
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Missile Alert</h1>
        <button onClick={handleClose} style={styles.closeButton}>
          ✖
        </button>
      </header>
      <div style={styles.content}>
        {warning ? (
          <div style={styles.warningBox}>
            <p style={styles.warningMessage}>
              Missile alert for: {warning.header}
            </p>
            <p style={styles.warningDetails}>Message: {warning.text}</p>
            <p style={styles.warningDetails}>
              Issued at: {new Date(warning.time).toLocaleTimeString()}
            </p>
            <p style={styles.warningDetails}>
              Valid for: {warning.ttlseconds} seconds
            </p>
            <p style={styles.warningDetails}>RedWeb No: {warning.redwebno}</p>
          </div>
        ) : (
          <p style={styles.noWarning}>No current warnings</p>
        )}
      </div>
      <footer style={styles.footer}>
        <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
        <label>
          <input
            type="checkbox"
            checked={showPopup}
            onChange={handleTogglePopup}
          />
          Show Popup Window
        </label>
      </footer>
    </div>
  );
};

export default App;
