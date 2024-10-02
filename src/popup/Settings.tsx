import React, { useState, useEffect } from 'react';

interface SettingsProps {
  showPopup: boolean;
  showSound: boolean;
  pollInterval: number;
  alertTimeout: number;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  showPopup,
  showSound,
  pollInterval,
  alertTimeout,
  onClose,
}) => {
  const [popupEnabled, setPopupEnabled] = useState(showPopup);
  const [soundEnabled, setSoundEnabled] = useState(showSound);
  const [pollIntervalValue, setPollIntervalValue] = useState(pollInterval);
  const [alertTimeoutValue, setAlertTimeoutValue] = useState(alertTimeout);

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
          result.showPopup !== undefined ? result.showPopup : showPopup
        );
        setSoundEnabled(
          result.showSound !== undefined ? result.showSound : showSound
        );
        setPollIntervalValue(result.pollInterval || pollInterval);
        setAlertTimeoutValue(result.alertTimeout || alertTimeout);
      }
    );
  }, [showPopup, showSound, pollInterval, alertTimeout]);

  // Handle settings change
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
          onClose(); // Close the settings after saving
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
