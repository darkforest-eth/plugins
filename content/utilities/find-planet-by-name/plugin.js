// Find Planet By Name
//
// Like Google, but for planet names. What name can you find?
//
// author: https://twitter.com/davidryan59


// -----------------------------
// User editable parameters here

const MAX_PLANETS_TO_FIND = 100;
const OWNER_CHARS_TO_DISPLAY = 18;
const ADDRESS_CHARS_TO_DISPLAY = 6;
const DEV_MODE = false;  // Put as true to highlight UI sections for debugging

// -----------------------------


const PLUGIN_NAME = "Find Planet By Name";
const pg = df.getProcgenUtils();
const UNOWNED_ADDRESS = "0x0000000000000000000000000000000000000000";
const OWNED_BY_ME = "Me";
const OWNED_BY_OTHERS = "Others";
const OWNED_BY_NOBODY = "Nobody";
const OWNERSHIP_OPTIONS = [
  OWNED_BY_ME,
  OWNED_BY_OTHERS,
  OWNED_BY_NOBODY  
];

const upgradeRank = planet => planet.upgradeState.reduce((a, b) => a + b, 0);

const planetLink = planet => {
  // Get and pad the player name
  const ownerAddress = planet.owner;
  let ownerTwitter = df.getTwitter(ownerAddress);
  ownerTwitter = ownerTwitter ? `@${ownerTwitter}` : null;
  let ownerDisplay = ownerTwitter || ownerAddress.slice(0, ADDRESS_CHARS_TO_DISPLAY);
  ownerDisplay = ownerDisplay.slice(0, OWNER_CHARS_TO_DISPLAY);
  ownerDisplay = ownerDisplay + String.fromCharCode(160).repeat(OWNER_CHARS_TO_DISPLAY + 1 - ownerDisplay.length); // non-breaking spaces added here
  // Owner name element
  const ownerNameElement = document.createElement('span');
  ownerNameElement.style["color"] = pg.getPlayerColor(ownerAddress);
  ownerNameElement.innerText = `${ownerDisplay}`;
  // Planet level and rank element
  const planetRankElement = document.createElement('span');
  planetRankElement.innerText = `L${planet.planetLevel}R${upgradeRank(planet)} `;
  // Planet name element
  const planetNameElement = document.createElement("button");
  planetNameElement.innerText = `${pg.getPlanetName(planet)}`;
  planetNameElement.title = planet.locationId;
  planetNameElement.style.background = "none";
  planetNameElement.style.border = "none";
  planetNameElement.style.color = "white";
  planetNameElement.style.outline = "none";
  planetNameElement.style.padding = "0";
  planetNameElement.style.textDecoration = "underline";
  planetNameElement.addEventListener("click", () => ui.centerLocationId(planet.locationId));
  // Return a wrapper div
  const planetLinkDiv = document.createElement('div');
  planetLinkDiv.append(ownerNameElement);
  planetLinkDiv.append(planetRankElement);
  planetLinkDiv.append(planetNameElement);
  return planetLinkDiv;
};

class Plugin {
  constructor() {
    this.ownerOptionsSelected = [...OWNERSHIP_OPTIONS];
    this.userInput = this.createInput('Enter characters');
    this.searchInfo = document.createElement("div");
    this.searchInfo.style.margin = '10px 0px 5px 0px';
    this.searchInfo.innerText = 'Search string not set';
    if (DEV_MODE) this.searchInfo.style.background = "#FF0000";
    this.foundPlanetRows = document.createElement("div");
    if (DEV_MODE) this.foundPlanetRows.style.background = "#00FF00";
    console.log(`Initialised ${PLUGIN_NAME} plugin:`);
    console.dir(this);
  }

  searchPlanets = () => {
    // Only proceed if at least 2 chars are in the search value
    const searchValue = this.userInput.value.toLowerCase();
    if (searchValue.length >= 2) {
      // Remove existing rows    
      while (this.foundPlanetRows.firstChild) {
        this.foundPlanetRows.removeChild(this.foundPlanetRows.lastChild);
      }
      // Update search info
      this.searchInfo.innerText = `Searching on '${searchValue}':`;
      // Get options
      const displayMine = this.isOptionSelected(OWNED_BY_ME);
      const displayOthers = this.isOptionSelected(OWNED_BY_OTHERS);
      const displayUnowned = this.isOptionSelected(OWNED_BY_NOBODY);
      // Find new matching planets
      const matchingPlanets = [];
      const myAddress = ui.getAccount();
      for (const planet of df.getAllPlanets()) {
        const owner = planet.owner;
        const planetNameMatches = pg.getPlanetName(planet).toLowerCase().includes(searchValue);
        const myOwnershipMatches = displayMine && owner === myAddress;
        const unownedMatches = displayUnowned && owner === UNOWNED_ADDRESS;
        const otherOwnershipMatches = displayOthers && owner !== myAddress && owner !== UNOWNED_ADDRESS;
        if (planetNameMatches && (myOwnershipMatches || unownedMatches || otherOwnershipMatches))
          matchingPlanets.push(planet);
      }
      const sortedPlanets = matchingPlanets.sort((p1, p2) => {
        // Weight by planet level first (x10), then by planet rank
        return 10 * (p2.planetLevel - p1.planetLevel) + 1 * (upgradeRank(p2) - upgradeRank(p1));
      })
      const foundPlanets = sortedPlanets.slice(0, MAX_PLANETS_TO_FIND);
      // Add a row for each found planet
      for (const planet of foundPlanets) {
        this.foundPlanetRows.append(planetLink(planet));
      }
    } else {
      // Display search error
      this.searchInfo.innerText = `Enter at least 2 characters to search on`;
    }
  }

  isOptionSelected = option => this.ownerOptionsSelected.indexOf(option) !== -1;

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
        this.searchPlanets();
      }
    });
    return createdInput;
  }

  async render(container) {
    // Checkboxes for options
    // Wrapper
    const optionsWrapper = document.createElement('div');
    optionsWrapper.style.margin = '5px 0px 10px 0px';
    if (DEV_MODE) optionsWrapper.style.background = "#0000FF";
    // Label
    const ownerOptionLabel = document.createElement('span');
    ownerOptionLabel.innerHTML = 'Planet owner: ';
    optionsWrapper.appendChild(ownerOptionLabel);
    // List options
    for (const ownerOption of OWNERSHIP_OPTIONS) {
      const checkboxInput = document.createElement('input');
      checkboxInput.style.width = '10%';
      checkboxInput.type = "checkbox";
      checkboxInput.value = ownerOption;
      if (this.isOptionSelected(ownerOption)) {
        checkboxInput.checked = true;
      }
      checkboxInput.onchange = evt => {
        // Update the checkboxes
        const option = evt.target.value;
        const checked = evt.target.checked;
        if (checked) {
          this.ownerOptionsSelected.push(option);
        } else {
          this.ownerOptionsSelected = this.ownerOptionsSelected.filter(opt => opt !== option);
        }
        // Update the current search results
        this.searchPlanets();
      }
      const checkboxLabel = document.createElement('label');
      checkboxLabel.style.width = '80%';
      checkboxLabel.innerHTML = ownerOption;
      // Gather options here
      const checkboxSpan = document.createElement('span');
      checkboxSpan.appendChild(checkboxInput);
      checkboxSpan.appendChild(checkboxLabel);
      optionsWrapper.appendChild(checkboxSpan);
    }
    container.appendChild(optionsWrapper);
    // Horizontal divider
    const hrElement = document.createElement('hr');
    hrElement.style.margin = "0px";
    hrElement.style.borderColor = "rgb(80, 80, 80)";
    container.appendChild(hrElement);
    // Search button
    const searchButton = document.createElement('button');
    searchButton.innerText = 'Search!';
    searchButton.onclick = this.searchPlanets;
    // Spacer
    const spacerSpan = document.createElement('span');
    spacerSpan.innerText = ' ';
    // Wrapper for input box and search button    
    const searchRow = document.createElement('div');
    searchRow.style.margin = '15px 0px 10px 0px';
    searchRow.appendChild(this.userInput);
    searchRow.appendChild(spacerSpan);
    searchRow.appendChild(searchButton);
    // Container with search row and results
    container.appendChild(searchRow);
    container.appendChild(this.searchInfo);
    container.appendChild(this.foundPlanetRows);
  }

  destroy() {
  }
}

export default Plugin;