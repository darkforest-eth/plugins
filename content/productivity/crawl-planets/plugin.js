// Crawl Planets
//
// Capture unowned planets around you!

import { EMPTY_ADDRESS } from "https://cdn.skypack.dev/@darkforest_eth/constants";
import {
    PlanetType,
    PlanetTypeNames,
    PlanetLevel,
    PlanetLevelNames,
} from "https://cdn.skypack.dev/@darkforest_eth/types";

const players = [
    EMPTY_ADDRESS
];


class Plugin {
    constructor() {
        this.planetType = PlanetType.SILVER_MINE;
        this.minimumEnergyAllowed = 15;
        this.minPlanetLevelTo = PlanetLevel.ONE;
        this.maxPlanetLevelTo = PlanetLevel.NINE;
        this.minPlanetLevelFrom = PlanetLevel.ZERO;
        this.maxPlanetLevelFrom = PlanetLevel.THREE;
        this.maxEnergyPercent = 85;
    }
    render(container) {
        container.style.width = '400px';

        let stepperLabel = document.createElement('label');
        stepperLabel.innerText = 'Max % energy to spend';
        stepperLabel.style.display = 'block';

        let stepper = document.createElement('input');
        stepper.type = 'range';
        stepper.min = '0';
        stepper.max = '100';
        stepper.step = '5';
        stepper.value = `${this.maxEnergyPercent}`;
        stepper.style.width = '80%';
        stepper.style.height = '24px';

        let percent = document.createElement('span');
        percent.innerText = `${stepper.value}%`;
        percent.style.float = 'right';

        stepper.onchange = (evt) => {
            percent.innerText = `${evt.target.value}%`;
            try {
                this.maxEnergyPercent = parseInt(evt.target.value, 10);
            } catch (e) {
                console.error('could not parse energy percent', e);
            }
        }

        let minimumEnergyAllowedLabel = document.createElement('label');
        minimumEnergyAllowedLabel.innerText = '% energy to fill after capture';
        minimumEnergyAllowedLabel.style.display = 'block';

        let minimumEnergyAllowedSelect = document.createElement('input');
        minimumEnergyAllowedSelect.type = 'range';
        minimumEnergyAllowedSelect.min = '0';
        minimumEnergyAllowedSelect.max = '100';
        minimumEnergyAllowedSelect.step = '1';
        minimumEnergyAllowedSelect.value = `${this.minimumEnergyAllowed}`;
        minimumEnergyAllowedSelect.style.width = '80%';
        minimumEnergyAllowedSelect.style.height = '24px';

        let percentminimumEnergyAllowed = document.createElement('span');
        percentminimumEnergyAllowed.innerText = `${minimumEnergyAllowedSelect.value}%`;
        percentminimumEnergyAllowed.style.float = 'right';

        minimumEnergyAllowedSelect.onchange = (evt) => {
            if (parseInt(evt.target.value, 10) === 0) percentminimumEnergyAllowed.innerText = `1 energy`;
            else
                percentminimumEnergyAllowed.innerText = `${evt.target.value}%`;
            try {
                this.minimumEnergyAllowed = parseInt(evt.target.value, 10);
            } catch (e) {
                console.error('could not parse minimum energy allowed percent', e);
            }
        }

        let minLevelToLabel = document.createElement('label');
        minLevelToLabel.innerText = 'Min. level to capture';
        minLevelToLabel.style.display = 'block';

        let minLevelTo = document.createElement('select');
        minLevelTo.style.background = 'rgb(8,8,8)';
        minLevelTo.style.width = '100%';
        minLevelTo.style.marginTop = '10px';
        minLevelTo.style.marginBottom = '10px';
        Object.entries(PlanetLevel).forEach(([name, lvl]) => {
            let opt = document.createElement('option');
            opt.value = `${lvl}`;
            opt.innerText = `${PlanetLevelNames[lvl]}`;
            minLevelTo.appendChild(opt);
        });
        minLevelTo.value = `${this.minPlanetLevelTo}`;

        minLevelTo.onchange = (evt) => {
            try {
                this.minPlanetLevelTo = parseInt(evt.target.value, 10);
            } catch (e) {
                console.error('could not parse planet level', e);
            }
        }

        let maxLevelToLabel = document.createElement('label');
        maxLevelToLabel.innerText = 'Max. level to capture';
        maxLevelToLabel.style.display = 'block';

        let maxLevelTo = document.createElement('select');
        maxLevelTo.style.background = 'rgb(8,8,8)';
        maxLevelTo.style.width = '100%';
        maxLevelTo.style.marginTop = '10px';
        maxLevelTo.style.marginBottom = '10px';
        Object.entries(PlanetLevel).forEach(([name, lvl]) => {
            let opt = document.createElement('option');
            opt.value = `${lvl}`;
            opt.innerText = `${PlanetLevelNames[lvl]}`;
            maxLevelTo.appendChild(opt);
        });
        maxLevelTo.value = `${this.maxPlanetLevelTo}`;

        maxLevelTo.onchange = (evt) => {
            try {
                this.maxPlanetLevelTo = parseInt(evt.target.value, 10);
            } catch (e) {
                console.error('could not parse planet level', e);
            }
        }

        let levelLabelFromMin = document.createElement('label');
        levelLabelFromMin.innerText = 'Min. level to send energy from';
        levelLabelFromMin.style.display = 'block';

        let levelFromMin = document.createElement('select');
        levelFromMin.style.background = 'rgb(8,8,8)';
        levelFromMin.style.width = '100%';
        levelFromMin.style.marginTop = '10px';
        levelFromMin.style.marginBottom = '10px';
        Object.entries(PlanetLevel).forEach(([name, lvl]) => {
            let opt = document.createElement('option');
            opt.value = `${lvl}`;
            opt.innerText = `${PlanetLevelNames[lvl]}`;
            levelFromMin.appendChild(opt);
        });
        levelFromMin.value = `${this.minPlanetLevelFrom}`;

        levelFromMin.onchange = (evt) => {
            try {
                this.minPlanetLevelFrom = parseInt(evt.target.value, 10);
            } catch (e) {
                console.error('could not parse planet level', e);
            }
        }

        let levelLabelFromMax = document.createElement('label');
        levelLabelFromMax.innerText = 'Max. level to send energy from';
        levelLabelFromMax.style.display = 'block';

        let levelFromMax = document.createElement('select');
        levelFromMax.style.background = 'rgb(8,8,8)';
        levelFromMax.style.width = '100%';
        levelFromMax.style.marginTop = '10px';
        levelFromMax.style.marginBottom = '10px';
        Object.entries(PlanetLevel).forEach(([name, lvl]) => {
            let opt = document.createElement('option');
            opt.value = `${lvl}`;
            opt.innerText = `${PlanetLevelNames[lvl]}`;
            levelFromMax.appendChild(opt);
        });
        levelFromMax.value = `${this.maxPlanetLevelFrom}`;

        levelFromMax.onchange = (evt) => {
            try {
                this.maxPlanetLevelFrom = parseInt(evt.target.value, 10);
            } catch (e) {
                console.error('could not parse planet level', e);
            }
        }

        let planetTypeLabel = document.createElement('label');
        planetTypeLabel.innerText = 'Planet type to capture';
        planetTypeLabel.style.display = 'block';

        let planetType = document.createElement('select');
        planetType.style.background = 'rgb(8,8,8)';
        planetType.style.width = '100%';
        planetType.style.marginTop = '10px';
        planetType.style.marginBottom = '10px';
        Object.entries(PlanetType).forEach(([name, key]) => {
            let opt = document.createElement('option');
            opt.value = `${key}`;
            opt.innerText = `${PlanetTypeNames[key]}`;
            planetType.appendChild(opt);
        });
        planetType.value = `${this.planetType}`;

        planetType.onchange = (evt) => {
            try {
                this.planetType = parseInt(evt.target.value, 10);
            } catch (e) {
                console.error('could not parse planet planet type', e);
            }
        }

        let message = document.createElement('div');

        let button = document.createElement('button');
        button.style.width = '100%';
        button.style.marginBottom = '10px';
        button.innerHTML = 'Crawl from selected!'
        button.onclick = () => {
            let planet = ui.getSelectedPlanet();
            if (planet) {
                message.innerText = 'Please wait...';
                let moves = capturePlanets(
                    planet.locationId,
                    this.minPlanetLevelTo,
                    this.maxPlanetLevelTo,
                    this.maxEnergyPercent,
                    this.planetType,
                    this.minimumEnergyAllowed,
                );
                message.innerText = `Crawling ${moves} ${PlanetTypeNames[this.planetType]}s.`;
            } else {
                message.innerText = 'No planet selected.';
            }
        }

        let globalButton = document.createElement('button');
        globalButton.style.width = '100%';
        globalButton.style.marginBottom = '10px';
        globalButton.innerHTML = 'Crawl everything!'
        globalButton.onclick = () => {
            message.innerText = 'Please wait...';

            let moves = 0;
            for (let planet of df.getMyPlanets()) {
                if (planet.planetLevel >= this.minPlanetLevelFrom && planet.planetLevel <= this.maxPlanetLevelFrom) {
                    setTimeout(() => {
                        moves += capturePlanets(
                            planet.locationId,
                            this.minPlanetLevelTo,
                            this.maxPlanetLevelTo,
                            this.maxEnergyPercent,
                            this.planetType,
                            this.minimumEnergyAllowed,
                        );
                        message.innerText = `Crawling ${moves} ${PlanetTypeNames[this.planetType]}s.`;
                    }, 0);
                }
            }
        }

        container.appendChild(stepperLabel);
        container.appendChild(stepper);
        container.appendChild(percent);
        container.appendChild(minimumEnergyAllowedLabel);
        container.appendChild(minimumEnergyAllowedSelect);
        container.appendChild(percentminimumEnergyAllowed);
        container.appendChild(minLevelToLabel);
        container.appendChild(minLevelTo);
        container.appendChild(maxLevelToLabel);
        container.appendChild(maxLevelTo);
        container.appendChild(planetTypeLabel);
        container.appendChild(planetType);
        container.appendChild(button);
        container.append(document.createElement("br"), document.createElement("br"));
        container.appendChild(levelLabelFromMin);
        container.appendChild(levelFromMin);
        container.appendChild(levelLabelFromMax);
        container.appendChild(levelFromMax);
        container.appendChild(globalButton);
        container.appendChild(message);
    }
}

export default Plugin;


function capturePlanets(fromId, minCaptureLevel, maxCaptureLevel, maxDistributeEnergyPercent, planetType, minimumEnergyAllowed = 0) {
    const planet = df.getPlanetWithId(fromId);
    const from = df.getPlanetWithId(fromId);

    // Rejected if has pending outbound moves
    const unconfirmed = df.getUnconfirmedMoves().filter(move => move.from === fromId)
    if (unconfirmed.length !== 0) {
        return 0;
    }

    const candidates_ = df.getPlanetsInRange(fromId, maxDistributeEnergyPercent)
        .filter(p => (
            p.owner !== df.account &&
            players.includes(p.owner) &&
            p.planetLevel >= minCaptureLevel &&
            p.planetLevel <= maxCaptureLevel &&
            p.planetType === planetType
        ))
        .map(to => {
            return [to, distance(from, to)]
        })
        .sort((a, b) => a[1] - b[1]);

    let i = 0;
    const energyBudget = Math.floor((maxDistributeEnergyPercent / 100) * planet.energy);

    let energySpent = 0;
    let moves = 0;
    while (energyBudget - energySpent > 0 && i < candidates_.length) {

        const energyLeft = energyBudget - energySpent;

        // Remember its a tuple of candidates and their distance
        const candidate = candidates_[i++][0];

        // Rejected if has unconfirmed pending arrivals
        const unconfirmed = df.getUnconfirmedMoves().filter(move => move.to === candidate.locationId)
        if (unconfirmed.length !== 0) {
            continue;
        }

        // Rejected if has pending arrivals
        const arrivals = getArrivalsForPlanet(candidate.locationId);
        if (arrivals.length !== 0) {
            continue;
        }

        // set minimum above energy to % or 1 (if 0%), depending on minimumEnergyAllowed value
        const energyForCandidate = minimumEnergyAllowed === 0 ? 1 : candidate.energyCap * minimumEnergyAllowed / 100
        const energyArriving = energyForCandidate + (candidate.energy * (candidate.defense / 100));
        // needs to be a whole number for the contract
        const energyNeeded = Math.ceil(df.getEnergyNeededForMove(fromId, candidate.locationId, energyArriving));
        if (energyLeft - energyNeeded < 0) {
            continue;
        }

        df.move(fromId, candidate.locationId, energyNeeded, 0);
        energySpent += energyNeeded;
        moves += 1;
    }

    return moves;
}

function getArrivalsForPlanet(planetId) {
    return df.getAllVoyages().filter(arrival => arrival.toPlanet === planetId).filter(p => p.arrivalTime > Date.now() / 1000);
}

//returns tuples of [planet,distance]
function distance(from, to) {
    let fromloc = from.location;
    let toloc = to.location;
    return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
}
