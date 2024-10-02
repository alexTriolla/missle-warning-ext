import React, { useState, useEffect } from 'react';

interface SettingsProps {
  onClose: () => void; // Removed showPopup and showSound props as these should come from storage
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [popupEnabled, setPopupEnabled] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [pollIntervalValue, setPollIntervalValue] = useState<number>(5);
  const [alertTimeoutValue, setAlertTimeoutValue] = useState<number>(60000);

  // Fetch settings from chrome.storage when the component mounts
  useEffect(() => {
    chrome.storage.local.get(
      ['showPopup', 'showSound', 'pollInterval', 'alertTimeout'],
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
        setPollIntervalValue(result.pollInterval || 5); // Default to 5 minutes
        setAlertTimeoutValue(result.alertTimeout || 60000); // Default to 60 seconds (60000 ms)
      }
    );
  }, []); // Empty dependency array ensures this runs once when the component mounts

  // Handle settings change and save to chrome.storage
  const handleSaveSettings = () => {
    chrome.storage.local.set(
      {
        showPopup: popupEnabled,
        showSound: soundEnabled,
        pollInterval: pollIntervalValue,
        alertTimeout: alertTimeoutValue,
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

  return (
    <div className="settingsPage">
      <h2>Settings</h2>
      <label>
        🖼️ Enable Popup
        <input
          type="checkbox"
          checked={popupEnabled}
          onChange={() => setPopupEnabled(!popupEnabled)}
        />
      </label>
      <label>
        🔔 Enable Sound
        <input
          type="checkbox"
          checked={soundEnabled}
          onChange={() => setSoundEnabled(!soundEnabled)}
        />
      </label>
      <label>
        Poll Interval (minutes):
        <input
          type="number"
          value={pollIntervalValue}
          onChange={(e) =>
            setPollIntervalValue(Math.max(0, Number(e.target.value)))
          }
          min="0"
        />
      </label>
      <label>
        Alert Timeout (ms):
        <input
          type="number"
          value={alertTimeoutValue}
          onChange={(e) =>
            setAlertTimeoutValue(Math.max(0, Number(e.target.value)))
          }
          min="0"
        />
      </label>
      <div className="settingsButtons">
        <button onClick={handleSaveSettings}>💾 Save</button>
        <button onClick={onClose}>❌ Cancel</button>
      </div>
    </div>
  );
};

export default Settings;
