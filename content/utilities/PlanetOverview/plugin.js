// Overview of Planets by STX
// Start sort from homeplanet if is not pre-selected planet
// remixed from Palnet score plugin -> THX to Phated

// Import game utils
import { getSilver } from "https://plugins.zkga.me/utils/utils.js";

// Import Skypack constants types
import {
  PlanetType,
  PlanetTypeNames,
  PlanetLevel,
  PlanetLevelNames,
} from "https://cdn.skypack.dev/@darkforest_eth/types";

// Constanst definitíon
const planetType = [];
const minLevel = [];
const middle = [];
const { getPlanetName, getOwnerColor } = df.getProcgenUtils();

// Default refresh 30 seconds
let REFRESH_INTERVAL = 1000 * 30;

// Plugin Overview Default
class Overview {
  constructor() {
    this.container = null;
    this.loopId = null;
    // PlanetType Default value
    this.planetType = PlanetType.SILVER_MINE;
    // PlanetLevel Default value
    this.minLevel = PlanetLevel.TWO;
    // Slider Default value
    this.topX = 10;
    // checkbox MyPlanets
    this.table = document.createElement("table");
    this.table.style.width = "100%";
    this.table.style.borderCollapse = "separate";
    this.table.style.borderSpacing = "10px 0";
    // default static text header of table
    this.thead = document.createElement("thead");
    this.thead.innerHTML = `<tr><th></th><th>Name</th><th>Level</th><th>Silver</th><th>SilverTime</th><th>Energy</th><th>EnergyTime</th>`;
    this.table.appendChild(this.thead);
    // default dynamic table body
    this.tbody = document.createElement("tbody");
    this.table.appendChild(this.tbody);
  }
  // Function to renderPlanets with sorting from home planet of preselected planet
  renderPlanets(minLevel, planetType, middle, MyPlanets) {
    // clean table body
    this.tbody.innerHTML = null;
    const selectedPlanetCoords = ui.selectedPlanet?.location?.coords;
    const knownPlanets = [];
    for (const planet of df.getAllPlanets()) {
      if (planet.planetType != this.planetType) continue;
      if (planet.planetLevel < this.minLevel) continue;
      if (!planet?.location?.coords) continue;
      if (myPlanets.checked && planet.owner != df.account) continue;

      if (!selectedPlanetCoords) {
        middle = df.getHomeCoords();
      } else {
        middle = selectedPlanetCoords;
      }

      knownPlanets.push({
        locationId: planet.locationId,
        distance: Math.floor(df.getDistCoords(planet.location.coords, middle)),
      });
    }

    const sortedPlanets = knownPlanets
      .sort((a, b) => a.distance - b.distance)
      .slice(0, this.topX);
    for (const [idx, p] of sortedPlanets.entries()) {
      const planet = df.getPlanetWithId(p.locationId);
      if (!planet) {
        console.log(`Where is planet: ${p.locationId}`);
        continue;
      }
      const row = document.createElement("tr");
      row.style.color = getOwnerColor(planet);
      row.onclick = () => {
        ui.centerLocationId(planet.locationId);
      };
      // Create a Row per one planet
      const silverPercent = Math.round(
        100 / (planet.silverCap / Math.round(getSilver(planet)))
      );
      const fullSilverDate = new Date(
        df.getSilverCurveAtPercent(planet, 99) * 1000
      ).toString();

      let fullSilverTime = "";
      if (fullSilverDate != "Invalid Date")
        fullSilverTime = [
          fullSilverDate.substr(4, 6),
          fullSilverDate.substr(16, 8),
        ];

      const energyPercent = Math.round(
        100 / (planet.energyCap / Math.round(planet.energy))
      );

      const fullEnergyDate = new Date(
        df.getEnergyCurveAtPercent(planet, 99) * 1000
      ).toString();

      let fullEnergyTime = "";
      if (fullEnergyDate != "Invalid Date")
        fullEnergyTime = [
          fullEnergyDate.substr(4, 6),
          fullEnergyDate.substr(16, 8),
        ];

      let planetName = getPlanetName(planet).substr(0, 10);
      row.innerHTML = `<td>${
        idx + 1
      }.</td><td>${planetName}</td><td style="text-align: center">${
        planet.planetLevel
      }</td><td>${getSilver(planet)}/${
        planet.silverCap
      }=${silverPercent}%</td><td>${fullSilverTime}</td><td>${Math.round(
        planet.energy
      )}/${planet.energyCap}=${energyPercent}%</td><td>${fullEnergyTime}</td>`;
      this.tbody.appendChild(row);
    }
  }
  // Render function
  // async ?
  render(container) {
    // Setup size for main plugin window
    container.style.width = "800px";

    // Select from list PLanetType , with text loaded from client
    const planetType = document.createElement("select");
    planetType.style.background = "rgb(8,8,8)";
    planetType.style.width = "22%";
    planetType.style.marginTop = "10px";
    planetType.style.marginBottom = "10px";
    planetType.style.marginRight = "10px";
    Object.entries(PlanetType).forEach(([name, key]) => {
      let opt = document.createElement("option");
      opt.value = `${key}`;
      opt.innerText = `${PlanetTypeNames[key]}`;
      planetType.appendChild(opt);
    });
    planetType.value = `${this.planetType}`;
    planetType.onchange = (evt) => {
      try {
        this.planetType = parseInt(evt.target.value, 10);
      } catch (e) {
        console.error("could not parse planet level", e);
      }
      try {
        dynamicLabel.innerText = `Top ${this.topX} of PlanetType: ${this.planetType} up Lvl: ${this.minLevel}`;
        this.renderPlanets();
      } catch (err) {
        console.error("could not parse planet planet type", err);
      }
    };

    // Select from list planeLevel , with text loaded from client
    const minPlanetLevel = document.createElement("select");
    minPlanetLevel.style.background = "rgb(8,8,8)";
    minPlanetLevel.style.width = "15%";
    minPlanetLevel.style.marginTop = "10px";
    minPlanetLevel.style.marginBottom = "10px";
    minPlanetLevel.style.marginRight = "10px";
    Object.entries(PlanetLevel).forEach(([name, lvl]) => {
      let opt = document.createElement("option");
      opt.value = `${lvl}`;
      opt.innerText = `${PlanetLevelNames[lvl]}`;
      minPlanetLevel.appendChild(opt);
    });
    minPlanetLevel.value = `${this.minLevel}`;
    minPlanetLevel.onchange = (evt) => {
      try {
        this.minLevel = parseInt(evt.target.value, 10);
      } catch (e) {
        console.error("could not parse planet level", e);
      }
      try {
        dynamicLabel.innerText = `Top ${this.topX} of PlanetType: ${this.planetType} up Lvl: ${this.minLevel}`;
        this.renderPlanets();
      } catch (err) {
        console.error("Unable to parse number", err);
      }
    };

    // Button "Update" for label info status of the transactions
    const updateButton = document.createElement("button");
    updateButton.innerText = "Update";
    updateButton.style.marginRight = "10px";
    updateButton.addEventListener("click", () => {
      try {
        dynamicLabel.innerText = `Top ${this.topX} of PlanetType: ${this.planetType} up Lvl: ${this.minLevel}`;
        this.renderPlanets();
      } catch (err) {
        console.error("Unable to update", err);
      }
    });

    // Button "Un.Trans"
    const unconfirmedButton = document.createElement("button");
    unconfirmedButton.innerText = "Un.Trans";
    unconfirmedButton.style.marginRight = "10px";
    unconfirmedButton.addEventListener("click", () => {
      unconfirmed();
      updateTx();
      this.renderPlanets();
    });

    // Slider for count of total list lines
    const topSlider = document.createElement("input");
    topSlider.style.marginTop = "13px";
    topSlider.style.width = "40%";
    topSlider.type = "range";
    topSlider.value = `${this.topX}`;
    topSlider.min = 1;
    topSlider.max = 100;
    topSlider.onchange = (evt) => {
      try {
        this.topX = parseInt(evt.target.value, 10);
        dynamicLabel.innerText = `Top ${this.topX} of PlanetType: ${this.planetType} up Lvl: ${this.minLevel}`;
        this.renderPlanets();
      } catch (err) {
        console.error("Unable to parse number", err);
      }
    };

    // label for dynamic information
    const dynamicLabel = document.createElement("label");
    dynamicLabel.style.width = "50%";
    dynamicLabel.style.padding = "5px 0";
    dynamicLabel.style.marginRight = "170px";
    dynamicLabel.innerText = `Top ${this.topX} of PlanetType: ${this.planetType} up Lvl: ${this.minLevel}`;

    // label for my planets
    const myPLanetsLabel = document.createElement("label");
    myPLanetsLabel.innerText = `only my planets?`;
    myPLanetsLabel.style.marginRight = "20px";

    // Checkbox for my planets ?
    let MyPlanets = document.createElement("input");
    MyPlanets.type = "Checkbox";
    MyPlanets.checked = true;
    MyPlanets.id = "myPlanets";
    this.MyPlanets = MyPlanets;
    MyPlanets.onchange = (evt) => {
      try {
        dynamicLabel.innerText = `Top ${this.topX} of PlanetType: ${this.planetType} up Lvl: ${this.minLevel}`;
        this.renderPlanets();
      } catch (err) {
        console.error("Unable to change checkbox", err);
      }
    };

    // This is the fuction for button upgrade that show current unconfirmed tx
    function updateTx() {
      dynamicLabel.innerText =
        "Moves :  " +
        df.getUnconfirmedMoves().length +
        "  Upgrades :  " +
        df.getUnconfirmedUpgrades().length +
        "  Wormhole :  " +
        df.getUnconfirmedWormholeActivations().length;
    }

    // This is the function that shows the transactions in the console
    function unconfirmed() {
      console.log("Moves : ", df.getUnconfirmedMoves());
      console.log("Upgrades : ", df.getUnconfirmedUpgrades());
      console.log("Wormhole : ", df.getUnconfirmedWormholeActivations().length);
    }

    // Grafic append
    container.appendChild(planetType);
    container.appendChild(minPlanetLevel);
    container.appendChild(updateButton);
    container.appendChild(unconfirmedButton);
    container.appendChild(topSlider);
    container.appendChild(dynamicLabel);
    container.appendChild(myPLanetsLabel);
    container.appendChild(MyPlanets);
    container.appendChild(this.table);

    // Run main function
    this.renderPlanets();

    // Refresh for rendered container (table function renderPlanets)
    this.loopId = setInterval(this.renderPlanets.bind(this), REFRESH_INTERVAL);
  }

  destroy() {
    if (this.loopId) {
      clearInterval(this.loopId);
    }
  }
}

export default Overview;
