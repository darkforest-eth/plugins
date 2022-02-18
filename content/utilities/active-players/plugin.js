// Active Players
//
// Get a list of which players have sent the most moves recently
//
// author: https://twitter.com/davidryan59 (dryan.eth)


// -----------------------------
// Constants and user editable parameters

const GRAPH_API_URL = "https://api.thegraph.com/subgraphs/name/darkforest-eth/dark-forest-v06-round-5";
// const GRAPH_API_URL = "https://api.thegraph.com/subgraphs/name/cha0sg0d/death-of-the-universe";

const PLUGIN_NAME = "Active Players";
const DEV_MODE = false;  // Put as true to highlight UI sections for debugging
const ADDRESS_CHARS_TO_DISPLAY = 6;
const OWNER_CHARS_TO_DISPLAY = 18;
const MAX_RECORD_COUNT = 1000;  // GraphQL will retrieve up to 1000 objects in one go

// -----------------------------


const pg = df.getProcgenUtils();

const playerQuery = `{
  arrivals(
    orderBy: departureTime,
    orderDirection: desc,
    first: ${MAX_RECORD_COUNT}
  ) {
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

const getPlayerDisplayText = playerId => {
  let playerTwitter = df.getTwitter(playerId);
  playerTwitter = playerTwitter ? `@${playerTwitter}` : null;
  let playerDisplayText = playerTwitter || playerId.slice(0, ADDRESS_CHARS_TO_DISPLAY);
  playerDisplayText = playerDisplayText.slice(0, OWNER_CHARS_TO_DISPLAY);
  playerDisplayText = playerDisplayText + String.fromCharCode(160).repeat(OWNER_CHARS_TO_DISPLAY + 1 - playerDisplayText.length); // non-breaking spaces added here
  return playerDisplayText;
}

const getPlayerElement = playerId => {
  const playerNameElement = document.createElement('span');
  playerNameElement.style["color"] = pg.getPlayerColor(playerId);
  playerNameElement.innerText = `${getPlayerDisplayText(playerId)}`;
  return playerNameElement;
}

const getTableRowDiv = (element1, text2) => {
  const element2 = document.createElement('span');
  element2.innerText = String.fromCharCode(160) + `${text2}`;
  const playerRowDiv = document.createElement('div');
  playerRowDiv.append(element1);
  playerRowDiv.append(element2);
  return playerRowDiv;
};

class ActivePlayers {
  constructor() {
    this.finding = false;
    this.tableRows = document.createElement("div");
    if (DEV_MODE) this.tableRows.style.background = "#FF0000";
    console.log(`Initialised ${PLUGIN_NAME} plugin:`);
    console.dir(this);
  }

  async listActivePlayers() {
    // Only proceed if not already finding
    if (this.finding) return;
    this.finding = true;
    console.log("Listing Active Players");

    // Remove existing table rows
    while (this.tableRows.firstChild) {
      this.tableRows.removeChild(this.tableRows.lastChild);
    }

    // Get moves (arrivals) data from The Graph
    const playerQueryResults = await getGraphQLData(playerQuery);

    // Count moves for each playerId
    const activePlayerMap = {};
    for (let arr of playerQueryResults.data.arrivals) {
      const playerId = arr.player.id;
      if (activePlayerMap[playerId]) {
        activePlayerMap[playerId] += 1;
      } else {
        activePlayerMap[playerId] = 1;
      }
    }

    // Turn this map into an array, sort by decreasing count
    let activePlayers = [];
    for (let playerId of Object.keys(activePlayerMap)) {
      activePlayers.push([playerId, activePlayerMap[playerId]]);
    }
    activePlayers = activePlayers.sort((a, b) => b[1] - a[1]);

    // Table header
    this.tableRows.append(getTableRowDiv("Player Name" + String.fromCharCode(160).repeat(8), "Moves"));
    
    // Table content
    for (let arr of activePlayers) {
      const playerId = arr[0];
      const count = arr[1];
      this.tableRows.append(getTableRowDiv(getPlayerElement(playerId), count));
    }
    this.finding = false;
  }

  async render(container) {
    container.style.width = "220px";
    const searchButton = document.createElement('button');
    searchButton.innerText = 'List Active Players!';
    searchButton.onclick = this.listActivePlayers.bind(this);
    const searchRow = document.createElement('div');
    searchRow.style.margin = '15px 0px 10px 0px';
    searchRow.appendChild(searchButton);
    container.appendChild(searchRow);
    container.appendChild(this.tableRows);
  }

  destroy() {
  }
}

export default ActivePlayers;