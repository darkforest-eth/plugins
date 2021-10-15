//
// Auto Upgrade Planet
// Move silver to selected planet then upgrade it automatically
//
// Written by goldenfiredo, @goldenfiredo

import {
  html,
  render,
  useState,
  useLayoutEffect,
} from 'https://unpkg.com/htm/preact/standalone.module.js';

import {
  canStatUpgrade,
  canPlanetUpgrade,
  getPlanetRank,
} from 'https://plugins.zkga.me/utils/utils.js';

import {
  PlanetType,
  UpgradeBranchName,
  SpaceType
} from "https://cdn.skypack.dev/@darkforest_eth/types"

const minSilverPercent = 95;
const minEnergyPercent = 95;
const minPlanetLevel = 3;

function planetShort(locationId) {
  return locationId.substring(0, 32) + '...';
}

function allowUpgrade(planet) {
  if (!planet) return false;
  if (planet.planetType !== PlanetType.PLANET) return false;
  if (planet.owner !== df.account) return false;
  return true;
}

function upgraded(planet) {
  return getPlanetRank(planet) >= getPlanetMaxRank(planet)
}

function distance(from, to) {
  let fromloc = from.location;
  let toloc = to.location;
  return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
}

function getPlanetMaxRank(planet) {
  if (!planet) return 0;
  if (planet.spaceType === SpaceType.NEBULA) return 3;
  if (planet.spaceType === SpaceType.SPACE) return 4;
  return 5;
}

function upgradeRequiredSilver(planet) {
  const maxRank = getPlanetMaxRank(planet);
  const silverPerRank = [];

  for (let i = 0; i < maxRank; i++) {
    silverPerRank[i] = Math.floor((i + 1) * 0.2 * planet.silverCap);
  }

  return silverPerRank[getPlanetRank(planet)];
}

function getPlanetArrivals(planetId) {
  return df.getAllVoyages()
    .filter(arrival => arrival.toPlanet === planetId)
    .filter(p => p.arrivalTime > Date.now() / 1000);
}

function isUpgrading(planet) {
  return df.getUnconfirmedUpgrades().filter(p => p.locationId === planet.locationId).length > 0;
}

function sendSilver(planet, rankSpan) {
  df.terminal.current.println("[Upgrade Planet] send silver", 2);
  
  let target = df.getPlanetWithId(planet.locationId);
  let rank = getPlanetRank(target);
  let maxRank = getPlanetMaxRank(target);
  if (rank < maxRank)
    rankSpan.innerHTML = 'rank: ' + getPlanetRank(target);
  else 
    rankSpan.innerHTML = 'rank: ' + getPlanetRank(target) + ', upgrade end';

  let requiredSilver = rank + 1 == maxRank ? upgradeRequiredSilver(target) : target.silverCap;
  let totalAmount = Math.min(target.silverCap - target.silver, requiredSilver - target.silver);
  if (totalAmount <= 0) {
    return;
  }

  if (upgraded(target)) {
    return;
  }

  if (isUpgrading(target)) {
    return;
  }

  const allArrivals = getPlanetArrivals(target.locationId);
  if (allArrivals.length + df.getUnconfirmedMoves().filter(move => move.to === target.locationId).length > 0) {
      return;
  }

  const candidates = df.getMyPlanets().filter(
    p => p.planetType === PlanetType.SILVER_MINE
      && p.planetLevel >= minPlanetLevel
      && (p.silver >= Math.floor(p.silverCap * minSilverPercent / 100) || p.silver >= totalAmount)
  );

  let sources = []
  for (let i = 0; i < candidates.length; i++) {
    let from = candidates[i];
    const t = df.getPlanetsInRange(from.locationId, minEnergyPercent).filter(
      p => p.locationId === target.locationId
    );
    
    if (t.length == 0) continue;
    
    sources.push(from);
  }

  const sorted = sources.map(
    source => [source, distance(source, target)]
  ).sort(
    (a, b) => a[1] - b[1]
  );

  let sentAmount = 0;
  
  for (let i = 0; i < sorted.length; ++i) {
    const source = sorted[i][0];
    const sourceId = source.locationId;

    const energyNeeded = Math.ceil(df.getEnergyNeededForMove(sourceId, target.locationId, 50));
    if (source.energy - energyNeeded < 0) {
        continue;
    }

    let silverAmount = Math.min(Math.floor(source.silver), Math.floor(totalAmount - sentAmount));

    df.terminal.current.println("[Upgrade Planet] move: " + sourceId + " -> " + target.locationId + " silver amount: " + silverAmount, 2);

    df.move(sourceId, target.locationId, energyNeeded, silverAmount);

    sentAmount += silverAmount;
    if (sentAmount >= totalAmount) break;
  }

}

function upgradePlanet(target) {
  let planet = df.getPlanetWithId(target.locationId);
  if (isUpgrading(planet)) {
    return;
  }

  if (planet && canPlanetUpgrade(planet)) {
    if (canStatUpgrade(planet, UpgradeBranchName.Defense)) {
      df.upgrade(planet.locationId, UpgradeBranchName.Defense)
    } else if (canStatUpgrade(planet, UpgradeBranchName.Range)) {
      df.upgrade(planet.locationId, UpgradeBranchName.Range)
    } else if (canStatUpgrade(planet, UpgradeBranchName.Speed)) {
      df.upgrade(planet.locationId, UpgradeBranchName.Speed)
    } else {

    }
  }
}

function App() {
  let wrapper = {
    display: 'flex',
    justifyContent: 'space-between',
  };
  
  let [target, setTarget] = useState(false);
  let [selectedPlanet, setSelectedPlanet] = useState(ui.getSelectedPlanet());
  useLayoutEffect(() => {
    const sub = ui.selectedPlanetId$.subscribe(() => {
        setSelectedPlanet(ui.getSelectedPlanet());
    });

    return sub.unsubscribe;
  }, []);
  
  function select() {
    setTarget(selectedPlanet);
  }

  function stop() {
    if (!running) return;
    
    if (sendIntervalId != '') {
      clearInterval(sendIntervalId);
      sendIntervalId = '';
    }

    if (upgradeIntervalId != '') {
      clearInterval(upgradeIntervalId);
      upgradeIntervalId = '';
    }

    running = false;
    selectBtn.disabled = false;
    selectBtn.style = 'opacity: 1';
    startBtn.disabled = false;
    startBtn.style = 'opacity: 1';
    rankSpan.innerHTML = '';
  }

  function start() {
    if (running) return;
  
    running = true;
    selectBtn.disabled = true;
    selectBtn.style = 'opacity: 0.5';
    startBtn.disabled = true;
    startBtn.style = 'opacity: 0.5';

    if (sendIntervalId != '') {
      clearInterval(sendIntervalId);
    }
    sendIntervalId = setInterval(sendSilver, 2 * 60 * 1000, target, rankSpan);
    sendSilver(target, rankSpan);

    if (upgradeIntervalId != '') {
      clearInterval(upgradeIntervalId);
    }
    upgradeIntervalId = setInterval(upgradePlanet, 0.5 * 60 * 1000, target);
    upgradePlanet(target);
  }

  function locate() {
    ui.centerLocationId(target.locationId);
  }

  return html`
    <div>
      <div style=${wrapper}>
        <button id=selectBtn onClick=${select}>Select a planet to upgrade</button>
      </div>
      ${allowUpgrade(target) ? html`
        <br /><span style=${{ marginLeft: '5px' }}>${planetShort(target.locationId)}   </span>
        <button onClick=${locate}>locate</button>
        <br /><span style=${{ marginLeft: '5px' }} id=rankSpan></span>`
         : html`<br /><span style=${{ marginLeft: '5px' }}>No planet selected or selected planet cannot be upgraded</span>`
      }
      <br />
      <br />
      <hr />
      <br />
      <div style=${wrapper}>
        ${allowUpgrade(target) && !upgraded(target) ? html`<button style=${{opacity: 1}} id=startBtn onClick=${start}>Start</button>`
          : html`<button style=${{opacity: 0.5}} disabled id=startBtn>Start</button>`
        }
        <button onClick=${stop}>Stop</button>
      </div>
    </div>
  `;
}

let running = false;
let sendIntervalId = '';
let upgradeIntervalId = '';

class Plugin {
  constructor() {
    this.container = null;
  }

  async render(container) {
    container.parentElement.style.minHeight = 'unset';
    container.style.width = '380px';
    container.style.minHeight = 'unset';

    this.container = container;
    
    render(html`<${App} />`, container);
  }

  destroy() {
    if (sendIntervalId != '') {
      clearInterval(sendIntervalId);
      sendIntervalId = '';
    }

    if (upgradeIntervalId != '') {
      clearInterval(upgradeIntervalId);
      upgradeIntervalId = '';
    }

    running = false;

    render(null, this.container);
  }
}

export default Plugin;