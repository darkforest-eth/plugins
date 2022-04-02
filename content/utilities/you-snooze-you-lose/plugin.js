// You Snooze, You Lose!
//
// Find out when players are asleep, and punish them severely!
//
// author: https://twitter.com/davidryan59 (dryan.eth)
// thanks: Bulmenisaurus, 9STX6, Velorum for assistance and feedback
import { THEGRAPH_API_URL } from "https://cdn.skypack.dev/@darkforest_eth/constants";
const ALL_TWITTERS_URL = 'https://api.zkga.me/twitter/all-twitters';

// -----------------------------
// Constants and user editable parameters

const DAYS_TO_SEARCH = 365;  // Number of days of moves history to search
const MAX_TOTAL_MOVES = 10000;    // After 10 batches of 1000, we have enough data to make good stats
const SS0 = -1;  // Standard scores to determine colour bands
const SS1 = -1/3;
const SS2 = 1/3;
const SS3 = 1;
const DEV_MODE = false;  // Put as true to highlight UI sections for debugging
const PLAYER_DISPLAY_CHARS = 20;

const PLUGIN_NAME = "You Snooze, You Lose!";
const MAX_GRAPH_QL_BATCH = 1000;  // GraphQL will retrieve up to 1000 objects in one go

const COL_DEFAULT = '#000000'; 
const COL_TOTAL = '#444444';
const COL_ERR = '#440000';
const COL_SCORES = [
  '#007700',
  '#557700',
  '#887700',
  '#884400',
  '#880000',
];

const WINDOW_WIDTH = '310px';
const WINDOW_HEIGHT = '600px';
const RESULTS_SIZE = '81%';
const INPUT_WIDTH = '180px';
const BUTTON_SEARCH_WIDTH = '200px';
const BUTTON_CLEAR_WIDTH = '60px';
const UI_ELT_HEIGHT = '32px';
const UI_ELT_SMALL_HEIGHT = '28px';

const HOURS_IN_DAY = 24;
const SECONDS_IN_HOUR = 60 * 60;
const MS_IN_HOUR = SECONDS_IN_HOUR * 1000;

// -----------------------------


const getTimeS = timeMS => Math.round(0.001 * timeMS);

const getSnoozeQuery = (playerAddress, firstTimeMS, lastTimeMS) => `{
  arrivals(
    where: {
      player: "${playerAddress}",
      departureTime_gt: ${getTimeS(firstTimeMS)},
      departureTime_lt: ${getTimeS(lastTimeMS)}
    },
    orderBy: departureTime,
    orderDirection: desc,
    first: ${MAX_GRAPH_QL_BATCH}
  ) {
      departureTime
  }
}`;

const getGraphQLData = async (query, graphApiUrl = THEGRAPH_API_URL) => {
  const response = await fetch(graphApiUrl, {
    method: "POST",
    body: JSON.stringify({ query }),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    }
  });
  const json = await response.json();
  return json;
};

const getResultsDiv = (content, bgCol=COL_DEFAULT, size='100%') => {
  const resultsDiv = document.createElement('div');
  resultsDiv.style.backgroundColor = bgCol;
  resultsDiv.style.textAlign = 'center';
  resultsDiv.style.fontSize = size;
  resultsDiv.append(content);
  return resultsDiv;
};

class YouSnoozeYouLose {
  constructor() {
    this.twitters = {};
    this.fetchTwitters();
    this.userInput = this.createInput('Click a planet');
    this.searching = false;
    this.arrivals = [];
    this.movesResults = [];
    this.resultsTable = document.createElement("div");
    if (DEV_MODE) this.resultsTable.style.background = "#FF0000";
    console.log(`Initialised ${PLUGIN_NAME} plugin:`);
    console.dir(this);
  }

  fetchTwitters = () => {
    fetch(ALL_TWITTERS_URL)
    .then(response => response.json())
    .then(twitters => {
      this.twitters = twitters;
    });
  }

  createInput = placeholder => {
    const createdInput = document.createElement('input');
    createdInput.placeholder = placeholder;
    createdInput.style.color = 'black';
    createdInput.style.padding = '5px';
    createdInput.style.marginLeft = '5px';
    createdInput.style.width = INPUT_WIDTH;
    createdInput.style.height = UI_ELT_HEIGHT;
    createdInput.addEventListener("keyup", evt => {
      // Number 13 is the "Enter" key on the keyboard
      if (evt.keyCode === 13) {
        // Cancel the default action, if needed
        evt.preventDefault();
        // Blur the input box
        createdInput.blur();
        // Trigger the button element with a click
        this.doSearch();
      }
    });
    return createdInput;
  }

  resetResultsTable() {
    while (this.resultsTable.firstChild) {
      this.resultsTable.removeChild(this.resultsTable.lastChild);
    }
  }

  resetMovesData() {
    this.movesResults = [];
    for (let i=0; i<HOURS_IN_DAY; i++) this.movesResults.push(0);
  }

  async doSearch() {
    // Only proceed if not already searching
    if (this.searching) return;
    this.searching = true;
    this.resetResultsTable();
    this.resetMovesData();

    // Search for player based on input
    let userInputValue = this.userInput.value;
    if (!userInputValue) {
      const planet = ui.getSelectedPlanet();
      if (planet) {
        userInputValue = planet.owner;
        if (this.twitters[userInputValue]) userInputValue = this.twitters[userInputValue];
        this.userInput.value = userInputValue;
        this.resultsTable.append(getResultsDiv('Planet owner selected'));
      } else {
        this.resultsTable.append(getResultsDiv('Click a planet, or enter player Twitter handle or Eth address', COL_ERR));
      }
    } else {

      // Search for player based on Twitter or address
      const useValue = userInputValue.startsWith('@') ? userInputValue.slice(1) : userInputValue;
      const player = ui.getAllPlayers().find(player => {
        return player.address === useValue || player.twitter === useValue;
      })
      if (!player) {
        this.resultsTable.append(getResultsDiv(`Player '${useValue.slice(0, PLAYER_DISPLAY_CHARS) + (useValue.slice(PLAYER_DISPLAY_CHARS)?'...':'')}' could not be found`, COL_ERR));
        this.userInput.value = '';
      } else {

        // Player found, search their moves history in batches
        this.arrivals = [];
        const searchTimeMS = new Date().getTime();
        const firstTimeMS = searchTimeMS - DAYS_TO_SEARCH * HOURS_IN_DAY * MS_IN_HOUR;
        let queryLatestTimeMS = searchTimeMS;
        this.resultsTable.append(getResultsDiv(`Searching moves from The Graph in last ${DAYS_TO_SEARCH} days...`));
        for (let i = 0; ; i++) {
          const graphQuery = getSnoozeQuery(player.address, firstTimeMS, queryLatestTimeMS);
          const graphResponse = await getGraphQLData(graphQuery);
          const arr = graphResponse.data.arrivals;
          this.resultsTable.append(getResultsDiv(`Downloaded ${arr.length} moves`));
          queryLatestTimeMS = arr[arr.length - 1].departureTime * 1000;
          this.arrivals.push(...arr);
          if (arr.length < MAX_GRAPH_QL_BATCH || this.arrivals.length >= MAX_TOTAL_MOVES) break;
        }
        this.resultsTable.append(getResultsDiv(`Download complete! ${this.arrivals.length} moves downloaded`));

        // Count number of arrivals (movesResults) in each hour of the day
        const hourInDayArray = this.arrivals.map(obj => Math.floor(((searchTimeMS / 1000) - obj.departureTime) / SECONDS_IN_HOUR % HOURS_IN_DAY));
        for (let i = 0; i < hourInDayArray.length; i++) this.movesResults[hourInDayArray[i]] += 1;
    
        // Get moves stats
        let totalMoves = 0;    // after loop, should equal this.arrivals.length
        let totalMovesSq = 0;  // needs loop to calculate
        for (let i = 0; i < HOURS_IN_DAY; i++) {
          const mv = this.movesResults[i] || 0;
          totalMoves += mv;
          totalMovesSq += mv * mv;
        }
    
        // If moves found, redraw the table with colour bands
        this.resetResultsTable();
        if (totalMoves < 1) {
          this.resultsTable.append(getResultsDiv(`No moves found in last ${HOURS_IN_DAY} hours`, COL_ERR));
        } else {
          this.resultsTable.append(getResultsDiv(`Total moves found: ${totalMoves}`, COL_TOTAL));
          const avg = totalMoves / HOURS_IN_DAY;  // mean average
          const sd = (totalMovesSq / HOURS_IN_DAY - avg * avg) ** 0.5;  // standard deviation
          for (let i=0; i<HOURS_IN_DAY; i++) {
            const subtractHour = i + 1;
            const numberOfMoves = this.movesResults[i] || 0;
            const ss = sd > 0 ? (numberOfMoves - avg) / sd : 0;  // standard score

            // Construct index from 0 (few moves) to 4 (more than average moves) for the colour
            const idx = ss < SS0 ? 0 : ss < SS1 ? 1 : ss < SS2 ? 2 : ss < SS3 ? 3 : 4;
            const bgCol = COL_SCORES[idx];
            this.resultsTable.append(getResultsDiv(
              `${subtractHour-1} to ${subtractHour} hours ago: ${numberOfMoves} move${numberOfMoves===1?'':'s'}`,
              bgCol,
              RESULTS_SIZE
            ));
          }
        }
      }
    }

    // Async search finished (with success or failure), reset status so it can run again
    this.searching = false;
  }

  async render(container) {
    container.style.textAlign = 'center';
    container.style.width = WINDOW_WIDTH;
    container.style.height = WINDOW_HEIGHT;
    if (DEV_MODE) container.style.backgroundColor = '#000088';

    // Input row
    container.appendChild(this.userInput);
    const clearButton = document.createElement('button');
    clearButton.innerText = 'clear';
    clearButton.onclick = () => {
      this.userInput.value = '';
    };
    clearButton.style.marginLeft = '5px';
    clearButton.style.width = BUTTON_CLEAR_WIDTH;
    clearButton.style.height = UI_ELT_SMALL_HEIGHT;
    container.appendChild(clearButton);

    // Search button
    const searchButton = document.createElement('button');
    searchButton.innerText = 'Check for snoozing!';
    searchButton.onclick = this.doSearch.bind(this);
    searchButton.style.width = BUTTON_SEARCH_WIDTH;
    searchButton.style.height = UI_ELT_HEIGHT;
    const searchRow = document.createElement('div');
    searchRow.style.margin = '15px 0px 10px 0px';
    searchRow.appendChild(searchButton);
    container.appendChild(searchRow);

    // Results table
    container.appendChild(this.resultsTable);
  }

  destroy() {
  }
}

export default YouSnoozeYouLose;
