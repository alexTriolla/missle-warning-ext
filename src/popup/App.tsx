// src/App.tsx

import React, { useState, useEffect, useRef } from 'react';
import { styles } from './styles';
import { AlertItem } from '../types';
import './styles.css'; // Ensure styles are correctly imported

const App: React.FC = () => {
  const [warning, setWarning] = useState<AlertItem | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showPopup, setShowPopup] = useState<boolean>(true);
  const [showSound, setShowSound] = useState<boolean>(false); // New state for sound toggle
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio element with correct path
    audioRef.current = new Audio(chrome.runtime.getURL('sounds/alert.mp3'));
    audioRef.current.loop = false; // Do not loop

    // Preload audio to reduce latency
    if (audioRef.current) {
      audioRef.current.preload = 'auto';
    }

    // Fetch the initial settings for showing popup and sound
    chrome.storage.local.get(['showPopup', 'showSound'], (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          'Error getting settings from storage:',
          chrome.runtime.lastError
        );
        return;
      }
      setShowPopup(result.showPopup !== undefined ? result.showPopup : true); // Default from env
      setShowSound(result.showSound !== undefined ? result.showSound : false); // Default from env
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

          // Play alert sound if showSound is enabled
          if (showSound && audioRef.current) {
            audioRef.current.play().catch((error) => {
              console.error(
                'Error playing alert sound:',
                error.message || error
              );
            });
          }
        } else {
          setWarning(null);
          console.log('latestWarning removed from storage.');

          // Stop and reset the alert sound if it's playing
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            console.log('Alert sound stopped.');
          }
        }
      }
    };

    chrome.storage.onChanged.addListener(onStorageChange);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(onStorageChange);
      console.log('Storage change listener removed.');
    };
  }, [showSound]); // Dependency on showSound

  const handleClose = () => {
    window.close();
  };

  // Toggle the sound setting
  const handleToggleSound = () => {
    const newShowSound = !showSound;
    if (newShowSound) {
      // Attempt to play the audio to satisfy autoplay policies
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            setShowSound(true);
            console.log('Alert sounds enabled.');
            chrome.storage.local.set({ showSound: true }, () => {
              if (chrome.runtime.lastError) {
                console.error(
                  'Error setting showSound:',
                  chrome.runtime.lastError
                );
              } else {
                console.log('showSound state saved.');
              }
            });
          })
          .catch((error) => {
            console.error('Error playing alert sound:', error.message || error);
            alert(
              'Unable to enable alert sounds. Please interact with the popup to allow sounds.'
            );
          });
      }
    } else {
      // Disable alert sounds
      setShowSound(false);
      console.log('Alert sounds disabled.');
      chrome.storage.local.set({ showSound: false }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error setting showSound:', chrome.runtime.lastError);
        } else {
          console.log('showSound state saved.');
        }
      });
    }
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
            {/* Add a flashing border */}
            <div
              style={{
                width: '100%',
                height: '5px',
                backgroundColor: '#e74c3c',
                animation: 'flash 1s infinite',
              }}
            ></div>
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
        <label style={{ marginTop: '10px' }}>
          <input
            type="checkbox"
            checked={showSound}
            onChange={handleToggleSound}
          />
          Enable Alert Sounds
        </label>
      </footer>
      {/* Hidden audio element is not necessary since we're using the ref */}
    </div>
  );
};

export default App;
