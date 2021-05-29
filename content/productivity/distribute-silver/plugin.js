import {
  move
} from 'https://plugins.zkga.me/utils/queued-move.js';

const MAX_LEVEL_PLANET = 9;

class Plugin {
  constructor() {
    this.maxEnergyPercent = 85;
    this.minPlanetLevel = 3;
    this.maxAsteroidLevel = 2;
  }
  render(container) {
    container.style.width = '200px';

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
    let message = document.createElement('div');


    let levelLabel = document.createElement('label');
    levelLabel.innerText = 'Min. Lvl to send to:';
    levelLabel.style.display = 'block';

    let level = document.createElement('select');
    level.style.background = 'rgb(8,8,8)';
    level.style.width = '100%';
    level.style.marginTop = '10px';
    level.style.marginBottom = '10px';
    Array.from(Array(MAX_LEVEL_PLANET+1).keys()).forEach(lvl => {
      let opt = document.createElement('option');
      opt.value = `${lvl}`;
      opt.innerText = `Level ${lvl}`;
      level.appendChild(opt);
    });
    level.value = `${this.minPlanetLevel}`;

    level.onchange = (evt) => {
      try {
        this.minPlanetLevel = parseInt(evt.target.value);
      } catch (e) {
        console.error('could not parse planet level', e);
      }
    }

    // asteroid level

    let levelAsteroidLabel = document.createElement('label');
    levelAsteroidLabel.innerText = 'Max. Lvl asteroid from:';
    levelAsteroidLabel.style.display = 'block';

    let levelAsteroid = document.createElement('select');
    levelAsteroid.style.background = 'rgb(8,8,8)';
    levelAsteroid.style.width = '100%';
    levelAsteroid.style.marginTop = '10px';
    levelAsteroid.style.marginBottom = '10px';
    Array.from(Array(MAX_LEVEL_PLANET+1).keys()).forEach(lvl => {
      let opt = document.createElement('option');
      opt.value = `${lvl}`;
      opt.innerText = `Level ${lvl}`;
      levelAsteroid.appendChild(opt);
    });
    levelAsteroid.value = `${this.minPlanetLevel}`;

    levelAsteroid.onchange = (evt) => {
      try {
        this.maxAsteroidLevel = parseInt(evt.target.value);
      } catch (e) {
        console.error('could not parse planet level', e);
      }
    }


    // distribute

    let button = document.createElement('button');
    button.style.width = '100%';
    button.style.marginBottom = '10px';
    button.innerHTML = 'Distribute selected'
    button.onclick = () => {
      let planet = ui.getSelectedPlanet();
      if (planet) {
        distributeSilver(
          planet.locationId,
          this.maxEnergyPercent,
          this.minPlanetLevel
        );
      } else {
        console.log('no planet selected');
      }
    }

    let asteroidButton = document.createElement('button');
    asteroidButton.style.width = '100%';
    asteroidButton.style.marginBottom = '10px';
    asteroidButton.innerHTML = 'All to planets'
    asteroidButton.onclick = () => {
      message.innerText = 'Please wait...';

      let moves = 0;
      for (let planet of df.getMyPlanets()) {
        if (isAsteroid(planet) && planet.planetLevel <= this.maxAsteroidLevel) {
          setTimeout(() => {
            moves += distributeSilver(planet.locationId, this.maxEnergyPercent, this.minPlanetLevel, false);
            message.innerText = `Sending to ${moves} planets.`;
          }, 0);
        }
      }
    }

    let toSpaceRiftButton = document.createElement('button');
    toSpaceRiftButton.style.width = '100%';
    toSpaceRiftButton.style.marginBottom = '10px';
    toSpaceRiftButton.innerHTML = 'All to space rift';
    toSpaceRiftButton.onclick = () => {
      message.innerText = 'Please wait...';

      let moves = 0;
      for (let planet of df.getMyPlanets()) {
        if (isAsteroid(planet) && planet.planetLevel <= this.maxAsteroidLevel) {
          setTimeout(() => {
            moves += distributeSilver(planet.locationId, this.maxEnergyPercent, this.minPlanetLevel, true);
            message.innerText = `Sending to ${moves} space rift.`;
          }, 0);
        }
      }
    }

    let withdrawtButton = document.createElement('button');
    withdrawtButton.style.width = '100%';
    withdrawtButton.style.marginBottom = '10px';
    withdrawtButton.innerHTML = 'Withdraw from space rift';
    withdrawtButton.onclick = () => {
      message.innerText = 'Please wait...';

      let moves = 0;
      let silver =0;
      let tmp; 
      for (let planet of df.getMyPlanets()) {
        if (isSpaceRift(planet)) {
          setTimeout(() => {
            silver+= withdrawSilver(planet.locationId);
            moves+= 1;  
            message.innerText = `Withdrawing ${silver} from ${moves} space rifts.`;
          }, 0);
        }
      }
    }

    container.appendChild(stepperLabel);
    container.appendChild(stepper);
    container.appendChild(percent);
    container.appendChild(levelLabel);
    container.appendChild(level);
    container.appendChild(levelAsteroidLabel);
    container.appendChild(levelAsteroid);
    container.appendChild(button);
    container.appendChild(asteroidButton);
    container.appendChild(toSpaceRiftButton);
    container.appendChild(withdrawtButton);
    container.appendChild(message);
  }
}

function withdrawSilver(fromId) {
    const from = df.getPlanetWithId(fromId);
    const silver =  Math.floor(from.silver);
    if (silver === 0) {
      return 0;
    } 
    df.withdrawSilver(fromId, silver);
    return silver;
}

function toPlanetOrSpaceRift(planet, toSpaceRift) {
        return toSpaceRift ? isSpaceRift(planet) : isPlanet(planet);
}

function distributeSilver(fromId, maxDistributeEnergyPercent, minPLevel, toSpaceRift) {
  const from = df.getPlanetWithId(fromId);
  const silverBudget = Math.floor(from.silver);

  // we ignore 50 silvers or less
  if( silverBudget < 50 ) {
    return 0;
  }
  const candidates_ = df.getPlanetsInRange(fromId, maxDistributeEnergyPercent)
    .filter(p => p.owner === df.getAccount()) //get player planets
    .filter(p => toPlanetOrSpaceRift(p, toSpaceRift)) // filer planet or space rift 
    .filter(p => p.planetLevel >= minPLevel) // filer level
    .map(to => [to, distance(from, to)])
    .sort((a, b) => a[1] - b[1]);


  let i = 0;
  const energyBudget = Math.floor((maxDistributeEnergyPercent / 100) * from.energy);

  let energySpent = 0;
  let silverSpent = 0;
  let moves = 0;
  while (energyBudget - energySpent > 0 && i < candidates_.length) {

    const silverLeft = silverBudget - silverSpent;
    const energyLeft = energyBudget - energySpent;

    // Remember its a tuple of candidates and their distance
    const candidate = candidates_[i++][0];

    // Rejected if has more than 5 pending arrivals. Transactions are reverted when more arrives. You can't increase it
    const unconfirmed = df.getUnconfirmedMoves().filter(move => move.to === candidate.locationId)
    const arrivals = getArrivalsForPlanet(candidate.locationId);
    if (unconfirmed.length + arrivals.length> 4) {
      continue;
    }

    const silverRequested = Math.ceil(candidate.silverCap - candidate.silver);
    const silverNeeded = silverRequested > silverLeft ? silverLeft : silverRequested;


    // Setting a 100 silver guard here, but we could set this to 0
    if (silverNeeded < 100) {
      continue;
    }

    // needs to be a whole number for the contract
    const energyNeeded = Math.ceil(df.getEnergyNeededForMove(fromId, candidate.locationId, 1));
    if (energyLeft - energyNeeded < 0) {
      continue;
    }

    move(fromId, candidate.locationId, energyNeeded, silverNeeded);
    energySpent += energyNeeded;
    silverSpent += silverNeeded;
    moves += 1;
  }

  return moves;
}

function isAsteroid(planet) {
  return planet.planetType === 1;
}

function isPlanet(planet) {
    return planet.planetType === 0;
  }

function isSpaceRift(planet) {
    return planet.planetType === 3;
  }

//returns tuples of [planet,distance]
function distance(from, to) {
  let fromloc = from.location;
  let toloc = to.location;
  return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
}

function getArrivalsForPlanet(planetId) {
  return df.getAllVoyages().filter(arrival => arrival.toPlanet === planetId).filter(p => p.arrivalTime > Date.now() / 1000);
}

export default Plugin;
