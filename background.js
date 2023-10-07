// background.js
function fetchDataAndStore() {
  console.log('Attempting to fetch data...');
  
  fetch(`https://azi.blob.core.windows.net/hltv/lolmatches.json?timestamp=${new Date().getTime()}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok'); 
      }
      return response.json();
    })
    .then(data => {
      console.log('Data fetched:', data);
      chrome.storage.local.set({ matchesData: data }, () => {
        console.log('Data fetched and stored.');
        
        // Count the number of live matches
        const liveMatchesCount = data.filter(match => match.date === "Date not specified").length;
        
        // Update the badge
        if (liveMatchesCount > 0) {
          chrome.action.setBadgeText({text: liveMatchesCount.toString()});
          chrome.action.setBadgeBackgroundColor({color: '#2b6ea4'});
        } else {
          chrome.action.setBadgeText({text: ''}); // Clear badge when liveMatchesCount is 0
        }
        
        // Send a message to popup.js to let it know that new data is available
        chrome.runtime.sendMessage({message: 'data_updated'}, function(response) {
          if (chrome.runtime.lastError) {
            console.warn(chrome.runtime.lastError.message);
          } else {
            // Handle the response or do other things.
          }
        });
      });
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
}


// Event listener for the install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  fetchDataAndStore();
});

// Event listener for the activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated.');
  fetchDataAndStore();
});

// Create an alarm that fires every 10 minute
chrome.alarms.get('fetchDataAlarm', (alarm) => {
  if (!alarm) {
    chrome.alarms.create('fetchDataAlarm', { periodInMinutes: 10 });
  }
});


// Set up an alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm fired:', alarm.name);
  if (alarm.name === 'fetchDataAlarm') {
    fetchDataAndStore();
  }
});


// fetch data when Chrome starts up
chrome.runtime.onStartup.addListener(() => {
  fetchDataAndStore();
});

