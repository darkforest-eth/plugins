class Plugin {
  constructor() {
    this.maxEnergyPercent = 85;
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

    let button = document.createElement('button');
    button.style.width = '100%';
    button.style.marginBlockEnd = '10px';
    button.innerHTML = 'Distribute selected'
    button.onclick = () => {
      let planet = ui.getSelectedPlanet();
      if (planet) {
        // TODO: Min planet level?
        distributeSilver(
          planet.locationId,
          this.maxEnergyPercent,
        );
      } else {
        console.log('no planet selected');
      }
    }

    container.appendChild(stepperLabel);
    container.appendChild(stepper);
    container.appendChild(percent);
    container.appendChild(button);
  }
}

plugin.register(new Plugin());

// distribute all silver to your closest owned planets who need until you run out
// of silver or energy, but don't go below 25% total energy
// distribute_funds("0000589000f2b5ff2e7823c5fd51eba81e283d0fb4487d6d1d9ea4d5b22eae39", 25);
function distributeSilver(fromId, maxDistributeEnergyPercent) {
  const from = df.getPlanetWithId(fromId);

  const candidates_ = df.getPlanetsInRange(fromId, maxDistributeEnergyPercent)
    .filter(p => p.owner === df.getAccount())
    .filter(p => !isAsteroid(p))
    .map(to => [to, distance(from, to)])
    .sort((a, b) => a[1] - b[1]);


  let i = 0;
  const energyBudget = Math.floor((maxDistributeEnergyPercent / 100) * from.energy);
  const silverBudget = Math.floor(from.silver);

  let energySpent = 0;
  let silverSpent = 0;
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

    df.move(fromId, candidate.locationId, energyNeeded, silverNeeded);
    energySpent += energyNeeded;
    silverSpent += silverNeeded;
  }
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
