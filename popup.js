document.addEventListener("DOMContentLoaded", function () {
  const matchList = document.getElementById("match-list");

  // Initial load from cache
  const cachedMatchListHTML = localStorage.getItem('cachedMatchListHTML');
  if (cachedMatchListHTML) {
    matchList.innerHTML = cachedMatchListHTML;
  }

  const filterSwitch = document.getElementById("filterSwitch");
  const tooltip = document.getElementById("tooltip");

  filterSwitch.addEventListener("mouseenter", function () {
    tooltip.classList.remove("hidden");
  });

  filterSwitch.addEventListener("mouseleave", function () {
    tooltip.classList.add("hidden");
  });

  const majorLoLEvents = ["World Championship", "Worlds", "Mid-Season Invitational", "LCS", "LEC", "LCK", "LPL", "CBLOL", "LCL", "LJL", "LLA", "OPL", "PCS", "TCL", "VCS", "Swiss Stage"];

  // Batched retrieval from Chrome's storage for filterState and matchesData
  chrome.storage.local.get(['filterState', 'matchesData'], function (result) {
    if (result.filterState !== undefined) {
      filterSwitch.checked = result.filterState;
    }
    // Initial update using the matchesData
    updateData(false, result.matchesData);
  });

  // Add event listener for filter switch
  filterSwitch.addEventListener("change", function () {
    // Save the new filter state to Chrome's storage
    chrome.storage.local.set({ 'filterState': filterSwitch.checked });
    updateData(true);
  });

  // Function to update data
  function updateData(shouldCloseWindow = false, initialData = null) {
    const data = initialData || null;

    if (data === null) {
      // If data is null, fetch it here (only if it's really necessary)
      chrome.storage.local.get('matchesData', function (result) {
        processData(result.matchesData, shouldCloseWindow);
      });
    } else {
      processData(data, shouldCloseWindow);
    }
  }

  function processData(data, shouldCloseWindow) {
    let newInnerHTML = "";

    if (!data) {
      newInnerHTML = "<p>Error loading matches data.</p>";
    } else {
      const limitedData = data.slice(0, 20);
      const today = new Date();
      const msPer48Hrs = 48 * 60 * 60 * 1000;
      const msPer3Hrs = 3 * 60 * 60 * 1000;  // Add a 3-hour buffer

      const matchesWithin48Hrs = limitedData.filter(match => {
        if (match.date === "Date not specified") return true;
        const matchDate = new Date(match.date);
        const timeDifference = matchDate.getTime() - today.getTime();

        // Calculate the match end time with the 3-hour buffer
        const matchEndTime = matchDate.getTime() + msPer3Hrs;

        // Display matches if they are starting soon, ongoing, or within 48 hours
        return timeDifference >= -msPer3Hrs && today.getTime() <= matchEndTime && timeDifference <= msPer48Hrs;
      });

      if (matchesWithin48Hrs.length === 0) {
        newInnerHTML = `
            <a href="https://lolesports.com/schedule" target="_blank" class="no-matches-link">
                <img src="css/teemowaiting.png" alt="No matches" class="no-matches-image">
                <div class="footer-link">Click here for the full schedule</div>
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
              <a href="https://lolesports.com/schedule" target="_blank" class="no-matches-link">
                  <img src="css/teemowaiting.png" alt="No matches" class="no-matches-image">
                  <div class="footer-link">Click here for the full schedule</div>
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

    matchList.innerHTML = newInnerHTML;
    localStorage.setItem('cachedMatchListHTML', newInnerHTML);

    const contentHeight = matchList.scrollHeight;
    const singleMatchHeight = 80;
    let maxHeight;

    if (contentHeight > singleMatchHeight * 2) {
      maxHeight = 500;
    } else {
      maxHeight = contentHeight;
    }

    matchList.style.maxHeight = `${maxHeight}px`;
    new SimpleBar(matchList, { autoHide: false });

    if (shouldCloseWindow) {
      window.close();
    }
  }

  // Initial update
  updateData();

  // Listen for messages from background.js
  chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
      if (request.message === 'data_updated') {
        updateData();
      }
    }
  );
});