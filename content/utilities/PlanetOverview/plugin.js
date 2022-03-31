// Overview of Planets by STX
// Manage your empire. Sort your planets by level or name, quick view when they will reach max energy and silver.
//
// How to use:
// 1. Select your preffered planet type, level and set count of top lines. = Will be refreshed according preselected level is equal or higher. (scroll able)
// 2. Default sorting according distance from homeplanet if is not pre-selected any object on map. Or if is selected some object on map it sorting distance from here.
// 3. By clic on line of table will centered map on it.
// 4. Checkbox is to show only your or all planets on your map. (spy mode)
// === feel free to see overview of silver & energy budget status and estimated time to have full stock of it.
//
// Optional function:
// Is implemented default refresh 30 seconds if you need immediately refresh push button 'Update'
// If you are interested about current status of your unconfirmed transaction push button 'Un.Trans'. At console reveal detailed information.
//
// remixed from Planet score plugin R3 -> THX to @Phated ,
// was used for base frame and advanced html table coding. Whole complex coding inside from original.
// removed all connected with score
// remixed sorting of distance
// added auto-refresh
// added checkbox owner/all
// added timestamp of filled stocks silver/energy
// added button for unconfirmed Txs
//
// THX to @Modukon + @jacobrosenthal for main audit and recommended optimalization.

// Import game utils
import { getSilver } from "https://plugins.zkga.me/utils/utils.js";

// Import Skypack constants types
import {
    PlanetType,
    PlanetTypeNames,
    PlanetLevel,
    PlanetLevelNames,
} from "https://cdn.skypack.dev/@darkforest_eth/types";

//port v6r5
import { getPlanetName } from "https://cdn.skypack.dev/@darkforest_eth/procedural";
const pg = { getPlanetName: getPlanetName }

// Constanst definitíon
const planetType = [];
const minLevel = [];
const middle = [];


// Default refresh 30 seconds
let REFRESH_INTERVAL = 1000 * 30;

// Plugin Overview Default
class OverviewPlanets {
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
            row.style.color = "violet";
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

            let planetName = pg.getPlanetName(planet).substr(0, 10);
            row.innerHTML = `<td>${idx + 1
                }.</td><td>${planetName}</td><td style="text-align: center">${planet.planetLevel
                }</td><td>${formatNumberForDisplay(
                    getSilver(planet)
                )} / ${formatNumberForDisplay(
                    planet.silverCap
                )}=${silverPercent}%</td><td>${fullSilverTime}</td><td>${formatNumberForDisplay(
                    Math.round(planet.energy)
                )} / ${formatNumberForDisplay(
                    planet.energyCap
                )}=${energyPercent}%</td><td>${fullEnergyTime}</td>`;
            this.tbody.appendChild(row);
        }

        // Formating for big numbers k/m/b

        function roundToDecimal(num, decimalCount = 1) {
            if (decimalCount < 1) return Math.round(num);
            let p = Math.pow(10, decimalCount);
            num = num * p;
            num = Math.round(num) / p;
            return num;
        }

        function formatNumberForDisplay(num, decimalCount = 1) {
            if (num < 1e3) return roundToDecimal(num, decimalCount);
            if (num < 1e6) return roundToDecimal(num / 1e3, decimalCount) + "k";
            if (num < 1e9) return roundToDecimal(num / 1e6, decimalCount) + "m";
            if (num < 1e12) return roundToDecimal(num / 1e9, decimalCount) + "b";
            return roundToDecimal(num / 1e12, decimalCount) + "t";
        }
    }
    // Render function
    // async ?
    render(container) {
        // Setup size for main plugin window
        container.style.width = "800px";

        // Select from list PlanetType , with text loaded from client
        const planetType = document.createElement("select");
        planetType.title = "Select planet type to reveal";
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
        minPlanetLevel.title = "Select min. lvl to reveal";
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

        // Button "Un.Trans" for label info status of the transactions
        const unconfirmedButton = document.createElement("button");
        unconfirmedButton.innerText = "Un.Trans";
        unconfirmedButton.title = "Logs unconfirmed transactions to the console (F12)";
        unconfirmedButton.style.marginRight = "10px";
        unconfirmedButton.addEventListener("click", () => {
            unconfirmedLabel();
            unconfirmedConsole();
            this.renderPlanets();
        });

        // Slider for count of total list lines
        const topSlider = document.createElement("input");
        topSlider.title = "Select count of top revealed planets (default: 10, range: 0-100)";
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
        dynamicLabel.style.marginLeft = "20px";
        dynamicLabel.style.marginRight = "170px";
        dynamicLabel.innerText = `Top ${this.topX} of PlanetType: ${this.planetType} up Lvl: ${this.minLevel}`;

        // label for my planets
        const myPLanetsLabel = document.createElement("label");
        myPLanetsLabel.innerText = `only my planets?`;
        myPLanetsLabel.style.marginRight = "20px";

        // Checkbox for my planets ?
        let MyPlanets = document.createElement("input");
        MyPlanets.title = "If checked reveal only your planet";
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

        // This is the function that shows the status of transactions in dynamicLabel
        function unconfirmedLabel() {
            dynamicLabel.innerText =
                "Moves :  " +
                df.getUnconfirmedMoves().length +
                "  Upgrades :  " +
                df.getUnconfirmedUpgrades().length +
                "  Wormhole :  " +
                df.getUnconfirmedWormholeActivations().length;
        }

        // This is the function that shows the transactions in the console
        function unconfirmedConsole() {
            console.log("Moves : ", df.getUnconfirmedMoves());
            console.log("Upgrades : ", df.getUnconfirmedUpgrades());
            console.log("Wormhole : ", df.getUnconfirmedWormholeActivations().length);
        }

        // Grafic append
        container.appendChild(planetType);
        container.appendChild(minPlanetLevel);
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

export default OverviewPlanets;
