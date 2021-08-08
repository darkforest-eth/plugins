/**
 * Silver Spacetime
 * This plugin has a bunch of overlap with Distribute Silver
 * but I wanted to add automatic sending, the problem was that it
 * caused a bunch of network congestion in 0.6 Round 1.
 *
 * In order to deal with that, I added a bunch of controls to adjust
 * how much you wanted to congest and it grew too large for that plugin.
 *
 * This also contains an automatic withdraw feature.
 *
 * Be aware: This has opinions about how you should distribute your silver
 * and will even try to capture unowned spacetime rips nearby.
 */

import { EMPTY_ADDRESS } from "https://cdn.skypack.dev/@darkforest_eth/constants"
import { PlanetType } from "https://cdn.skypack.dev/@darkforest_eth/types"

const players = [
  df.getAccount(),
  // Crawls nearby unowned spacetimes
  EMPTY_ADDRESS,
];

class Plugin {
  constructor() {
    this.maxPending = 1000;
    this.maxMoves = 10;
    this.maxEnergyPercent = 95;
    this.autoSeconds = 30;
    this.message = document.createElement('div');
  }
  render(container) {
    container.style.width = '320px';

    let maxPendingLabel = document.createElement('label');
    maxPendingLabel.innerText = 'Max pending moves';
    maxPendingLabel.style.display = 'block';

    let maxPendingStepper = document.createElement('input');
    maxPendingStepper.type = 'range';
    maxPendingStepper.min = '0';
    maxPendingStepper.max = '1000';
    maxPendingStepper.step = '10';
    maxPendingStepper.value = `${this.maxPending}`;
    maxPendingStepper.style.width = '85%';
    maxPendingStepper.style.height = '24px';

    let maxPendingInfo = document.createElement('span');
    maxPendingInfo.innerText = `${maxPendingStepper.value}`;
    maxPendingInfo.style.float = 'right';

    maxPendingStepper.onchange = (evt) => {
      try {
        this.maxPending = parseInt(evt.target.value, 10);
        maxPendingInfo.innerText = `${this.maxPending}`;
      } catch (e) {
        console.error('could not parse max pending', e);
      }
    }

    let maxMovesLabel = document.createElement('label');
    maxMovesLabel.innerText = 'Max moves to queue';
    maxMovesLabel.style.display = 'block';

    let maxMovesStepper = document.createElement('input');
    maxMovesStepper.type = 'range';
    maxMovesStepper.min = '10';
    maxMovesStepper.max = '1000';
    maxMovesStepper.step = '10';
    maxMovesStepper.value = `${this.maxMoves}`;
    maxMovesStepper.style.width = '85%';
    maxMovesStepper.style.height = '24px';

    let maxMovesInfo = document.createElement('span');
    maxMovesInfo.innerText = `${maxMovesStepper.value}`;
    maxMovesInfo.style.float = 'right';

    maxMovesStepper.onchange = (evt) => {
      try {
        this.maxMoves = parseInt(evt.target.value, 10);
        maxMovesInfo.innerText = `${this.maxMoves}`;
      } catch (e) {
        console.error('could not parse max moves', e);
      }
    }

    let maxEnergyLabel = document.createElement('label');
    maxEnergyLabel.innerText = 'Max % energy to spend';
    maxEnergyLabel.style.display = 'block';

    let maxEnergyStepper = document.createElement('input');
    maxEnergyStepper.type = 'range';
    maxEnergyStepper.min = '0';
    maxEnergyStepper.max = '100';
    maxEnergyStepper.step = '5';
    maxEnergyStepper.value = `${this.maxEnergyPercent}`;
    maxEnergyStepper.style.width = '85%';
    maxEnergyStepper.style.height = '24px';

    let maxEnergyPercentInfo = document.createElement('span');
    maxEnergyPercentInfo.innerText = `${maxEnergyStepper.value}%`;
    maxEnergyPercentInfo.style.float = 'right';

    maxEnergyStepper.onchange = (evt) => {
      try {
        this.maxEnergyPercent = parseInt(evt.target.value, 10);
        maxEnergyPercentInfo.innerText = `${this.maxEnergyPercent}%`;
      } catch (e) {
        console.error('could not parse energy percent', e);
      }
    }


    let asteroidButton = document.createElement('button');
    asteroidButton.style.width = '100%';
    asteroidButton.style.marginBottom = '10px';
    asteroidButton.innerHTML = 'Distribute asteroids'
    asteroidButton.onclick = () => {
      this.message.innerText = 'Please wait...';

      setTimeout(() => {
        let [moves, total] = this.massMove();
        if (moves) {
          this.message.innerText = `Sending ${moves} moves of ${total} total asteroids.`;
        }
      }, 0);
    }

    let autoSecondsLabel = document.createElement('label');
    autoSecondsLabel.innerText = 'Every X seconds';
    autoSecondsLabel.style.display = 'block';

    let autoSecondsStepper = document.createElement('input');
    autoSecondsStepper.type = 'range';
    autoSecondsStepper.min = '30';
    autoSecondsStepper.max = '600';
    autoSecondsStepper.step = '30';
    autoSecondsStepper.value = `${this.autoSeconds}`;
    autoSecondsStepper.style.width = '80%';
    autoSecondsStepper.style.height = '24px';

    let autoSecondsInfo = document.createElement('span');
    autoSecondsInfo.innerText = `${autoSecondsStepper.value} secs`;
    autoSecondsInfo.style.float = 'right';

    autoSecondsStepper.onchange = (evt) => {
      try {
        this.autoSeconds = parseInt(evt.target.value, 10);
        autoSecondsInfo.innerText = `${this.autoSeconds} secs`;
      } catch (e) {
        console.error('could not parse auto seconds', e);
      }
    }

    let autoSendLabel = document.createElement('label');
    autoSendLabel.innerHTML = 'Automatic Send';
    autoSendLabel.style.paddingRight = "10px";

    let autoSendCheck = document.createElement('input');
    autoSendCheck.type = "checkbox";
    autoSendCheck.style.marginRight = "10px";
    autoSendCheck.checked = false;
    autoSendCheck.onchange = (evt) => {
      if (evt.target.checked) {
        this.sendTimer = setInterval(() => {
          this.message.innerText = 'Auto send...';

          setTimeout(() => {
            let [moves, total] = this.massMove();
            if (moves) {
              this.message.innerText = `Sending ${moves} moves of ${total} total asteroids.`;
            }
          }, 0);
        }, 1000 * this.autoSeconds)
      } else {
        this.clearSendTimer();
      }
    };

    let autoWithdrawLabel = document.createElement('label');
    autoWithdrawLabel.innerHTML = 'Automatic Withdraw';
    autoWithdrawLabel.style.paddingRight = "10px";

    let autoWithdrawCheck = document.createElement('input');
    autoWithdrawCheck.type = "checkbox";
    autoWithdrawCheck.checked = false;
    autoWithdrawCheck.onchange = (evt) => {
      if (evt.target.checked) {
        this.withdrawTimer = setInterval(() => {
          const myPlanets = df.getMyPlanets();
          const spacetimeWithSilver = myPlanets.filter((planet) => (
            planet.planetType === PlanetType.TRADING_POST && planet.silver > 0 && !planet.unconfirmedWithdrawSilver
          ));

          for (const planet of spacetimeWithSilver) {
            console.log(`withdrawing ${planet.silver} silver from`, planet);
            df.withdrawSilver(planet.locationId, Math.floor(planet.silver));
          }
        }, 1000 * this.autoSeconds)
      } else {
        this.clearWithdrawTimer();
      }
    };

    // Pending
    container.appendChild(maxPendingLabel);
    container.appendChild(maxPendingStepper);
    container.appendChild(maxPendingInfo);
    // Moves
    container.appendChild(maxMovesLabel);
    container.appendChild(maxMovesStepper);
    container.appendChild(maxMovesInfo);
    // Max energy
    container.appendChild(maxEnergyLabel);
    container.appendChild(maxEnergyStepper);
    container.appendChild(maxEnergyPercentInfo);
    // Manual send button
    container.appendChild(asteroidButton);
    // Moves
    container.appendChild(autoSecondsLabel);
    container.appendChild(autoSecondsStepper);
    container.appendChild(autoSecondsInfo);
    // Auto send
    container.appendChild(autoSendLabel);
    container.appendChild(autoSendCheck);
    // Auto withdraw
    container.appendChild(autoWithdrawLabel);
    container.appendChild(autoWithdrawCheck);
    container.appendChild(this.message);
  }
  massMove() {
    let moves = 0;
    let pending = Object.keys(df.entityStore.unconfirmedMoves).length

    if (pending > this.maxPending) {
      this.message.innerText = `Still ${pending} moves queued.`;
      return [moves, null];
    }

    const asteroids = df.getMyPlanets()
      .filter(p => isAsteroid(p) && p.silver / p.silverCap >= 0.95)
      .sort((a, b) => b.silver / b.silverCap > a.silver / a.silverCap ? 0 : -1);

    for (let planet of asteroids) {
      if (moves > this.maxMoves) return [moves, asteroids.length];

      moves += distributeSilver(planet.locationId, this.maxEnergyPercent)
    }
    return [moves, asteroids.length];
  }
  clearSendTimer() {
    if (this.sendTimer) {
      clearInterval(this.sendTimer);
    }
  }
  clearWithdrawTimer() {
    if (this.withdrawTimer) {
      clearInterval(this.withdrawTimer);
    }
  }
  destroy() {
    this.clearSendTimer()
    this.clearWithdrawTimer()
  }
}

function distributeSilver(fromId, maxDistributeEnergyPercent) {
  const from = df.getPlanetWithId(fromId);

  const candidates_ = df.getPlanetsInRange(fromId, maxDistributeEnergyPercent)
    .filter(p => {
      if (!players.includes(p.owner) || p.planetType !== PlanetType.TRADING_POST) {
        return false;
      }

      // Lvl 1-4 can only send to their level
      if (from.planetLevel <= 4) {
        return p.planetLevel === from.planetLevel
      }

      // Allow lvl 5 to send to lvl 4, etc
      return p.planetLevel >= from.planetLevel - 1
    })
    .map(to => [to, distance(from, to)])
    .sort((a, b) => a[1] - b[1]);


  let i = 0;
  const energyBudget = Math.floor((maxDistributeEnergyPercent / 100) * from.energy);
  const silverBudget = Math.floor(from.silver);

  let energySpent = 0;
  let silverSpent = 0;
  let moves = 0;
  while (energyBudget - energySpent > 0 && i < candidates_.length) {

    const silverLeft = silverBudget - silverSpent;
    const energyLeft = energyBudget - energySpent;

    // Remember its a tuple of candidates and their distance
    const candidate = candidates_[i++][0];

    // Rejected if it will be rate limited
    const arrivals = getArrivalsForPlanet(candidate.locationId);
    if (arrivals > 5) {
      continue;
    }

    const silverRequested = candidate.silverCap;
    const silverNeeded = silverRequested > silverLeft ? silverLeft : silverRequested;

    // Setting a 100 silver guard here, but we could set this to 0
    if (silverNeeded < 100) {
      continue;
    }

    let energyLanding = 50;
    if (candidate.owner !== df.getAccount()) {
      energyLanding += (candidate.energy * (candidate.defense / 100));
    }

    // needs to be a whole number for the contract
    const energyNeeded = Math.ceil(df.getEnergyNeededForMove(fromId, candidate.locationId, energyLanding));
    if (energyLeft - energyNeeded < 0) {
      continue;
    }

    df.move(fromId, candidate.locationId, energyNeeded, silverNeeded);
    energySpent += energyNeeded;
    silverSpent += silverNeeded;
    moves += 1;
  }

  return moves;
}

function isAsteroid(planet) {
  return planet.planetType === PlanetType.SILVER_MINE;
}

//returns tuples of [planet,distance]
function distance(from, to) {
  let fromloc = from.location;
  let toloc = to.location;
  return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
}

function getArrivalsForPlanet(planetId) {
  const unconfirmed = df.getUnconfirmedMoves().filter(move => move.to === planetId);
  const arrivals = df.getAllVoyages().filter(arrival => arrival.toPlanet === planetId);
  return arrivals.length + unconfirmed.length;
}

export default Plugin;
