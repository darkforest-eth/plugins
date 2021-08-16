// Auto Crawl Planets
//
// 1.basically this plugin will auto crawl plants around, but it will calculate the priority first, high level plant has more priority, and if the plugin cant get the high priority 
// plant, then it will choose a plant nearby and towards the high priority plant, you can change the priority calculate function.
// 2.the plugin allow multi crawl if you check the multi crawl button, which means the plugin will send energy to the plant even cant grap plant in a single transfer
// 3.in darkforest Round3, this plugin will crawl plants towards the center, which means plants near center has much higher priority.
const {
  isMine,
  isUnowned,
  canHaveArtifact,
} = await import('https://plugins.zkga.me/utils/utils.js');

import { EMPTY_ADDRESS } from "https://cdn.skypack.dev/@darkforest_eth/constants";
import {
  PlanetType,
  PlanetTypeNames,
  PlanetLevel,
  PlanetLevelNames,
} from "https://cdn.skypack.dev/@darkforest_eth/types";


const planetTypes = {
  'Planet': 0,
  'Asteroid': 1,
  'Foundry': 2,
  'Spacetime_Rip': 3,
  'Quasar': 4,
};

const planetLevels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const players = [
  EMPTY_ADDRESS
];

const typeNames = Object.keys(planetTypes);

const checkTypes = [];

let poi = [];
class Plugin {
  constructor() {
    this.planetType = PlanetType.SILVER_MINE;
    this.minimumEnergyAllowed = 15;
    this.minPlanetLevel = 3;
    this.maxEnergyPercent = 85;

    this.minPlantLevelToUse = 2;
    this.maxPlantLevelToUse = 5;
    this.autoSeconds = 30;
    this.message = document.createElement('div');
    this.allowMultiCrawl = false;

  }
  render(container) {
    container.style.width = '300px';

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

    let autoSecondsLabel = document.createElement('label');
    autoSecondsLabel.innerText = 'Every X seconds';
    autoSecondsLabel.style.display = 'block';

    let autoSecondsStepper = document.createElement('input');
    autoSecondsStepper.type = 'range';
    autoSecondsStepper.min = '30';
    autoSecondsStepper.max = '6000';
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

    // minimum plant level used to capture new plant
    let levelLabelMinUse = document.createElement('label');
    levelLabelMinUse.innerText = 'Min. level to Use';
    levelLabelMinUse.style.display = 'block';

    let levelMinUse = document.createElement('select');
    levelMinUse.style.background = 'rgb(8,8,8)';
    levelMinUse.style.width = '100%';
    levelMinUse.style.marginTop = '10px';
    levelMinUse.style.marginBottom = '10px';
    planetLevels.forEach(lvl => {
      let opt = document.createElement('option');
      opt.value = `${lvl}`;
      opt.innerText = `Level ${lvl}`;
      levelMinUse.appendChild(opt);
    });
    levelMinUse.value = `${this.minPlantLevelToUse}`;

    levelMinUse.onchange = (evt) => {
      try {
        this.minPlantLevelToUse = parseInt(evt.target.value, 10);
      } catch (e) {
        console.error('could not parse planet level', e);
      }
    }

    // maxmum plant level used to capture new plant
    let levelLabelMaxUse = document.createElement('label');
    levelLabelMaxUse.innerText = 'Max. level to Use';
    levelLabelMaxUse.style.display = 'block';

    let levelMaxUse = document.createElement('select');
    levelMaxUse.style.background = 'rgb(8,8,8)';
    levelMaxUse.style.width = '100%';
    levelMaxUse.style.marginTop = '10px';
    levelMaxUse.style.marginBottom = '10px';
    planetLevels.forEach(lvl => {
      let opt = document.createElement('option');
      opt.value = `${lvl}`;
      opt.innerText = `Level ${lvl}`;
      levelMaxUse.appendChild(opt);
    });
    levelMaxUse.value = `${this.maxPlantLevelToUse}`;

    levelMaxUse.onchange = (evt) => {
      try {
        this.maxPlantLevelToUse = parseInt(evt.target.value, 10);
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
      } else {
        // delete from arr
        let i = checkTypes.indexOf(planetCheck.value);
        checkTypes.splice(i, 1);
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
      } else {
        let i = checkTypes.indexOf(asteroidCheck.value);
        checkTypes.splice(i, 1);
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
      } else {
        let i = checkTypes.indexOf(foundryCheck.value);
        checkTypes.splice(i, 1);
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
      } else {
        let i = checkTypes.indexOf(spaceRipCheck.value);
        checkTypes.splice(i, 1);
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
      } else {
        let i = checkTypes.indexOf(quasarCheck.value);
        checkTypes.splice(i, 1);
      }
      console.log(checkTypes);
    };



    let message = document.createElement('div');

    let button = document.createElement('button');
    button.style.width = '100%';
    button.style.marginTop = '10px';
    button.style.marginBottom = '10px';
    button.innerHTML = 'Crawl Plant!'
    button.onclick = () => {
      calculatePoi(this.minPlanetLevel, checkTypes);
      crawlPlantForPoi(this.minPlanetLevel, this.maxEnergyPercent, this.minPlantLevelToUse, this.maxPlantLevelToUse, this.minimumEnergyAllowed, this.allowMultiCrawl);
    }

    let autoCrwalLabel = document.createElement('label');
    autoCrwalLabel.innerHTML = 'Automatic CrawlPlant';
    autoCrwalLabel.style.paddingRight = "10px";

    let autoCrawlPlantCheck = document.createElement('input');
    autoCrawlPlantCheck.type = "checkbox";
    autoCrawlPlantCheck.style.marginRight = "10px";
    autoCrawlPlantCheck.checked = false;
    autoCrawlPlantCheck.onchange = (evt) => {
      if (evt.target.checked) {
        this.sendTimer = setInterval(() => {
          this.message.innerText = 'Auto CrawlPlant...';

          setTimeout(() => {
            calculatePoi(this.minPlanetLevel, checkTypes);
            crawlPlantForPoi(this.minPlanetLevel, this.maxEnergyPercent, this.minPlantLevelToUse, this.maxPlantLevelToUse, this.minimumEnergyAllowed, this.allowMultiCrawl);
          }, 0);
        }, 1000 * this.autoSeconds)
      } else {
        this.message.innerText = 'CrawlPlant by Hand';
        this.clearSendTimer();
      }
    };

    let allowMultiCrawlLabel = document.createElement('label');
    allowMultiCrawlLabel.innerHTML = 'Allow Multi Crawl _______';
    allowMultiCrawlLabel.style.paddingRight = "10px";

    let allowMultiCrawlPlantCheck = document.createElement('input');
    allowMultiCrawlPlantCheck.type = "checkbox";
    allowMultiCrawlPlantCheck.style.marginRight = "10px";
    allowMultiCrawlPlantCheck.checked = false;
    allowMultiCrawlPlantCheck.onchange = (evt) => {
      if (evt.target.checked) {
        this.allowMultiCrawl = true;
      } else {
        this.allowMultiCrawl = false;
      }
    };

    container.appendChild(stepperLabel);
    container.appendChild(stepper);
    container.appendChild(percent);
    container.appendChild(minimumEnergyAllowedLabel);
    container.appendChild(minimumEnergyAllowedSelect);
    container.appendChild(percentminimumEnergyAllowed);

    // Moves
    container.appendChild(autoSecondsLabel);
    container.appendChild(autoSecondsStepper);
    container.appendChild(autoSecondsInfo);

    container.appendChild(levelLabel);
    container.appendChild(level);
    container.appendChild(levelLabelMinUse);
    container.appendChild(levelMinUse);
    container.appendChild(levelLabelMaxUse);
    container.appendChild(levelMaxUse);

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

    //allowMultiCrawl
    container.appendChild(allowMultiCrawlLabel);
    container.appendChild(allowMultiCrawlPlantCheck);

    // Auto Crwal Plant
    container.appendChild(autoCrwalLabel);
    container.appendChild(autoCrawlPlantCheck);
    container.appendChild(this.message);
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

function getArrivalsForPlanet(planetId) {
  return df.getAllVoyages().filter(arrival => arrival.toPlanet === planetId).filter(p => p.arrivalTime > Date.now() / 1000);
}

//returns tuples of [planet,distance]
function distance(from, to) {
  let fromloc = from.location;
  let toloc = to.location;
  return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
}

function calculatePoi(minCaptureLevel, checkTypes) {
  debugger;
  checkTypes = JSON.parse('[' + String(checkTypes) + ']')

  const candidatesOri = df.getPlanetMap();
  let candidates = [];
  let keys = candidatesOri.keys()
  for (let key of keys) {
    candidates.push(candidatesOri.get(key));
  }


  poi = candidates.filter(p => (
    p.owner !== df.account &&
    players.includes(p.owner) &&
    p.planetLevel >= minCaptureLevel &&
    checkTypes.includes(p.planetType)
  ))
    .map(to => {
      return [to, priorityCalculate(to)]
    })
    .sort((a, b) => a[1] - b[1]);
  console.log("poi");
}

function priorityCalculate(planetObject) {
  let priority = 0;
  priority = Math.sqrt((planetObject.location.coords.x - 0) ** 2 + (planetObject.location.coords.y - 0) ** 2);

  return priority;

}

function priorityinlevelCalculate(planetObject) {
  let priority = 0;
  switch (planetObject.planetType) {
    //fountry
    case 2:
      priority = planetObject.planetLevel * 3;
      break;
    //Asteroid
    case 1:
      priority = planetObject.planetLevel * 2.1;
      break;
    //spacetimerip
    case 3:
      priority = planetObject.planetLevel * 2;
      break;
    //plant
    case 0:
      priority = planetObject.planetLevel * 1.5;
      break;
    //Quasar
    case 4:
      priority = 0;
      break;
    default:
      break;
  }

  //priority = Math.sqrt((planetObject.coords.x - 0) ** 2 + (planetObject.coords.y - 0) ** 2);
  
  return priority;

}



function crawlPlantForPoi(minPlanetLevel, maxEnergyPercent, minPlantLevelToUse, maxPlantLevelToUse, minimumEnergyAllowed, allowMultiCrawl) {
  debugger;
  //for each plant in poi
  for (let poiPlant in poi) {
    let candidates_Ori;
    try {
      candidates_Ori = df.getPlanetsInRange(poi[poiPlant][0].locationId, 95);
    } catch (error) {
      continue;
    }

    let candidates;
    candidates = candidates_Ori.filter(p => (
      p.owner === df.account &&
      p.planetLevel >= minPlantLevelToUse &&
      p.planetLevel <= maxPlantLevelToUse &&
      !canHaveArtifact(p)
    )).sort((a, b) => distance(poi[poiPlant][0], a) - distance(poi[poiPlant][0], b));

    for (let candidatePlant in candidates) {

      crawlPlantMy(minPlanetLevel, maxEnergyPercent, poi[poiPlant][0], candidates[candidatePlant], checkTypes, minimumEnergyAllowed, allowMultiCrawl);

    }
  }

}

function crawlPlantMy(minPlanetLevel, maxEnergyPercent, poiPlant, candidatePlant, checkTypes, minimumEnergyAllowed = 0, allowMultiCrawl = false) {
  checkTypes = JSON.parse('[' + String(checkTypes) + ']')

  let candidateCapturePlants;
  try {
    candidateCapturePlants = df.getPlanetsInRange(candidatePlant.locationId, maxEnergyPercent)
      .filter(p => (p.planetLevel >= minPlanetLevel &&
        p.owner !== df.account &&
        players.includes(p.owner) &&
        checkTypes.includes(p.planetType)
      ));
  } catch (error) {
    return;
  }

  let comboMap = candidateCapturePlants.map(p => {
    return [p, priorityinlevelCalculate(p) + distance(poiPlant, candidatePlant) / distance(poiPlant, p)]
  }).sort((a, b) => b[1] - a[1]);




  const planet = candidatePlant;
  const from = candidatePlant;

  const silverBudget = Math.floor(from.silver);

  // Rejected if has pending outbound moves
  const energyUncomfired = df.getUnconfirmedMoves().filter(move => move.from === from.locationId)
  let energyUncomfiredOnTheWay = 0;
  for (let moves in energyUncomfired) {
    energyUncomfiredOnTheWay = energyUncomfiredOnTheWay+ energyUncomfired[moves].forces;
  }
  if (energyUncomfired.length > 4 || (candidatePlant.energy - energyUncomfiredOnTheWay) <= candidatePlant.energyCap *  (1 - maxEnergyPercent) * 0.01) {
    return 0;
  }



  let i = 0;
  const energyBudget = Math.floor((maxEnergyPercent / 100) * planet.energy);

  let energySpent = 0;
  let moves = 0;
  let silverNeed = 0;
  let silverSpent = 0;
  while (energyBudget - energySpent > 0 && i < comboMap.length) {

    const energyLeft = energyBudget - energySpent;
    const silverLeft = silverBudget - silverSpent;

    // Remember its a tuple of candidates and their distance
    const candidate = comboMap[i++][0];

    // Rejected if has unconfirmed pending arrivals
    const unconfirmed = df.getUnconfirmedMoves().filter(move => move.to === candidate.locationId)
    let energyUncomfired = 0;
    for (let moves in unconfirmed) {
      energyUncomfired = energyUncomfired + unconfirmed[moves].forces;
    }
    if (unconfirmed.length > 4 || energyUncomfired >= candidate.energy * (candidate.defense / 100)) {
      continue;
    }

    // Rejected if has pending arrivals
    const arrivals = getArrivalsForPlanet(candidate.locationId);
    let energyOntheWay = 0;
    for (let moves in arrivals) {
      energyOntheWay = energyOntheWay + arrivals[moves].energyArriving;
    }
    if (arrivals.length + unconfirmed.length > 4 || energyOntheWay + energyUncomfired >= candidate.energy * (candidate.defense / 100)) {
      continue;
    }

    const energyUncomfiredfrom = df.getUnconfirmedMoves().filter(move => move.from === from.locationId);
    let energyUncomfiredOnTheWay = 0;
    for (let moves in energyUncomfiredfrom) {
      energyUncomfiredOnTheWay = energyUncomfiredOnTheWay+ energyUncomfiredfrom[moves].forces;
    }

    if (energyUncomfiredfrom.length + df.getAllVoyages().filter(arrival => arrival.fromPlanet === from.locationId).length  > 4 || (candidatePlant.energy - energyUncomfiredOnTheWay) <= candidatePlant.energyCap *  (1 - maxEnergyPercent) * 0.01) {
      continue;
    }
    
    if (minimumEnergyAllowed === 0) minimumEnergyAllowed = 1
    else
      minimumEnergyAllowed = candidate.energyCap * minimumEnergyAllowed / 100
    const energyArriving = minimumEnergyAllowed + (candidate.energy * (candidate.defense / 100));
    // needs to be a whole number for the contract
    let energyNeeded = Math.ceil(df.getEnergyNeededForMove(candidatePlant.locationId, candidate.locationId, energyArriving));
    let multiCrawlEnergyNeeded = Math.ceil(df.getEnergyNeededForMove(candidatePlant.locationId, candidate.locationId, energyArriving*0.35));
    if (energyLeft - energyNeeded-energyUncomfiredOnTheWay < candidatePlant.energyCap * (100 - maxEnergyPercent) * 0.01) {

      if (allowMultiCrawl === true) {
        if (energyLeft-multiCrawlEnergyNeeded-energyUncomfiredOnTheWay < candidatePlant.energyCap * (100 - maxEnergyPercent) * 0.01)
          continue;
        else {

          // if (df.getAllVoyages().filter(arrival => arrival.fromPlanet === from.locationId).length  > 1)
          //    continue;
          energyNeeded = multiCrawlEnergyNeeded;
        }
      }
      else
        continue;
    }


    if (from.planetType === 1 && candidate.planetType === 0) {
      silverNeed = candidate.silverCap > silverLeft ? silverLeft : candidate.silverCap;
      silverSpent += silverNeed;
    }

    df.move(candidatePlant.locationId, candidate.locationId, energyNeeded, 0);

    energySpent += energyNeeded;
    moves += 1;
  }
  return moves;
}