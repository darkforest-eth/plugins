// You Snooze, You Lose!
//
// Find out when players are asleep, and punish them severely!
//
// author: https://twitter.com/davidryan59 (dryan.eth)


// -----------------------------
// Constants and user editable parameters

const GRAPH_API_URL = "https://api.thegraph.com/subgraphs/name/darkforest-eth/dark-forest-v06-round-4";
// const GRAPH_API_URL = "https://api.thegraph.com/subgraphs/name/cha0sg0d/death-of-the-universe";

const PLUGIN_NAME = "You Snooze, You Lose!";
const DEV_MODE = false;  // Put as true to highlight UI sections for debugging
const MAX_GRAPH_QL_COUNT = 1000;  // GraphQL will retrieve up to 1000 objects in one go
const NUMBER_OF_HOURS_BACK = 24;

const WINDOW_WIDTH = '310px';
const WINDOW_HEIGHT = '500px';
const BUTTON_WIDTH = '200px';
const BUTTON_HEIGHT = '32px';

const COL_DEFAULT = '#000000'; 
const COL_TOTAL = '#444444';
const COL_ERR = '#440000';
const COL_SCORES = [
  '#006600',
  '#336600',
  '#666600',
  '#774400',
  '#880000',
];

const SS1 = -1;  // Standard scores to determine colour bands
const SS2 = 0.5;
const SS3 = 2;

// -----------------------------


const getTimeS = (timeMS, subtractHour) => Math.round(0.001 * timeMS - 60 * 60 * subtractHour);

const getSnoozeQuery = (playerAddress, timeMS, subtractHour) => `{
  arrivals(
    where: {
      player: "${playerAddress}",
      departureTime_gt: ${getTimeS(timeMS, subtractHour)},
      departureTime_lt: ${getTimeS(timeMS, subtractHour - 1)}
    },
    orderBy: departureTime,
    orderDirection: desc,
    first: ${MAX_GRAPH_QL_COUNT}
  ) {
      departureTime,
      player {
        id
      }
  }
}`;

const getGraphQLData = async (query, graphApiUrl = GRAPH_API_URL) => {
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

const getResultsDiv = (content, bgCol=COL_DEFAULT) => {
  const resultsDiv = document.createElement('div');
  resultsDiv.style.backgroundColor = bgCol;
  resultsDiv.style.textAlign = 'center';
  resultsDiv.append(content);
  return resultsDiv;
};

class YouSnoozeYouLose {
  constructor() {
    this.userInput = this.createInput('Click a planet');
    this.searching = false;
    this.movesResults = [];
    this.resultRows = document.createElement("div");
    if (DEV_MODE) this.resultRows.style.background = "#FF0000";
    console.log(`Initialised ${PLUGIN_NAME} plugin:`);
    console.dir(this);
  }

  createInput = placeholder => {
    const createdInput = document.createElement('input');
    createdInput.placeholder = placeholder;
    createdInput.style.color = 'black';
    createdInput.style.padding = '5px';
    createdInput.style.marginLeft = '5px';
    createdInput.style.width = '200px';
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

  resetTable() {
    while (this.resultRows.firstChild) {
      this.resultRows.removeChild(this.resultRows.lastChild);
    }
  }

  resetMoves() {
    this.movesResults = [];
    for (let i=0; i<NUMBER_OF_HOURS_BACK; i++) this.movesResults.push(0);
  }

  async doSearch() {
    // Only proceed if not already searching
    if (this.searching) return;
    this.searching = true;
    this.resetTable();
    this.resetMoves();
    console.log("Searching for snoozers...");

    // Search for player based on input
    let userInputValue = this.userInput.value;
    if (!userInputValue) {
      const planet = ui.getSelectedPlanet();
      if (planet) {
        userInputValue = planet.owner;
        this.userInput.value = userInputValue;
        this.resultRows.append(getResultsDiv('Planet owner selected'));
      } else {
        this.resultRows.append(getResultsDiv('Click a planet, or enter player Twitter handle or Eth address', COL_ERR));
      }
    } else {

      // Search for player based on Twitter or address
      const useValue = userInputValue.startsWith('@') ? userInputValue.slice(1) : userInputValue;
      const player = ui.getAllPlayers().find(player => {
        return player.address === useValue || player.twitter === useValue;
      })
      if (!player) {
        this.resultRows.append(getResultsDiv(`Player '${useValue.slice(0, 20) + (useValue.slice(20)?'...':'')}' could not be found`, COL_ERR));
        this.userInput.value = '';
      } else {

        // Player found, search last 24 hours by 1 hour bands
        const playerAddress = player.address;
        this.resultRows.append(getResultsDiv("Searching..."));
        const searchTimeMS = new Date().getTime();
        for (let subtractHour=1; subtractHour<=NUMBER_OF_HOURS_BACK; subtractHour++) {
          await this.doSearch1HourBand(playerAddress, searchTimeMS, subtractHour);
        }
    
        // Get moves stats
        let totalMoves = 0;
        let totalMovesSq = 0;
        for (let i=0; i<NUMBER_OF_HOURS_BACK; i++) {
          const mv = this.movesResults[i] || 0;
          totalMoves += mv;
          totalMovesSq += mv * mv;
        }
    
        // If moves found, redraw the table with colour bands
        this.resetTable();
        if (totalMoves < 1) {
          this.resultRows.append(getResultsDiv(`No moves found in last ${NUMBER_OF_HOURS_BACK} hours`, COL_ERR));
        } else {
          this.resultRows.append(getResultsDiv(`Total moves found: ${totalMoves}`, COL_TOTAL));
          const avg = totalMoves / NUMBER_OF_HOURS_BACK;  // mean average
          const sd = (totalMovesSq / NUMBER_OF_HOURS_BACK - avg * avg) ** 0.5;  // standard deviation
          for (let i=0; i<NUMBER_OF_HOURS_BACK; i++) {
            const subtractHour = i + 1;
            const numberOfMoves = this.movesResults[i] || 0;
            const ss = sd > 0 ? (numberOfMoves - avg) / sd : 0;  // standard score

            // Construct index from 0 (no moves) to 4 (more than average moves) for the colour
            const idx = !numberOfMoves ? 0 : ss < SS1 ? 1 : ss < SS2 ? 2 : ss < SS3 ? 3 : 4;
            const bgCol = COL_SCORES[idx];
            this.resultRows.append(getResultsDiv(
              `${subtractHour-1} to ${subtractHour} hours ago: ${numberOfMoves} move${numberOfMoves===1?'':'s'}`,
              bgCol
            ));
          }
        }
      }
    }

    // Async search finished (with success or failure), reset status so it can run again
    this.searching = false;
  }

  async doSearch1HourBand(playerAddress, searchTimeMS, subtractHour) {
    // Get moves (arrivals) data from The Graph
    const snoozeQuery = getSnoozeQuery(playerAddress, searchTimeMS, subtractHour);
    const playerQueryResults = await getGraphQLData(snoozeQuery);

    // Count moves and add to table
    const numberOfMoves = playerQueryResults.data.arrivals.length;
    this.movesResults[subtractHour-1] = numberOfMoves;
    this.resultRows.append(getResultsDiv(`H-${subtractHour}: ${numberOfMoves}`));
  }

  async render(container) {
    container.style.textAlign = 'center';
    container.style.width = WINDOW_WIDTH;
    container.style.height = WINDOW_HEIGHT;
    if (DEV_MODE) container.style.backgroundColor = '#000088';
    container.appendChild(this.userInput);
    const searchButton = document.createElement('button');
    searchButton.innerText = 'Check for snoozing!';
    searchButton.onclick = this.doSearch.bind(this);
    searchButton.style.width = BUTTON_WIDTH;
    searchButton.style.height = BUTTON_HEIGHT;
    const searchRow = document.createElement('div');
    searchRow.style.margin = '15px 0px 10px 0px';
    searchRow.appendChild(searchButton);
    container.appendChild(searchRow);
    container.appendChild(this.resultRows);
  }

  destroy() {
  }
}

export default YouSnoozeYouLose;