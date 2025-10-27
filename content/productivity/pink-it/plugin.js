/*
  made for DF Archon Ares v0.1 Round 2
  https://mirror.xyz/dfarchon.eth/hns4_mHAdUvPVDLrnCVxxlg1MrxpQMDgPTHsBgLXhRw
  
  features:
  - can automatically destroy all planets inside the pink circle (using dropped bomb from the pink ship)
  - shows a list of all pink circles in view and their owners/operators
  - click any planet to see how big a pink circle would be if a bomb were dropped on it
*/

import { getPlayerColor } from 'https://cdn.skypack.dev/@dfares/procedural';

const pluginName = 'Pink It';

const simulate = false; // for testing purposes this can be set to true (if true it wont destroy planets)

const cSpace = '&nbsp;';
const minCircleSizePx = 5;
const minDrawPlanetRadius = 20;
const circleThickness = 2;
const PI2 = Math.PI * 2;

const pinkCircleRadius = 2000;
const minPinkLevel = 3; // cant pink level below 3

let choosenPlanets = [];
let deadPlanets = [];
let dieingPlanet = null;
let stopPinkIt = false;
let excludeMyPlanets = true;
let excludeOwnedPlanets = false;
let pinkItIsRunning = false;
let butPinkIt = null;
let butPinkItIsReady = false;
let myPinkZone = null;
let hlPinkZoneCounter = 0;
const hlPinkZoneCounterMax = 200;
let lastSelectedPlanet = null;
let tablePinkZoneList = null;
let intervUpdateTablePZList = null;
const lastWorldCoords = {
  x: Number.MAX_SAFE_INTEGER,
  y: Number.MAX_SAFE_INTEGER,
};
let pzHoveringInList = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function planetHasNoOwner(planet) {
  return planet.owner === '0x0000000000000000000000000000000000000000';
}

function planetIsMine(planet) {
  return planet.owner === df.account;
}

function createToggleButton(text, onClick, onOrOff = false) {
  const button = {};
  button.element = document.createElement('button');
  button.element.innerText = text;
  button.onOrOff = false;
  button.set = function (b) {
    button.onOrOff = b;
    if (button.onOrOff) {
      // on
      button.element.style.background = '#CCC';
      button.element.style.color = '#000000';
    } else {
      // off
      button.element.style.background = '#333333';
      button.element.style.color = '#FFF';
    }
  };
  button.set(onOrOff);
  button.element.addEventListener('click', () => {
    button.set(!button.onOrOff);
    onClick(button.onOrOff);
  });
  return button;
}

function FullButtonLine(buttons) {
  const table = document.createElement('table');
  table.style.textAlign = 'center';
  table.style.width = '100%';
  table.style.tableLayout = 'fixed'; // to make all buttons the same width

  let first = true;
  for (const button of buttons) {
    const td = document.createElement('td');
    const ele = button.element ? button.element : button;
    ele.style.border = '1px solid white';
    ele.style.width = '100%';
    td.style.width = '100%'; // to make all buttons the same width
    td.style.padding = '5px';
    if (!first) {
      td.style.paddingLeft = '0px';
    }
    td.append(ele);
    table.append(td);

    first = false;
  }

  return table;
}

function createTableHeader(table, strArr) {
  const tr = document.createElement('tr');
  for (const str of strArr) {
    const th = document.createElement('th');
    th.innerText = str;
    th.style.border = '1px solid white';
    tr.appendChild(th);
  }

  table.appendChild(tr);
}

function addAsTd(tr, text, width = null, color = null, center = true) {
  const td = document.createElement('td');
  td.style.border = '1px solid white';
  td.innerHTML = text;
  if (width) td.width = `${width}px`;
  if (color) td.style.color = color;
  if (center) td.style['text-align'] = 'center';
  tr.appendChild(td);

  return td;
}

function intToStrHexColor(num) {
  return num.toString(16).toUpperCase().padStart(2, 0);
}

function percentToStrHexColor(percent) {
  return intToStrHexColor(parseInt(percent * 255));
}

function getPlanetRingRadius(
  planet,
  multiplier = 1.3,
  min = minDrawPlanetRadius,
) {
  const viewport = ui.getViewport();
  const radius =
    viewport.worldToCanvasDist(ui.getRadiusOfPlanetLevel(planet.planetLevel)) *
    multiplier;

  return radius < min ? min : radius;
}

function drawRingAnimationOnPlanet(ctx, planet, level, color, reverse = false) {
  const viewport = ui.getViewport();
  const { x: planetX, y: planetY } = viewport.worldToCanvasCoords(
    planet.location.coords,
  );

  const radius = getPlanetRingRadius(planet);
  const animationDuration = 1500 * (1 - level * 0.1);

  let millis = Date.now();
  for (let i = 0; i <= level; ++i) {
    drawRingAnimation(
      ctx,
      planetX,
      planetY,
      radius,
      millis,
      animationDuration,
      color,
      reverse,
    );
    millis += animationDuration / (level + 1);
  }
}

function drawRingAnimation(
  ctx,
  x,
  y,
  radius,
  millis,
  animationDuration,
  color,
  reverse = false,
) {
  let time = (millis % animationDuration) / animationDuration;
  if (reverse) time = 1 - time;
  const thickness = 1 - time * 0.2;
  let opacity = 1 - time;
  if (opacity > 0.6) opacity *= 1 - (opacity - 0.6) / 0.4;
  opacity = percentToStrHexColor(opacity);
  radius += radius * time * 1.1;
  drawRing2(ctx, x, y, radius, thickness, color + opacity);
}

function drawRing2(ctx, x, y, radius, thickness = 0.8, color) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.arc(x, y, radius, 0, PI2, false);
  ctx.arc(x, y, radius * thickness, 0, PI2, true);
  ctx.fill();
}

function drawPinkZone(ctx, coords, color = '#FFF') {
  const viewport = ui.getViewport();
  const { x, y } = viewport.worldToCanvasCoords(coords);
  const radius = viewport.worldToCanvasDist(pinkCircleRadius);
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(x, y, radius, 0, PI2, false);
  ctx.fill();
}

function drawHlPinkZone(ctx) {
  if (hlPinkZoneCounter <= 0) return;
  const selectedPlanet = ui.getSelectedPlanet();
  if (!selectedPlanet) return;

  const alpha = (hlPinkZoneCounter / hlPinkZoneCounterMax) * 0.4;
  const color = `hsla(0, 100%, 40%, ${alpha})`;
  drawPinkZone(ctx, selectedPlanet.location.coords, color);
  hlPinkZoneCounter--;
}

function drawListHoveringPZ(ctx) {
  if (!pzHoveringInList) return;

  const color = 'hsla(300, 100%, 40%, 0.7)';
  drawPinkZone(ctx, pzHoveringInList.coords, color);
}

function drawButPinkItAnimation() {
  if (!butPinkIt) return;
  if (!butPinkItIsReady) return;
  const hueStart = 0; // orange-red
  const hueEnd = 55; // yellow
  const animationSpeed = 500;
  const t = (Date.now() % animationSpeed) / animationSpeed;
  const hue = hueStart + (hueEnd - hueStart) * t;
  const color = `hsl(${hue}, 100%, 40%)`;
  butPinkIt.style.backgroundColor = color;
  butPinkIt.style.color = '#000';
}

function getDistBetweenPlanets(planetA, planetB) {
  return df.getDistCoords(planetA.location.coords, planetB.location.coords);
}

function pinkZoneIsInView(pinkZone) {
  const viewPort = ui.getViewport();
  if (viewPort.getBottomBound() > pinkZone.coords.y + pinkCircleRadius)
    return false;
  if (viewPort.getTopBound() < pinkZone.coords.y - pinkCircleRadius)
    return false;
  if (viewPort.getLeftBound() > pinkZone.coords.x + pinkCircleRadius)
    return false;
  if (viewPort.getRightBound() < pinkZone.coords.x - pinkCircleRadius)
    return false;
  return true;
}

// returns null of we dont have a pink zone at selected planet
function getMyPinkZoneAtSelectedPlanet() {
  const selectedPlanet = ui.getSelectedPlanet();
  if (!selectedPlanet) return null;
  myPinkZone = null;
  for (let pz of df.getMyPinkZones()) {
    if (pz.locationId === selectedPlanet.locationId) {
      myPinkZone = pz;
      break;
    }
  }

  return myPinkZone;
}

function setChoosenPlanets() {
  if (pinkItIsRunning) return;
  const selectedPlanet = ui.getSelectedPlanet();
  choosenPlanets = [];
  deadPlanets = [];
  setPinkItButton();
  if (!selectedPlanet) return;
  let planets = df.getAllPlanets();
  for (let p of planets) {
    if (!p.location) continue;
    if (p.planetLevel < minPinkLevel) continue;
    if (excludeOwnedPlanets && !planetHasNoOwner(p)) continue;
    if (excludeMyPlanets && planetIsMine(p)) continue;
    if (getDistBetweenPlanets(selectedPlanet, p) > pinkCircleRadius) continue;
    if (p.destroyed) deadPlanets.push(p);
    else choosenPlanets.push(p);
  }
  setPinkItButton();
}

async function pinkIt() {
  if (pinkItIsRunning) return;
  pinkItIsRunning = true;
  await sleep(2000); // give the user 2 seconds to abort before starting to destroy planets
  if (!stopPinkIt) await go();
  async function go() {
    for (let p of choosenPlanets) {
      if (stopPinkIt) break;
      if (p.destroyed) continue;
      dieingPlanet = p;
      try {
        console.log(`df.pinkLocation('${p.locationId}')`);
        if (!simulate) await df.pinkLocation(p.locationId);
      } catch (err) {
        console.error(err);
      }

      if (simulate) {
        await sleep(3000);
      } else {
        // we have to wait for planet being destroyed otherwise next df.pinkLocation will fail
        for (let i = 0; i < 30; ++i) {
          if (p.destroyed) break;
          await sleep(500);
          if (stopPinkIt) break;
        }
      }
      deadPlanets.push(p);
    }
  }
  dieingPlanet = null;
  pinkItIsRunning = false;
  stopPinkIt = false;
  setChoosenPlanets();
}

function setExcludeOwnedPlanets(onOrOff) {
  setChoosenPlanets();
  excludeOwnedPlanets = onOrOff;
}

function setExcludeMyPlanets(onOrOff) {
  setChoosenPlanets();
  excludeMyPlanets = onOrOff;
}

function onMouseClick() {
  myPinkZone = getMyPinkZoneAtSelectedPlanet();
  if (lastSelectedPlanet !== ui.getSelectedPlanet()) {
    hlPinkZoneCounter = hlPinkZoneCounterMax;
    setTablePinkZoneList();
  }
  setChoosenPlanets();
  lastSelectedPlanet = ui.getSelectedPlanet();
}

function setPinkItButton() {
  if (!butPinkIt) return;
  butPinkIt.style.color = '#FFF';
  butPinkIt.style.backgroundColor = '#000';
  butPinkItIsReady = false;
  if (!myPinkZone) {
    butPinkIt.innerHTML = '<b>please select one of your pink zones</b>';
  } else if (choosenPlanets.length === 0) {
    butPinkIt.innerHTML = '<b>no destroyable planets found</b>';
  } else if (pinkItIsRunning) {
    if (stopPinkIt) butPinkIt.innerHTML = '<b>stopping ...</b>';
    else butPinkIt.innerHTML = '<b>STOP destroying planets</b>';
  } else {
    butPinkIt.innerHTML =
      `<b>start DESTROYING ${choosenPlanets.length} planets</b>`;
    butPinkItIsReady = true;
  }
}

function onButPinkItClick() {
  if (!pinkItIsRunning) {
    if (!ui.getSelectedPlanet()) {
      console.error('first you have to select a planet');
      return;
    }
    if (!myPinkZone) return;
    if (choosenPlanets.length === 0) return;
    pinkIt();
    setPinkItButton();
  } else {
    stopPinkIt = true;
    setPinkItButton();
  }
}

function getPinkZonesInView() {
  return Array.from(df.getPinkZones()).filter(pinkZoneIsInView);
}

const planetType = {};
planetType.PLANET = 0;
planetType.ASTEROID = 1;
planetType.FOUNDRY = 2;
planetType.SPACETIME = 3;
planetType.QUASAR = 4;

function getPlanetTypeName(planet) {
  for (const type in planetType) {
    if (planet.planetType === planetType[type]) {
      return type;
    }
  }

  throw new Error(
    `cannot find planet type name for type ${planet.planetType}`,
  );
}

function getPlanetDesc(planet) {
  if (typeof planet === 'string') {
    planet = df.getPlanetWithId(planet);
  }

  return `LvL. ${planet.planetLevel} ${getPlanetTypeName(planet)}`;
}

function setTablePinkZoneList() {
  if (!tablePinkZoneList) return;
  tablePinkZoneList.innerHTML = '';

  const pinkZones = getPinkZonesInView();
  if (pinkZones.length === 0) {
    return;
  }

  createTableHeader(tablePinkZoneList, ['twitter', 'address', 'planet']);
  for (const pz of pinkZones) {
    const tr = document.createElement('tr');
    const operatorAddress = pz.operator;
    const player = df.getPlayer(operatorAddress);
    const playerColor = getPlayerColor(operatorAddress);

    addAsTd(tr, player.twitter ? player.twitter : '', null, playerColor);
    addAsTd(tr, operatorAddress.substr(0, 8), null, playerColor);
    addAsTd(tr, getPlanetDesc(pz.locationId));

    tr.style.cursor = 'pointer';
    tr.style.backgroundColor = '#000';
    let selectedPlanet = ui.getSelectedPlanet();
    if (selectedPlanet && selectedPlanet.locationId === pz.locationId)
      tr.style.backgroundColor = '#400';
    tr.addEventListener('mouseenter', () => {
      tr.style.backgroundColor = '#333';
      let selectedPlanet = ui.getSelectedPlanet();
      if (selectedPlanet && selectedPlanet.locationId === pz.locationId)
        tr.style.backgroundColor = '#600';
      pzHoveringInList = pz;
    });
    tr.addEventListener('mouseleave', () => {
      tr.style.backgroundColor = '#000';
      let selectedPlanet = ui.getSelectedPlanet();
      if (selectedPlanet && selectedPlanet.locationId === pz.locationId)
        tr.style.backgroundColor = '#400';
      pzHoveringInList = null;
    });
    tr.addEventListener('click', () => {
      ui.centerLocationId(pz.locationId);
      hlPinkZoneCounter = hlPinkZoneCounterMax;
      setTablePinkZoneList();
    });

    tablePinkZoneList.append(tr);
  }
}

function updateTablePinkZoneList() {
  // we check centerWorldCoords to see if the user moved, only then we update the pinkZoneList table
  const worldCoords = ui.getViewport().centerWorldCoords;
  if (
    worldCoords.x === lastWorldCoords.x &&
    worldCoords.y === lastWorldCoords.y
  ) {
    return;
  }

  lastWorldCoords.x = worldCoords.x;
  lastWorldCoords.y = worldCoords.y;
  setTablePinkZoneList();
}

function Plugin() {
  var o = {};

  o.container = null;

  o.destroy = function () {
    stopPinkIt = true;
    clearInterval(intervUpdateTablePZList);
    window.removeEventListener('click', o.onMouseClick);
  };

  o.init = function () {
    window.addEventListener('click', onMouseClick);
    setChoosenPlanets();
    intervUpdateTablePZList = setInterval(updateTablePinkZoneList, 330);
  };

  o.render = function (container) {
    container.width = '400px';
    o.container = container;
    let div = document.createElement('div');
    div.innerHTML =
      'select the planet in the center of the pink circle<br>highlights all planets that will be destroyed<br>black = dead planets<br>purple = destroy these planets';
    div.style.width = '100%';
    div.style.textAlign = 'center';
    container.append(div);

    let butExcludeOwned = createToggleButton(
      'exclude owned planets',
      setExcludeOwnedPlanets,
      false,
    );
    let butExcludeMine = createToggleButton(
      'exclude my planets',
      setExcludeMyPlanets,
      true,
    );

    let excludeButLine = FullButtonLine([butExcludeOwned, butExcludeMine]);
    container.append(excludeButLine);

    butPinkIt = document.createElement('button');
    butPinkIt.style.width = '100%';
    butPinkIt.style.height = '2.0rem';
    butPinkIt.style.fontSize = '1.2rem';
    butPinkIt.addEventListener('click', onButPinkItClick);
    setPinkItButton();
    container.append(butPinkIt);

    tablePinkZoneList = document.createElement('table');
    tablePinkZoneList.style.textAlign = 'center';
    tablePinkZoneList.style.width = '100%';
    tablePinkZoneList.style.marginTop = '5px';
    setTablePinkZoneList();
    container.append(tablePinkZoneList);
  };

  o.draw = function (ctx) {
    o.drawAllRings(ctx);
    drawListHoveringPZ(ctx);
    drawHlPinkZone(ctx);
    drawButPinkItAnimation();
  };

  o.drawAllRings = function (ctx) {
    if (dieingPlanet) {
      drawRingAnimationOnPlanet(ctx, dieingPlanet, 2, '#000000', true);
    }
    for (let p of choosenPlanets) {
      o.drawRingAroundPlanet(p, ctx, '#60F');
    }
    for (let p of deadPlanets) {
      o.drawRingAroundPlanet(p, ctx, '#000');
    }
  };

  o.drawRingAroundPlanet = function (planet, ctx, color = '#60A') {
    const viewport = ui.getViewport();

    // planet coordinates relative to the player
    const { x: planetX, y: planetY } = viewport.worldToCanvasCoords(
      planet.location.coords,
    );

    // planet radius in px
    var planetCtxPixelRadius = viewport.worldToCanvasDist(
      ui.getRadiusOfPlanetLevel(planet.planetLevel),
    );
    planetCtxPixelRadius *= 0.75;
    if (planetCtxPixelRadius < minCircleSizePx)
      planetCtxPixelRadius = minCircleSizePx;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.arc(planetX, planetY, planetCtxPixelRadius * 2, 0, Math.PI * 2, false);
    ctx.arc(
      planetX,
      planetY,
      planetCtxPixelRadius * 2 - circleThickness,
      0,
      Math.PI * 2,
      true,
    );
    ctx.fill();
  };

  o.init();
  return o;
}

class PinkIt {
  constructor() {
    this.plugin = Plugin();
  }
  render(div) {
    this.plugin.render(div);
  }
  draw(ctx) {
    this.plugin.draw(ctx);
  }
  destroy() {
    this.plugin.destroy();
  }
}

export default PinkIt;
