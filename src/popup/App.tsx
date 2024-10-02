import React, { useState, useEffect, useRef } from 'react';
import Settings from './Settings'; // Import the Settings component
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
  const [pollInterval, setPollInterval] = useState<number>(5); // Default poll interval
  const [alertTimeout, setAlertTimeout] = useState<number>(60000); // Default alert timeout in ms
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false); // Manage whether to show the settings or main screen
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio element with correct path
    audioRef.current = new Audio(chrome.runtime.getURL('sounds/alert.mp3'));
    audioRef.current.loop = false; // Do not loop

    // Preload audio to reduce latency
    if (audioRef.current) {
      audioRef.current.preload = 'auto';
    }

    // Fetch the initial settings for showing popup, sound, poll interval, and alert timeout
    chrome.storage.local.get(['showPopup', 'showSound', 'pollInterval', 'alertTimeout'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting settings from storage:', chrome.runtime.lastError);
        return;
      }
      setShowPopup(result.showPopup !== undefined ? result.showPopup : true); // Default from env
      setShowSound(result.showSound !== undefined ? result.showSound : false); // Default from env
      setPollInterval(result.pollInterval || 5); // Default to 5 minutes if not set
      setAlertTimeout(result.alertTimeout || 60000); // Default to 60 seconds if not set
    });

    const fetchLatestWarnings = () => {
      chrome.storage.local.get(['latestWarnings'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting latestWarnings from storage:', chrome.runtime.lastError);
          return;
        }

        if (result.latestWarnings && Array.isArray(result.latestWarnings)) {
          setWarnings(result.latestWarnings as AlertItem[]);
          setLastUpdated(new Date());
        } else {
          setWarnings([]);
        }
      });
    };

    fetchLatestWarnings();

    type StorageChanges = { [key: string]: chrome.storage.StorageChange };

    const onStorageChange = (changes: StorageChanges, areaName: string) => {
      if (areaName === 'local' && 'latestWarnings' in changes) {
        const newValue = changes.latestWarnings?.newValue as AlertItem[] | undefined;

        if (newValue && Array.isArray(newValue)) {
          setWarnings(newValue);
          setLastUpdated(new Date());
        } else {
          setWarnings([]);
        }
      }
    };

    chrome.storage.onChanged.addListener(onStorageChange);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(onStorageChange);
    };
  }, [showSound]);

  const handleClose = () => {
    window.close();
  };

  const handleSettingsOpen = () => {
    setIsSettingsOpen(true); // Switch to the settings layout
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false); // Switch back to the main layout
  };

  // If the settings page is open, render the Settings component instead of the main layout
  if (isSettingsOpen) {
    return (
      <Settings
        showPopup={showPopup}
        showSound={showSound}
        pollInterval={pollInterval}
        alertTimeout={alertTimeout}
        onClose={handleSettingsClose}
      />
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1 className="headerTitle">Missile Alert</h1>
        <button onClick={handleClose} className="closeButton">✖</button>
      </header>
      <div className="content">
        {warnings.length > 0 ? (
          <div className="warningsContainer">
            {warnings.map((warning) => (
              <div key={warning.id} className="warningBox">
                <p className="warningMessage">Missile alert for: {warning.header}</p>
                <p className="warningDetails">Message: {warning.text}</p>
                <p className="warningDetails">Issued at: {new Date(warning.time).toLocaleTimeString()}</p>
                <p className="warningDetails">Valid for: {warning.ttlseconds} seconds</p>
                <p className="warningDetails">RedWeb No: {warning.redwebno}</p>
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
        <button onClick={handleSettingsOpen} className="settingsButton">
          ⚙️ Settings
        </button>
      </footer>
    </div>
  );
};

export default App;
