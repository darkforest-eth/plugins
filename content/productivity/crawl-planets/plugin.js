// Crawl Planets
//
// Capture unowned planets around you!

const planetTypes = {
  'Planet': 0,
  'Asteroid': 1,
  'Foundry': 2,
  'Spacetime_Rip': 3,
  'Quasar': 4,
};

const planetLevels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const players = [
  "0x0000000000000000000000000000000000000000",
];

const typeNames = Object.keys(planetTypes);

const checkTypes = [];

class Plugin {
  constructor() {
    this.planetType = 1;
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
    levelLabel.innerText = 'Min. level to capture';
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
    level.value = `${this.minPlanetLevel}`;

    level.onchange = (evt) => {
      try {
        this.minPlanetLevel = parseInt(evt.target.value, 10);
      } catch (e) {
        console.error('could not parse planet level', e);
      }
    }


    let planetTypeLabel = document.createElement('label');
    planetTypeLabel.innerText = 'Select planetType: ';
    planetTypeLabel.style.display = 'block';
    planetTypeLabel.style.paddingBottom = "6px";
    
    // planet checkbox
    let planetLabel = document.createElement('label');
    planetLabel.innerHTML = 'Planet';
    planetLabel.style.paddingRight = "10px";

    let planetCheck = document.createElement('input');
    planetCheck.type = "checkbox";
    planetCheck.value = planetTypes.Planet;
    planetCheck.style.marginRight = "10px";
    planetCheck.checked = false;
    planetCheck.onchange = (evt) => {
      if (evt.target.checked) {
        // add to arr
        checkTypes.push(planetCheck.value);
      }else{
        // delete from arr
        let i = checkTypes.indexOf(planetCheck.value);
        checkTypes.splice(i,1);
      }
    };

    // asteroid checkbox
    let asteroidLabel = document.createElement('label');
    asteroidLabel.innerHTML = 'Asteroid';
    asteroidLabel.style.paddingRight = "10px";

    let asteroidCheck = document.createElement('input');
    asteroidCheck.type = "checkbox";
    asteroidCheck.value = planetTypes.Asteroid;
    asteroidCheck.style.marginRight = "10px";
    asteroidCheck.checked = false;
    asteroidCheck.onchange = (evt) => {
      if (evt.target.checked) {
        checkTypes.push(asteroidCheck.value);
      }else{
        let i = checkTypes.indexOf(asteroidCheck.value);
        checkTypes.splice(i,1);
      }
    };

    // Foundry checkbox
    let foundryLabel = document.createElement('label');
    foundryLabel.innerHTML = 'Foundry';
    foundryLabel.style.paddingRight = "10px";

    let foundryCheck = document.createElement('input');
    foundryCheck.type = "checkbox";
    foundryCheck.value = planetTypes.Foundry;
    foundryCheck.style.marginRight = "10px";
    foundryCheck.checked = false;
    foundryCheck.onchange = (evt) => {
      if (evt.target.checked) {
        checkTypes.push(foundryCheck.value);
      }else{
        let i = checkTypes.indexOf(foundryCheck.value);
        checkTypes.splice(i,1);
      }
      console.log(checkTypes);
    };

    // Spacetime Rip checkbox
    let spaceRipLabel = document.createElement('label');
    spaceRipLabel.innerHTML = 'Spacetime Rip';
    spaceRipLabel.style.paddingRight = "10px";

    let spaceRipCheck = document.createElement('input');
    spaceRipCheck.type = "checkbox";
    spaceRipCheck.value = planetTypes.Spacetime_Rip;
    spaceRipCheck.style.marginRight = "10px";
    spaceRipCheck.checked = false;
    spaceRipCheck.onchange = (evt) => {
      if (evt.target.checked) {
        checkTypes.push(spaceRipCheck.value);
      }else{
        let i = checkTypes.indexOf(spaceRipCheck.value);
        checkTypes.splice(i,1);
      }
      console.log(checkTypes);
    };

    // Quasar checkbox
    let quasarLabel = document.createElement('label');
    quasarLabel.innerHTML = 'Quasar';
    quasarLabel.style.paddingRight = "10px";

    let quasarCheck = document.createElement('input');
    quasarCheck.type = "checkbox";
    quasarCheck.value = planetTypes.Quasar;
    quasarCheck.style.marginRight = "10px";
    quasarCheck.checked = false;
    quasarCheck.onchange = (evt) => {
      if (evt.target.checked) {
        checkTypes.push(quasarCheck.value);
      }else{
        let i = checkTypes.indexOf(quasarCheck.value);
        checkTypes.splice(i,1);
      }
      console.log(checkTypes);
    };



    let message = document.createElement('div');

    let button = document.createElement('button');
    button.style.width = '100%';
    button.style.marginTop = '10px';
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
          checkTypes,
        );
        message.innerText = `Crawling ${moves} ${typeNames[this.planetType]}s.`;
      } else {
        message.innerText = 'No planet selected.';
      }
    }

    container.appendChild(stepperLabel);
    container.appendChild(stepper);
    container.appendChild(percent);
    container.appendChild(levelLabel);
    container.appendChild(level);
    container.appendChild(planetTypeLabel);

    // planet checkbox
    container.appendChild(planetLabel);
    container.appendChild(planetCheck);

    // asteroid checkbox
    container.appendChild(asteroidLabel);
    container.appendChild(asteroidCheck);

    // foundry checkbox
    container.appendChild(foundryLabel);
    container.appendChild(foundryCheck);

    // spacetime checkbox
    container.appendChild(spaceRipLabel);
    container.appendChild(spaceRipCheck);

    // quasar checkbox
    container.appendChild(quasarLabel);
    container.appendChild(quasarCheck);

    container.appendChild(button);
    container.appendChild(message);
  }
}

export default Plugin;


function capturePlanets(fromId, minCaptureLevel, maxDistributeEnergyPercent, checkTypes) {

  checkTypes = JSON.parse('[' + String(checkTypes) + ']')

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
      checkTypes.includes(p.planetType)
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
