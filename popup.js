// popup.js
document.addEventListener("DOMContentLoaded", function() {
  const matchList = document.getElementById("match-list");

  // Attach the event delegation handlers to the parent ('matchList')
  matchList.addEventListener("mouseover", function(event) {
    // Identify the target element
    const targetElement = event.target;

    // Check if the target element is the 'footerLink'
    if (targetElement.id === "footer-link") {
      targetElement.style.color = "lightblue";
    }
  });

  matchList.addEventListener("mouseout", function(event) {
    // Identify the target element
    const targetElement = event.target;

    // Check if the target element is the 'footerLink'
    if (targetElement.id === "footer-link") {
      targetElement.style.color = "blue";
    }
  });

  // Initial load from cache
  const cachedMatchListHTML = localStorage.getItem('cachedMatchListHTML');
  if (cachedMatchListHTML) {
    matchList.innerHTML = cachedMatchListHTML;
  }

  const filterSwitch = document.getElementById("filterSwitch");
  const tooltip = document.getElementById("tooltip");

  filterSwitch.addEventListener("mouseenter", function() {
    tooltip.classList.remove("hidden");
  });

  filterSwitch.addEventListener("mouseleave", function() {
    tooltip.classList.add("hidden");
  });

  const majorLoLEvents = ["World Championship", "Worlds", "Mid-Season Invitational", "LCS", "LEC", "LCK", "LPL", "CBLOL", "LCL", "LJL", "LLA", "OPL", "PCS", "TCL", "VCS"];

  // Batched retrieval from Chrome's storage for filterState and matchesData
  chrome.storage.local.get(['filterState', 'matchesData'], function(result) {
    if (result.filterState !== undefined) {
      filterSwitch.checked = result.filterState;
    }
    // Initial update using the matchesData
    updateData(false, result.matchesData);
  });

  // Add event listener for filter switch
  filterSwitch.addEventListener("change", function() {
    // Save the new filter state to Chrome's storage
    chrome.storage.local.set({ 'filterState': filterSwitch.checked });
    updateData(true);
  });

  // Function to update data
  function updateData(shouldCloseWindow = false, initialData = null) {
    const data = initialData || null;

    if (data === null) {
      // If data is null, fetch it here (only if it's really necessary)
      chrome.storage.local.get('matchesData', function(result) {
        processData(result.matchesData, shouldCloseWindow);
      });
    } else {
      processData(data, shouldCloseWindow);
    }
  }


  function processData(data, shouldCloseWindow) {
    // Initialize an empty string to build the new HTML
    let newInnerHTML = "";

    if (!data) {
        newInnerHTML = "<p>Error loading matches data.</p>";
    } else {
        const limitedData = data.slice(0, 20);
        const today = new Date();
        const msPer48Hrs = 48 * 60 * 60 * 1000;

        const matchesWithin48Hrs = limitedData.filter(match => {
            if (match.date === "Date not specified") return true;
            const matchDate = new Date(match.date);
            const timeDifference = matchDate.getTime() - today.getTime();
            return timeDifference >= 0 && timeDifference <= msPer48Hrs;
        });

        if (matchesWithin48Hrs.length === 0) {
            newInnerHTML = `
                <a href="https://lolesports.com/schedule" target="_blank" style="position: relative; display: inline-block;">
                <img src="css/teemowaiting.png" alt="No matches" style="width:300px; height:300px;">
                <div id="footer-link" style="position: absolute; bottom: 0; color: blue; text-align: center; width: 300px; background-color: rgba(0, 0, 0, 0.4);">Click here for the full schedule</div>
                </a>
            `;
        } else {
            const sortedMatches = matchesWithin48Hrs.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateA - dateB;
            });

            const filteredMatches = filterSwitch.checked ? sortedMatches.filter(match => majorLoLEvents.some(event => match.event.includes(event))) : sortedMatches;

            if (filteredMatches.length === 0) {
                newInnerHTML = `
                    <a href="https://lolesports.com/schedule" target="_blank" style="position: relative; display: inline-block;">
                    <img src="css/teemowaiting.png" alt="No matches" style="width:300px; height:300px;">
                    <div id="footer-link" style="position: absolute; bottom: 0; color: blue; text-align: center; width: 300px; background-color: rgba(0, 0, 0, 0.4);">Click here for the full schedule</div>
                    </a>
                `;
            } else {
                newInnerHTML = filteredMatches.map(match => {
                    const team1Logo = (match.team1Logo && match.team1Logo !== "Logo not available") ? match.team1Logo : 'https://www.hltv.org/img/static/team/placeholder.svg';
                    const team2Logo = (match.team2Logo && match.team2Logo !== "Logo not available") ? match.team2Logo : 'https://www.hltv.org/img/static/team/placeholder.svg';
                    const eventName = match.event ? match.event : "Unknown Event";
                    const matchDate = new Date(match.date);
                    const localTime = match.date === "Date not specified" ? "Live" : matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const localDate = match.date === "Date not specified" ? "" : matchDate.toLocaleDateString();
                    const matchLink = "https://lolesports.com/schedule";

                    return `
                        <a href="${matchLink}" target="_blank" class="list-group-item list-group-item-dark">
                            <div class="d-flex w-100 justify-content-between">
                                <div>
                                    <div class="event-name">${eventName}</div>
                                    <div class="team">
                                        <img src="${team1Logo}" alt="${match.team1}" class="team-logo">
                                        <span class="team-name">${match.team1}</span>
                                    </div>
                                    <div class="team">
                                        <img src="${team2Logo}" alt="${match.team2}" class="team-logo">
                                        <span class="team-name">${match.team2}</span>
                                    </div>
                                </div>
                                <div>
                                    <small class="match-time">${localTime}</small>
                                    <small class="match-date">${localDate}</small>
                                </div>
                            </div>
                        </a>
                    `;
                }).join('');
            }
        }
    }

      // Update the DOM with the new content
      matchList.innerHTML = newInnerHTML;

      // Store the new HTML in local storage
      localStorage.setItem('cachedMatchListHTML', newInnerHTML);

      // Calculate the content height after setting the new content
      const contentHeight = matchList.scrollHeight;

      // Assuming each match has a height of 80 pixels
      const singleMatchHeight = 80;
      let maxHeight;

      // Determine the maxHeight based on the number of matches
      if (contentHeight > singleMatchHeight * 2) {
          maxHeight = 500;
      } else {
          maxHeight = contentHeight;
      }

      // Set the maxHeight for the matchList
      matchList.style.maxHeight = `${maxHeight}px`;

      // Initialize SimpleBar for the custom scrollbar
      new SimpleBar(matchList, { autoHide: false });
}


  // Initial update
  updateData();

  // Listen for messages from background.js
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.message === 'data_updated') {
        updateData();
      }
    }
  );
});
