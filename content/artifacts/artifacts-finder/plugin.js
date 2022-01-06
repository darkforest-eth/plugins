// Artifacts Finder
//
// This plugin offers a button to auto-prospect artifacts every few minutes, then to find after prospecting has finished.
// To stop simply close the plugin.
// Simple is Power!

// Author: SnowTiger

import {
  energy,
  coords,
  canHaveArtifact,
} from 'https://plugins.zkga.me/utils/utils.js';

import {
  BiomeNames
} from "https://cdn.skypack.dev/@darkforest_eth/types"


// ---------------
// USER CONFIGURABLE PARAMETERS HERE

// Set prospecting and finding loop interval in minutes
const LOOP_INTERVAL_MINUTES = 2;

// Set maximum number of simultaneous prospecting actions (finds don't have limit)
const MAX_PLANET_ACTIONS = 10;

// ---------------


const LOOP_INTERVAL_MS = 1000 * 60 * LOOP_INTERVAL_MINUTES;

function blocksLeftToProspectExpiration(
  currentBlockNumber,
  prospectedBlockNumber
) {
  return (prospectedBlockNumber || 0) + 255 - currentBlockNumber;
}

function prospectExpired(currentBlockNumber, prospectedBlockNumber) {
  return blocksLeftToProspectExpiration(currentBlockNumber, prospectedBlockNumber) <= 0;
}

function isFindable(planet, currentBlockNumber) {
  return (
    currentBlockNumber !== undefined &&
    df.isPlanetMineable(planet) &&
    planet.prospectedBlockNumber !== undefined &&
    !planet.hasTriedFindingArtifact &&
    !planet.unconfirmedFindArtifact &&
    !prospectExpired(currentBlockNumber, planet.prospectedBlockNumber)
  );
}

function isProspectable(planet) {
  return df.isPlanetMineable(planet) && planet.prospectedBlockNumber === undefined && !planet.unconfirmedProspectPlanet;
}

function enoughEnergyToProspect(p) {
  return energy(p) >= 96;
}

function createDom(tag, text) {
  let dom = document.createElement(tag);
  if (text) {
    let now = new Date();
    now = (now.getMonth() + 1) + "-" + now.getDate() + " " + now.getHours() +
      ":" + now.getMinutes() + ":" + now.getSeconds()
    dom.innerText = "[" + now + "] " + text;
  }
  return dom;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class ArtifactsFinder {
  constructor() {
    this.logs = null;
    this.prospectTimerId = null;
    this.findTimerId = null;
    this.finding = false;
    this.pendingPlanets = [];
    this.findArtifactsButton = createDom('button');
  }

  logAction(log, planet) {
    let biome = BiomeNames[planet.biome];
    let dom = createDom("div", log.action + " LV" + planet.planetLevel + " " +
      biome + " at " + coords(planet));
    dom.addEventListener('click', function () {
      ui.centerPlanet(planet)
    });
    this.logs.appendChild(dom);
  }

  findArtifacts() {
    let currentBlockNumber = df.contractsAPI.ethConnection.blockNumber;
    let prospectingPlanets = [];
    while (this.pendingPlanets.length > 0) {
      if (!this.finding) break;
      let planet = this.pendingPlanets.shift();
      if (planet === undefined) {
        break;
      }
      planet = df.getPlanetWithId(planet.locationId);
      if (isFindable(planet, currentBlockNumber)) {
        try {
          let log = {
            planet: planet,
            action: 'Finding'
          }
          df.findArtifact(planet.locationId);
          this.logAction(log, planet);
        } catch (err) {
          console.log(err);
        }
      } else if (planet.prospectedBlockNumber === undefined) {
        // still prospecting
        prospectingPlanets.push(planet);
      }
    }
    Array.from(prospectingPlanets)
      .forEach(planet => {
        this.pendingPlanets.push(planet);
      })
  }

  prospectArtifacts() {
    if (this.pendingPlanets.length >= MAX_PLANET_ACTIONS) {
      return;
    }
    let currentBlockNumber = df.contractsAPI.ethConnection.blockNumber;
    let planets = Array.from(df.getMyPlanets()).filter(canHaveArtifact);
    planets.forEach(planet => {
      if (isFindable(planet, currentBlockNumber)) {
        this.pendingPlanets.push(planet);
      }
    });
    planets.forEach(async planet => {
      if (!this.finding) return;
      while (this.pendingPlanets.length >= MAX_PLANET_ACTIONS) {
        await sleep(2000);
        if (!this.finding) return;
      }
      try {
        if (isProspectable(planet) && enoughEnergyToProspect(planet)) {
          let log = {
            planet: planet,
            action: "Prospecting"
          }
          df.prospectPlanet(planet.locationId);
          this.pendingPlanets.push(planet);
          this.logAction(log, planet);
        }
      } catch (err) {
        console.log(err);
      }
    });
  }

  clearTimer() {
    if (this.prospectTimerId) {
      clearInterval(this.prospectTimerId);
    }
    if (this.findTimerId) {
      clearInterval(this.findTimerId);
    }
  }

  startFind() {
    this.clearTimer();
    this.finding = !this.finding;
    if (this.finding) {
      this.logs.appendChild(createDom("div", "Start Finding"));
      this.prospectArtifacts();
      setTimeout(this.findArtifacts.bind(this), 0);
      this.prospectTimerId = setInterval(this.prospectArtifacts.bind(this), LOOP_INTERVAL_MS);
      this.findTimerId = setInterval(this.findArtifacts.bind(this), 10000);
      this.findArtifactsButton.innerText = " Cancel Finding ";
    } else {
      this.findArtifactsButton.innerText = ' Start Find ';
      this.logs.appendChild(createDom("div", "Cancel Find"))
    }
  }

  async render(container) {
    let self = this;
    container.style.width = '450px';
    this.findArtifactsButton.innerText = ' Start Find ';
    container.appendChild(this.findArtifactsButton);
    container.appendChild(createDom('br'));
    container.appendChild(createDom('br'));
    this.findArtifactsButton.addEventListener('click', () => {
      self.startFind()
    });
    this.logs = createDom('div');
    container.appendChild(this.logs);
    this.logs.style.maxHeight = '300px';
    this.logs.style.overflowX = 'hidden';
    this.logs.style.overflowY = 'scroll';
  }

  destroy() {
    this.clearTimer();
  }
}

export default ArtifactsFinder;
