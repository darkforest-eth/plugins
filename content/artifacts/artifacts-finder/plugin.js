// Artifacts Finder
//
// This plugin offers a button to auto prospect artifacts every 5 minutes and find after prospect finish.
// To stop simply close the plugin
// Simple is Power!

// Author: SnowTiger

import {
  coords,
  canHaveArtifact,
} from 'https://plugins.zkga.me/utils/utils.js';

import {
  ArtifactType,
  PlanetType,
  BiomeNames
} from "https://cdn.skypack.dev/@darkforest_eth/types"

import {
  isUnconfirmedFindArtifactTx,
  isUnconfirmedProspectPlanetTx,
} from 'https://cdn.skypack.dev/@darkforest_eth/serde';

// prospect artifacts every 1 minutes
let AUTO_INTERVAL = 1000 * 60 * 1;


function blocksLeftToProspectExpiration(
  currentBlockNumber,
  prospectedBlockNumber
) {
  return (prospectedBlockNumber || 0) + 255 - currentBlockNumber;
}

function prospectExpired(currentBlockNumber, prospectedBlockNumber) {
  return blocksLeftToProspectExpiration(currentBlockNumber, prospectedBlockNumber) <= 0;
}

function gear() {
  return df.getMyArtifacts().filter(e => e.artifactType == ArtifactType.ShipGear)[0];
}

function whereIsGear() {
  const g = gear();
  const pid = (!g || (!!g.onVoyageId && df.getAllVoyages().filter(v => v.eventId == g.onVoyageId).length > 0)) ? undefined : g.onPlanetId;
  if (pid !== undefined) {
    return df.getPlanetWithId(pid);
  }
  return pid;
}

function isFindable(planet, currentBlockNumber) {
  return (
    currentBlockNumber !== undefined &&
    planet.planetType === PlanetType.RUINS &&
    planet.prospectedBlockNumber !== undefined &&
    !planet.hasTriedFindingArtifact &&
    !prospectExpired(currentBlockNumber, planet.prospectedBlockNumber)
  );
}

function isProspectable(planet) {
  return (
    planet.planetType === PlanetType.RUINS &&
    planet.prospectedBlockNumber === undefined
  );
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

function distance(from, to) {
  let fromloc = from.location;
  let toloc = to.location;
  return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
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
    let gearPlanet = whereIsGear();
    if (!gearPlanet) {
      return;
    }
    while (this.pendingPlanets.length > 0) {
      if (!this.finding) break;
      let planet = this.pendingPlanets.shift();
      if (planet === undefined) {
        break;
      }
      planet = df.getPlanetWithId(planet.locationId);
      if (planet.locationId === gearPlanet.locationId && isFindable(planet, currentBlockNumber)) {
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

  async prospectArtifacts() {
    let gearId = gear()?.id;
    let gearPlanet = whereIsGear();
    let currentBlockNumber = df.contractsAPI.ethConnection.blockNumber;

    if (!gearPlanet) {
      return;
    }
    if (gearPlanet.owner === df.account && isProspectable(gearPlanet)) {
      if (!gearPlanet.transactions?.hasTransaction(isUnconfirmedProspectPlanetTx)) {
        let log = {
          planet: gearPlanet,
          action: 'Prospecting'
        }
        this.logAction(log, gearPlanet);
        const tx = await df.prospectPlanet(gearPlanet.locationId);
        await tx.confirmedPromise;
        this.pendingPlanets.push(gearPlanet);
      }
    } else if (gearPlanet.owner === df.account && isFindable(gearPlanet, currentBlockNumber)) {
      if (!gearPlanet.transactions?.hasTransaction(isUnconfirmedFindArtifactTx) &&
        this.pendingPlanets.filter(p => p.locationId === gearPlanet.locationId).length === 0) {
        this.pendingPlanets.push(gearPlanet);
      }
    } else {
      // find nearest Foundry
      let ps = Array.from(df.getMyPlanets())
        .filter(canHaveArtifact)
        .filter(p => p.locationId !== gearPlanet.locationId)
        .map(to => {
          return [to, distance(gearPlanet, to)]
        })
        .sort((a, b) => a[1] - b[1]);
      if (ps.length > 0) {
        const to = ps[0][0];
        ui.terminal.current?.printShellLn(
          `df.move('${gearPlanet.locationId}', '${to.locationId}', 0, 0, '${gearId}')`
        );
        df.move(gearPlanet.locationId, to.locationId, 0, 0, gearId);
        let log = {
          planet: to,
          action: 'Moving to'
        }
        this.logAction(log, to);
      }
    }
  }

  clearTimer() {
    if (this.prospectTimerId) {
      clearInterval(this.prospectTimerId);
    }
    if (this.findTimerId) {
      clearInterval(this.findTimerId);
    }
  }

  async startFind() {
    this.clearTimer();
    this.finding = !this.finding;
    if (this.finding) {
      this.logs.appendChild(createDom("div", "Start Finding"));
      setTimeout(this.findArtifacts.bind(this), 0);
      setTimeout(this.prospectArtifacts.bind(this), 0);
      this.prospectTimerId = setInterval(this.prospectArtifacts.bind(this), AUTO_INTERVAL);
      this.findTimerId = setInterval(this.findArtifacts.bind(this), 10000);
      this.findArtifactsButton.innerText = " Cancel Finding ";
    } else {
      this.findArtifactsButton.innerText = ' Start Find ';
      this.logs.appendChild(createDom("div", "Cancel Find"))
    }
  }

  async render(container) {
    let self = this;
    container.style.width = '550px';
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
