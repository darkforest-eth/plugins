let {
  move,
} = await import('https://plugins.zkga.me/utils/queued-move.js');

class Plugin {
  constructor() {
    this.maxEnergyPercent = 85;
	this.minPlanetLevel = 3;
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


    let levelLabel = document.createElement('label');
    levelLabel.innerText = 'Min. Lvl to send to:';
    levelLabel.style.display = 'block';

    let level = document.createElement('select');
    level.style.background = 'rgb(8,8,8)';
    level.style.width = '100%';
    level.style.marginTop = '10px';
    level.style.marginBottom = '10px';
    [0, 1, 2, 3, 4, 5, 6, 7].forEach(lvl => {
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

    let button = document.createElement('button');
    button.style.width = '100%';
    button.style.marginBottom = '10px';
    button.innerHTML = 'Distribute selected'
    button.onclick = () => {
      let planet = ui.getSelectedPlanet();
      if (planet) {
        // TODO: Min planet level?
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
    asteroidButton.innerHTML = 'Distribute asteroids'
    asteroidButton.onclick = () => {
      message.innerText = 'Please wait...';

      let moves = 0;
      for (let planet of df.getMyPlanets()) {
        if (isAsteroid(planet)) {
          setTimeout(() => {
            moves += distributeSilver(planet.locationId, this.maxEnergyPercent, this.minPlanetLevel)
            message.innerText = `Sending to ${moves} planets.`;
          }, 0);
        }
      }
    }

    container.appendChild(stepperLabel);
    container.appendChild(stepper);
    container.appendChild(percent);
	container.appendChild(levelLabel);
	container.appendChild(level);
    container.appendChild(button);
    container.appendChild(asteroidButton);
    container.appendChild(message);
  }
}

plugin.register(new Plugin());

function distributeSilver(fromId, maxDistributeEnergyPercent, minPLevel) {
  const from = df.getPlanetWithId(fromId);

  const candidates_ = df.getPlanetsInRange(fromId, maxDistributeEnergyPercent)
    .filter(p => p.owner === df.getAccount())
    .filter(p => !isAsteroid(p))
	.filter(p => p.planetLevel >= minPLevel)
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
  return planet.planetResource === 1;
}

//returns tuples of [planet,distance]
function distance(from, to) {
  let fromloc = from.location;
  let toloc = to.location;
  return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
}

function getArrivalsForPlanet(planetId) {
  return df.getAllVoyages().filter(arrival => arrival.toPlanet === planetId);
}

plugin.register(new Plugin());
