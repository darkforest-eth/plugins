let {
  move,
} = await import('https://plugins.zkga.me/utils/queued-move.js');

class Plugin {
  constructor() {
    this.minPlanetLevel = 3;
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

    let levelLabel = document.createElement('label');
    levelLabel.innerText = 'Min. planets to capture';
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
          this.minPlanetLevel,
          this.maxEnergyPercent,
        );
        message.innerText = `Crawling ${moves} planets.`;
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
        setTimeout(() => {
          moves += capturePlanets(
            planet.locationId,
            this.minPlanetLevel,
            this.maxEnergyPercent,
          );
          message.innerText = `Crawling ${moves} planets.`;
        }, 0);
      }
    }

    container.appendChild(stepperLabel);
    container.appendChild(stepper);
    container.appendChild(percent);
    container.appendChild(levelLabel);
    container.appendChild(level);
    container.appendChild(button);
    container.appendChild(globalButton);
    container.appendChild(message);
  }
}

plugin.register(new Plugin());


function capturePlanets(fromId, minCaptureLevel, maxDistributeEnergyPercent) {
  const planet = df.getPlanetWithId(fromId);
  const from = df.getPlanetWithId(fromId);

  // Rejected if has pending outbound moves
  const unconfirmed = df.getUnconfirmedMoves().filter(move => move.from === fromId)
  if (unconfirmed.length !== 0) {
    return;
  }

  const candidates_ = df.getPlanetsInRange(fromId, maxDistributeEnergyPercent)
    .filter(p => (
      p.owner !== df.account &&
      p.owner === "0x0000000000000000000000000000000000000000" &&
      p.planetLevel >= minCaptureLevel
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

    const energyArriving = (candidate.energyCap * 0.15) + (candidate.energy * (candidate.defense / 100));
    // needs to be a whole number for the contract
    const energyNeeded = Math.ceil(df.getEnergyNeededForMove(fromId, candidate.locationId, energyArriving));
    if (energyLeft - energyNeeded < 0) {
      continue;
    }

    move(fromId, candidate.locationId, energyNeeded, 0);
    energySpent += energyNeeded;
    moves += 1;
  }

  return moves;
}

function getArrivalsForPlanet(planetId) {
  return df.getAllVoyages().filter(arrival => arrival.toPlanet === planetId);
}

//returns tuples of [planet,distance]
function distance(from, to) {
  let fromloc = from.location;
  let toloc = to.location;
  return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
}
