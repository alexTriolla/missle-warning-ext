// src/App.tsx

import React, { useState, useEffect, useRef } from 'react';
import './styles.css'; // Ensure styles are correctly imported

interface AlertItem {
  id: string;
  alertid: string;
  time: string;
  category: string;
  header: string;
  text: string;
  ttlseconds: string;
  redwebno: string;
  title: string;
}

const App: React.FC = () => {
  const [warnings, setWarnings] = useState<AlertItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showPopup, setShowPopup] = useState<boolean>(true);
  const [showSound, setShowSound] = useState<boolean>(false);
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

    const fetchLatestWarnings = () => {
      chrome.storage.local.get(['latestWarnings'], (result) => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error getting latestWarnings from storage:',
            chrome.runtime.lastError
          );
          return;
        }

        console.log(
          'Fetched latestWarnings from storage:',
          result.latestWarnings
        );

        if (result.latestWarnings && Array.isArray(result.latestWarnings)) {
          setWarnings(result.latestWarnings as AlertItem[]);
          setLastUpdated(new Date());
          console.log('Warnings state updated:', result.latestWarnings);

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
          setWarnings([]);
          console.log('No latestWarnings found in storage.');

          // Stop and reset the alert sound if it's playing
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            console.log('Alert sound stopped.');
          }
        }
      });
    };

    fetchLatestWarnings();

    type StorageChanges = { [key: string]: chrome.storage.StorageChange };

    const onStorageChange = (changes: StorageChanges, areaName: string) => {
      if (areaName === 'local' && 'latestWarnings' in changes) {
        const storageChange = changes.latestWarnings;
        const newValue = storageChange.newValue as AlertItem[] | undefined;
        console.log('Storage change detected for latestWarnings:', newValue);

        if (newValue && Array.isArray(newValue)) {
          setWarnings(newValue);
          setLastUpdated(new Date());
          console.log('Warnings state updated from storage change:', newValue);

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
          setWarnings([]);
          console.log('latestWarnings removed from storage.');

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
    <div className="container">
      <header className="header">
        <h1 className="headerTitle">Missile Alert</h1>
        <button onClick={handleClose} className="closeButton">
          ✖
        </button>
      </header>
      <div className="content">
        {warnings.length > 0 ? (
          <div className="warningsContainer">
            {warnings.map((warning) => (
              <div key={warning.id} className="warningBox">
                <p className="warningMessage">
                  Missile alert for: {warning.header}
                </p>
                <p className="warningDetails">Message: {warning.text}</p>
                <p className="warningDetails">
                  Issued at: {new Date(warning.time).toLocaleTimeString()}
                </p>
                <p className="warningDetails">
                  Valid for: {warning.ttlseconds} seconds
                </p>
                <p className="warningDetails">RedWeb No: {warning.redwebno}</p>
                {/* Add a flashing border */}
                <div className="flashingBorder"></div>
              </div>
            ))}
          </div>
        ) : (
          <p className="noWarning">No current warnings</p>
        )}
      </div>
      <footer className="footer">
        <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
        <div className="settings">
          <label className="settingLabel">
            <input
              type="checkbox"
              checked={showPopup}
              onChange={handleTogglePopup}
            />
            Show Popup Window
          </label>
          <label className="settingLabel">
            <input
              type="checkbox"
              checked={showSound}
              onChange={handleToggleSound}
            />
            Enable Alert Sounds
          </label>
        </div>
      </footer>
      {/* Hidden audio element is not necessary since we're using the ref */}
    </div>
  );
};

export default App;
