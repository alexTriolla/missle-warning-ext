// src/background.ts

import { AlertResponse, AlertItem } from './types';

const API_URL = import.meta.env.VITE_API_URL;
const POLL_INTERVAL = Number(import.meta.env.VITE_POLL_INTERVAL); // in minutes
const ALERT_TIMEOUT = Number(import.meta.env.VITE_ALERT_TIMEOUT); // in ms
const SHOW_POPUP_DEFAULT = import.meta.env.VITE_SHOW_POPUP === 'true'; // Default popup setting

// Paths to your icon images
const ICONS = {
  NORMAL: {
    '16': chrome.runtime.getURL('icons/icon16.png'),
    '32': chrome.runtime.getURL('icons/icon32.png'),
    '48': chrome.runtime.getURL('icons/icon48.png'),
    '128': chrome.runtime.getURL('icons/icon128.png'),
  },
  WARNING: {
    '16': chrome.runtime.getURL('icons/icon-warning16.png'),
    '32': chrome.runtime.getURL('icons/icon-warning32.png'),
    '48': chrome.runtime.getURL('icons/icon-warning48.png'),
    '128': chrome.runtime.getURL('icons/icon-warning128.png'),
  },
  ERROR: {
    '16': chrome.runtime.getURL('icons/icon-error16.png'),
    '32': chrome.runtime.getURL('icons/icon-error32.png'),
    '48': chrome.runtime.getURL('icons/icon-error48.png'),
    '128': chrome.runtime.getURL('icons/icon-error128.png'),
  },
};

// Function to retrieve user's geolocation and send it to the proxy
async function getUserGeolocation(): Promise<{
  lat: number;
  lon: number;
} | null> {
  return new Promise((resolve) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ lat: latitude, lon: longitude });
        },
        (error) => {
          console.error('Error retrieving geolocation:', error.message);
          resolve(null); // If geolocation fails, we send null to avoid blocking
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
      resolve(null);
    }
  });
}

// Function to check if the popup window is already open
async function isPopupOpen(): Promise<boolean> {
  const windows = await chrome.windows.getAll({ populate: true });
  const popupUrl = chrome.runtime.getURL('assets/index.html');

  return windows.some(
    (window) =>
      window.type === 'popup' &&
      window.tabs?.some((tab) => tab.url === popupUrl)
  );
}

// Function to open the popup window if it's not already open
async function openPopupIfNotOpen() {
  const alreadyOpen = await isPopupOpen();
  const popupUrl = chrome.runtime.getURL('assets/index.html');

  if (!alreadyOpen) {
    chrome.windows.create(
      {
        url: popupUrl,
        type: 'popup',
        width: 400, // Adjust as needed
        height: 600, // Adjust as needed
        state: 'normal', // Ensure the window is not maximized
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error opening popup window:',
            chrome.runtime.lastError
          );
        } else {
          console.log('Popup window opened.');
        }
      }
    );
  } else {
    console.log('Popup window is already open.');
    // Optionally, focus the existing popup window
    chrome.windows.getAll({ populate: true }, (windows) => {
      for (const window of windows) {
        if (window.type === 'popup') {
          for (const tab of window.tabs || []) {
            if (tab.url === popupUrl) {
              if (typeof window.id === 'number') {
                chrome.windows.update(window.id, { focused: true }, () => {
                  if (chrome.runtime.lastError) {
                    console.error(
                      'Error focusing popup window:',
                      chrome.runtime.lastError
                    );
                  } else {
                    console.log('Focused the existing popup window.');
                  }
                });
              } else {
                console.error('Popup window ID is undefined.');
              }
              return;
            }
          }
        }
      }
    });
  }
}

// Function to fetch warnings
async function checkForWarnings() {
  try {
    console.log('Checking for missile warnings...');

    const geo = await getUserGeolocation();
    const url = new URL(API_URL);

    // If geolocation is available, include it in the request as query parameters
    if (geo) {
      url.searchParams.append('lat', geo.lat.toString());
      url.searchParams.append('lon', geo.lon.toString());
      console.log(
        `Sending geolocation with request: lat=${geo.lat}, lon=${geo.lon}`
      );
    }

    const response = await fetch(url.toString(), { method: 'GET' });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: AlertResponse = await response.json();
    console.log('Received data:', data);

    if (data && data.items.length > 0) {
      const allWarnings: AlertItem[] = data.items;
      console.log('Missile warnings detected:', allWarnings);

      // Store all warnings in chrome.storage
      chrome.storage.local.set({ latestWarnings: allWarnings }, () => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error setting latestWarnings in storage:',
            chrome.runtime.lastError
          );
        } else {
          console.log('Latest warnings stored in chrome.storage.');
        }
      });

      // Create a Chrome notification
      chrome.notifications.create(
        'missile-warning',
        {
          type: 'basic',
          iconUrl: ICONS.WARNING['48'],
          title: 'Missile Warning',
          message: `Missile warning issued. ${allWarnings.length} active warnings.`,
          priority: 2,
          buttons: [{ title: 'View Details' }],
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              'Error creating notification:',
              chrome.runtime.lastError
            );
          } else {
            console.log('Notification created.');
          }
        }
      );

      // Change the extension icon to warning state
      chrome.action.setIcon({ path: ICONS.WARNING }, () => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error setting warning icon:',
            chrome.runtime.lastError
          );
        } else {
          console.log('Extension icon changed to warning state.');
        }
      });

      // Open the popup window if not already open and if showPopup is true
      chrome.storage.local.get(['showPopup'], (result) => {
        if (result.showPopup) {
          openPopupIfNotOpen();
        }
      });

      // Revert the icon after the specified timeout duration (from env)
      setTimeout(() => {
        chrome.action.setIcon({ path: ICONS.NORMAL }, () => {
          if (chrome.runtime.lastError) {
            console.error(
              'Error reverting to normal icon:',
              chrome.runtime.lastError
            );
          } else {
            console.log('Extension icon reverted to normal state.');
          }
        });
      }, ALERT_TIMEOUT);
    } else {
      console.log('No missile warning detected.');

      // Ensure the normal icon is set
      chrome.action.setIcon({ path: ICONS.NORMAL }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error setting normal icon:', chrome.runtime.lastError);
        } else {
          console.log('Extension icon set to normal state.');
        }
      });

      // Clear any existing latestWarnings in storage
      chrome.storage.local.remove('latestWarnings', () => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error removing latestWarnings from storage:',
            chrome.runtime.lastError
          );
        } else {
          console.log('Cleared latestWarnings from chrome.storage.');
        }
      });
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error fetching missile warnings:', error.message);
    } else {
      console.error('Unknown error fetching missile warnings');
    }

    // Set the extension icon to error state
    chrome.action.setIcon({ path: ICONS.ERROR }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error setting error icon:', chrome.runtime.lastError);
      } else {
        console.log('Extension icon set to error state.');
      }
    });

    // Create an error notification
    chrome.notifications.create(
      'missile-warning-error',
      {
        type: 'basic',
        iconUrl: ICONS.ERROR['48'],
        title: 'Missile Warning Extension - Error',
        message: `Failed to fetch missile warnings: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        priority: 2,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error creating error notification:',
            chrome.runtime.lastError
          );
        } else {
          console.log('Error notification created.');
        }
      }
    );

    // Revert the icon after the specified timeout duration (from env)
    setTimeout(() => {
      chrome.action.setIcon({ path: ICONS.NORMAL }, () => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error reverting to normal icon:',
            chrome.runtime.lastError
          );
        } else {
          console.log('Extension icon reverted to normal state.');
        }
      });
    }, ALERT_TIMEOUT);
  }
}

// Listener for alarms (using chrome.alarms for reliable polling)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkMissileWarnings') {
    console.log('Alarm triggered:', alarm);
    checkForWarnings();
  }
});

// Listener for notification button clicks
chrome.notifications.onButtonClicked.addListener(
  (notificationId, buttonIndex) => {
    if (notificationId === 'missile-warning' && buttonIndex === 0) {
      // Open the popup content in a new window if not already open
      openPopupIfNotOpen();
    }
  }
);

// Function to initialize the popup setting
function initializePopupSetting() {
  chrome.storage.local.get(['showPopup'], (result) => {
    if (result.showPopup === undefined) {
      chrome.storage.local.set({ showPopup: SHOW_POPUP_DEFAULT }, () => {
        console.log(`Popup setting initialized to: ${SHOW_POPUP_DEFAULT}`);
      });
    }
  });
}

// Listener for extension installation
chrome.runtime.onInstalled.addListener(() => {
  // Initialize the popup setting
  initializePopupSetting();

  // Create the alarm
  chrome.alarms.create('checkMissileWarnings', {
    periodInMinutes: POLL_INTERVAL,
  });
  console.log(
    `Alarm "checkMissileWarnings" created to poll every ${POLL_INTERVAL} minute(s).`
  );

  // Trigger the first check immediately
  checkForWarnings();
});

// Listener for browser startup to ensure the alarm is created
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('checkMissileWarnings', {
    periodInMinutes: POLL_INTERVAL,
  });
  console.log(`Alarm "checkMissileWarnings" recreated on browser startup.`);
});
