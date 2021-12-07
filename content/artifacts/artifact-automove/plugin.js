// Automove artifacts to spacetime rip and withdraw

import { 
  PlanetType,
  PlanetLevel,
  BiomeNames
} from "https://cdn.skypack.dev/@darkforest_eth/types";

import {
  coords,
  canWithdraw
} from 'https://plugins.zkga.me/utils/utils.js';

// Execute 5 moves or withdraws every time
const CONCURRENCY = 5;

// Trigger automove every 3 minutes
const AUTO_INTERVAL = 60 * 3;

// debug mode
const DEBUG = 0;

// Wormhole cooldown time (48 hours)
const WORMHOLE_COOLDOWN_TIME = 48 * 60 * 60;

// Artifacts(except warmhole) cooldown time (24 hours)
const ARTIFACT_COOLDOWN_TIME = 24 * 60 * 60;

const planetLevels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];


function distance(from, to) {
    let fromloc = from.location;
    let toloc = to.location;
    return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
}


function isSpaceRip(planet) {
  return planet.planetType === PlanetType.TRADING_POST;
}


function isActiveArtifact(fromPlanet, artifactId) {
  let artifact = df.getActiveArtifact(fromPlanet);
  if (artifact && artifact.id == artifactId) {
    return true;
  } else {
    return false;
  }
}


function isCooldown(artifact) {
    if (artifact) {
      if (artifact.lastDeactivated == 0) {
        return false;
      }
      if (artifact.artifactType == 5) {
        // Wormhole
        if (Date.now() > (artifact.lastDeactivated + WORMHOLE_COOLDOWN_TIME) * 1000) {
          return false;
        }
      }
      if (Date.now() > (artifact.lastDeactivated + ARTIFACT_COOLDOWN_TIME) * 1000) {
        return false;
      }
    }
    return true;
}


function getArrivalsForPlanet(planetId) {
    return df.getAllVoyages().filter(arrival => arrival.toPlanet === planetId).filter(p => p.arrivalTime > Date.now() / 1000);
}


class Plugin {
  constructor() {
    this.maxEnergyPercent = 100;
    this.maxMiddlePlanetLevel = PlanetLevel.FOUR;
    this.conCurrentNum = CONCURRENCY;
    this.autoSeconds = AUTO_INTERVAL;
    this.deactivateArtifactIfNeeded = false;
    this.message = document.createElement('div');
    this.logs = document.createElement('div');
  }


  move(fromPlanet, artifactId, rip) {
    const candidates = df.getPlanetsInRange(
      fromPlanet.locationId, 
      this.maxEnergyPercent 
    )
    .filter(p => (
        p.owner == df.account &&
        p.locationId !== fromPlanet.locationId &&
        p.planetType !== PlanetType.SILVER_BANK &&
        (isSpaceRip(p) || p.planetLevel <= this.maxMiddlePlanetLevel)
    ))
    .map(to => {
        return [to, distance(rip, to)]
    })
    .sort((a, b) => a[1] - b[1]);

    if(candidates.length == 0) {
      console.log(fromPlanet.locationId + 'can not automove to spacetime rip');
      return 0;
    }

    const fromId = fromPlanet.locationId;
    for (let candidate of candidates) {
      // Remember its a tuple of candidates and their distance
      let toId = candidate[0].locationId;

      const heldArtifactNum = candidate[0].heldArtifactIds.length;
      const unconfirmed = df.getUnconfirmedMoves().filter(move => move.to === toId);
      const arrivals = getArrivalsForPlanet(toId);

      // Rejected if >5 tx (pending + unconfirmed) arrivals
      if (unconfirmed.length + arrivals.length > 5) {
        continue;
      }

      // one planet can only held <= 5 artifacts
      const unconfirmedArtifacts = unconfirmed.filter(move => move.artifact);
      const arrivalArtifacts = arrivals.filter(arrival => arrival.artifactId);
      if (unconfirmedArtifacts.length + arrivalArtifacts.length + heldArtifactNum > 5) {
        continue;
      }

      let energyNeeded = Math.ceil(df.getEnergyNeededForMove(fromId, toId, 10));

      if (fromPlanet.energy >= energyNeeded) {
        df.move(fromId, toId, energyNeeded, 0, artifactId);
        console.log("Move:" + fromId + " => " + toId + " energyNeeded:" + energyNeeded + " artifactId:" + artifactId);
        this.logAction("Move", fromPlanet);
        return 1;
      }
    }
    return 0;
  }


  automove(artifactPlanet, rips) {
    let n = 0;
    let fromId = artifactPlanet.locationId;
    for (let artifactId of artifactPlanet.heldArtifactIds) {
      let artifact = df.getArtifactWithId(artifactId);
      if (!artifact) {
        console.log("Error: df.getArtifactWithId(" + artifactId +  ")");
        console.log(artifactPlanet);
        continue;
      }

      if (artifact.unconfirmedWithdrawArtifact || artifact.unconfirmedMove || artifact.unconfirmedDeactivateArtifact) {
        // skip pending (withdraw or move or deactive) artifact
        continue;
      }

      // can't move an activated artifact
      if (isActiveArtifact(artifactPlanet, artifactId)) {
        if (this.deactivateArtifactIfNeeded) {
          df.deactivateArtifact(fromId, artifactId);
          console.log("DeactivateArtifact:" + fromId + " artifactId:" + artifactId);
          this.logAction("DeactivateArtifact", artifactPlanet);
          continue;
        }
      }

      if (isCooldown(artifact)) {
        continue;
      }

      if (isSpaceRip(artifactPlanet) && artifactPlanet.planetLevel > artifact.rarity) {
        // no more move, withdraw it!
        df.withdrawArtifact(artifactPlanet.locationId, artifactId);
        console.log("Withdraw:" + fromId + " artifactId:" + artifactId);
        this.logAction("Withdraw", artifactPlanet);
        n += 1;
      } else {
        const candidate_rips = rips
        .filter(p => (
            p.planetLevel > artifact.rarity
        ))
        .map(to => {
            return [to, distance(artifactPlanet, to)];
        })
        .sort((a, b) => a[1] - b[1]);

        if(candidate_rips.length == 0) {
          console.log(fromPlanet.locationId + ' can not automove to any spacetime rip');
          continue;
        }

        // Remember its a tuple of candidates and their distance
        const candidate_rip = candidate_rips[0][0];
        // move artifact to the nearest spacetime rip.
        n += this.move(artifactPlanet, artifactId, candidate_rip);
      }

      // move one artifact at a time!!!
      break;
    }
    return n;
  }


  globalAutoMove() {
    let n = df.getUnconfirmedMoves().length;
    let rips = df.getMyPlanets()
    .filter(p => (
        isSpaceRip(p)
    ));

    for (let planet of df.getMyPlanets()) {

      if (planet.heldArtifactIds.length != 0) {
        n += this.automove(planet, rips);
        if (n >= this.conCurrentNum) {
          break;
        }
      }
    }
  }


  render(container) {
    container.parentElement.style.minHeight = 'unset';
    container.style.minHeight = 'unset';

    container.style.width = '260px';

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

    let levelLabel = document.createElement('label');
    levelLabel.innerText = 'Max. level to use';
    levelLabel.style.display = 'block';

    let level = document.createElement('select');
    level.style.background = 'rgb(8,8,8)';
    level.style.width = '100%';
    level.style.marginTop = '10px';
    level.style.marginBottom = '10px';
    planetLevels.forEach(lvl => {
      let opt = document.createElement('option');
      opt.value = `${lvl}`;
      opt.innerText = `Level ${lvl}`;
      level.appendChild(opt);
    });
    level.value = `${this.maxMiddlePlanetLevel}`;

    level.onchange = (evt) => {
      try {
        this.maxMiddlePlanetLevel = parseInt(evt.target.value, 10);
      } catch (e) {
        console.error('could not parse planet level', e);
      }
    }

    let deactivateArtifactLabel = document.createElement('label');
    deactivateArtifactLabel.innerText = 'Deactivate Artifact';
    deactivateArtifactLabel.style.paddingRight = "10px";
    deactivateArtifactLabel.style.marginBottom = '10px';

    let deactivateArtifactCheck = document.createElement('input');
    deactivateArtifactCheck.type = "checkbox";
    deactivateArtifactCheck.checked = false;
    deactivateArtifactCheck.onchange = (evt) => {
      if (evt.target.checked) {
        this.deactivateArtifactIfNeeded = true;
      } else {
        this.deactivateArtifactIfNeeded = false;
      }
    };

    let showButton = document.createElement('button');
    showButton.style.display = 'block';
    showButton.style.width = '100%';
    showButton.innerText = 'Artifact Go Home!';
    showButton.onclick = () => {
        this.globalAutoMove();
    }

    let autoSecondsStepper = document.createElement('input');
    autoSecondsStepper.type = 'range';
    autoSecondsStepper.min = '60';
    autoSecondsStepper.max = '600';
    autoSecondsStepper.step = '60';
    autoSecondsStepper.value = `${this.autoSeconds}`;
    autoSecondsStepper.style.width = '80%';
    autoSecondsStepper.style.height = '24px';

    let autoSecondsInfo = document.createElement('span');
    autoSecondsInfo.innerText = `Every ${autoSecondsStepper.value} seconds`;
    autoSecondsInfo.style.display = 'block';
    autoSecondsInfo.style.marginTop = '10px';

    autoSecondsStepper.onchange = (evt) => {
      try {
        this.autoSeconds = parseInt(evt.target.value, 10);
        autoSecondsInfo.innerText = `Every ${autoSecondsStepper.value} seconds`;
      } catch (e) {
        console.error('could not parse auto seconds', e);
      }
    }

    let autoMoveLabel = document.createElement('label');
    autoMoveLabel.innerHTML = 'AutoMove & WithDraw';
    autoMoveLabel.style.paddingRight = "10px";
  
    let autoMovePlantCheck = document.createElement('input');
    autoMovePlantCheck.type = "checkbox";
    autoMovePlantCheck.style.marginRight = "10px";
    autoMovePlantCheck.checked = false;
    autoMovePlantCheck.onchange = (evt) => {
      if (evt.target.checked) {
        this.message.innerText = 'Artifact AutoMove...';
        this.sendTimer = setInterval(() => {
          setTimeout(this.globalAutoMove.bind(this), 0);
        }, 1000 * this.autoSeconds)
      } else {
        this.message.innerText = 'Move Artifact by Hand';
        this.clearSendTimer();
      }
    };

    container.appendChild(stepperLabel);
    container.appendChild(stepper);
    container.appendChild(percent);
    container.appendChild(levelLabel);
    container.appendChild(level);
    container.appendChild(deactivateArtifactLabel);
    container.appendChild(deactivateArtifactCheck);
    container.appendChild(showButton);

    // auto
    container.appendChild(autoSecondsInfo);
    container.appendChild(autoSecondsStepper);

    container.appendChild(autoMoveLabel);
    container.appendChild(autoMovePlantCheck);
    container.appendChild(this.message);
    container.appendChild(this.logs);
  }

  logAction(action, planet) {
    if (DEBUG) {
      let biome = BiomeNames[planet.biome];
      let dom = document.createElement("div");
      dom.innerText = action + " from " + biome + " at " + coords(planet);
      dom.addEventListener('click', function () {
        ui.centerPlanet(planet)
      });
      this.logs.appendChild(dom);
    }
  }

  clearSendTimer() {
    if (this.sendTimer) {
      clearInterval(this.sendTimer);
    }
  }

  destroy() {
    this.clearSendTimer()
  }
}

export default Plugin;


