//
// Abandon Area Planets
//
// author: https://twitter.com/ddy_mainland
//
// Abandon the planet(s) with colorful circle(s) on the map.
// 
// For Each planet, the plugin will find my closest planet 
//   which are not in abandon list as the target of move.
//
// For planet filter, this plugin supports level filter and have three modes:
//   set Single Planet, set Range Planet(s) and set All Planet(s).
//



import { PlanetLevel, PlanetType, PlanetTypeNames } from
  "https://cdn.skypack.dev/@darkforest_eth/types";

import { html, render, useState } from
  "https://unpkg.com/htm/preact/standalone.module.js";

import { getPlayerColor } from
  "https://cdn.skypack.dev/@darkforest_eth/procedural";

import {
  EMPTY_ADDRESS
} from 'https://cdn.skypack.dev/@darkforest_eth/constants';


function infoWithColor(text, textColor) {
  return html`<div style=${{ color: textColor }}>${text}</div>`;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

let minLevel = 0;
let maxLevel = 2;

function getArrivalsToPlanet(plt) {
  let planetId = plt.locationId;
  var timestamp = new Date().getTime();
  timestamp = Math.floor(timestamp * 0.001);
  const unconfirmed = df.getUnconfirmedMoves().filter(move => move.to === planetId);
  const arrivals = df.getAllVoyages()
    .filter(arrival => arrival.toPlanet === planetId && arrival.arrivalTime > timestamp);
  return arrivals.length + unconfirmed.length;
}
let planetRange = {
  beginCoords: null,
  endCoords: null,
};

const CursorMode = {
  SINGLE: 1,
  RANGE: 2,
  ALL: 3
};

let showPlanetList = [];
let canNotAbandonPlanets = [];

let cursorMode = CursorMode.ALL;

function clearRangeCoords() {
  planetRange = {
    beginCoords: null,
    endCoords: null,
  };
}

function setCursorMode(mode) {
  console.log("Set Cursor Mode to: ", mode);
  switch (mode) {
    case CursorMode.RANGE:
      clearRangeCoords();
      cursorMode = CursorMode.RANGE;
      break;
    case CursorMode.SINGLE:
      clearRangeCoords();
      cursorMode = CursorMode.SINGLE;
      break;
    default:
      clearRangeCoords();
      cursorMode = CursorMode.ALL;
  }
}

const PLANET_LEVELS = Object.values(PlanetLevel).map((level) => ({
  value: level,
  text: level.toString(),
}));

function drawRound(ctx, p, color, width, alpha) {
  if (!p) return '(???,???)';
  const viewport = ui.getViewport();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  const { x, y } = viewport.worldToCanvasCoords(p.location.coords);
  const range = p.range * 0.01 * 20;
  const trueRange = viewport.worldToCanvasDist(range);
  ctx.beginPath();
  // ctx.setLineDash([10,10]);
  ctx.arc(x, y, trueRange, 0, 2 * Math.PI);
  ctx.stroke();
  return `(${p.location.coords.x},${p.location.coords.y})`
}

function drawRectangle(ctx, coordsA, coordsB, color) {
  if (coordsA && coordsB) {
    const viewport = ui.getViewport();
    let beginX = Math.min(coordsA.x, coordsB.x);
    let beginY = Math.min(coordsA.y, coordsB.y);
    let endX = Math.max(coordsA.x, coordsB.x);
    let endY = Math.max(coordsA.y, coordsB.y);
    let width = endX - beginX;
    let height = endY - beginY;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      viewport.worldToCanvasX(beginX),
      viewport.worldToCanvasY(endY),
      viewport.worldToCanvasDist(width),
      viewport.worldToCanvasDist(height)
    );
    ctx.restore();
  }
}


function refreshPlanetList() {
  console.log("refreshPlanet");
  if (cursorMode === CursorMode.ALL) {
    showPlanetList = [];
    const planets = df.getMyPlanets();
    for (const p of planets) {
      if (!p?.location?.coords) continue;
      if (p.planetLevel < minLevel) continue;
      if (p.planetLevel > maxLevel) continue;
      if (getArrivalsToPlanet(p) > 0) continue;
      showPlanetList.push(p);
    }
    return;
  } else if (cursorMode === CursorMode.RANGE) {
    if (planetRange.beginCoords === null) return;
    if (planetRange.endCoords === null) return;
    showPlanetList = [];
    let coordsA = planetRange.beginCoords;
    let coordsB = planetRange.endCoords;
    let beginX = Math.min(coordsA.x, coordsB.x);
    let beginY = Math.min(coordsA.y, coordsB.y);
    let endX = Math.max(coordsA.x, coordsB.x);
    let endY = Math.max(coordsA.y, coordsB.y);
    const planets = df.getMyPlanets();
    for (const p of planets) {
      ;
      if (!p?.location?.coords) continue;
      if (p.planetLevel < minLevel) continue;
      if (p.planetLevel > maxLevel) continue;
      if (getArrivalsToPlanet(p) > 0) continue;
      let coords = p.location.coords;
      if (coords.x >= beginX && coords.y >= beginY && coords.x <= endX && coords.y <= endY) {
        showPlanetList.push(p);
      }
    }
  }
}

function abandonAreaPlanets() {
  const [inMinLevel, setInMinLevel] = useState(minLevel);
  const [inMaxLevel, setInMaxLevel] = useState(maxLevel);
  const [selectInfo, setSelectInfo] =
    useState("select the planet(s) you want to abandon");
  const [abandonInfo, setAbandonInfo] = useState('');

  let divStyle = {
    textAlign: 'center',
    width: "100%",
    marginTop: "10px",
  };

  let selectStyle = {
    background: "rgb(8,8,8)",
    width: "100px",
    padding: "3px 5px",
    border: "1px solid white",
    borderRadius: "3px",
  };

  const minLevelSelect = html`
		<select
		  style=${selectStyle}
		  value=${inMinLevel}
		  onChange=${async (e) => {
      let value = Number(e.target.value);
      minLevel = Math.min(value, inMaxLevel);
      maxLevel = Math.max(value, inMaxLevel);
      refreshPlanetList();
      setInMinLevel(value);
    }
    }
		>
		  ${PLANET_LEVELS.map(
      ({ value, text }) => html`<option value=${value}>${text}</option>`
    )}
		</select>`;

  const maxLevelSelect = html`
		<select
		  style=${selectStyle}
		  value=${inMaxLevel}
		  onChange=${(e) => {
      let value = Number(e.target.value);
      minLevel = Math.min(inMinLevel, value);
      maxLevel = Math.max(inMinLevel, value);
      refreshPlanetList();
      setInMaxLevel(value);
    }
    }
		>
		  ${PLANET_LEVELS.map(
      ({ value, text }) => html`<option value=${value}>${text}</option>`
    )}
		</select>`;

  const selectLevelComponent = html`
		<div>
		<h1> choose the planetLevel </h1>
		<div>
		${minLevelSelect}
		${' '}
		${maxLevelSelect}
		</div>
		<h1> the level you choose is [${minLevel},${maxLevel}]</h1>
		</div>
	`;

  function selectSinglePlanet() {
    console.log("Select Single Planet");
    setCursorMode(CursorMode.SINGLE);
    showPlanetList = [];
    canNotAbandonPlanets = [];

    let info = infoWithColor('please click one planet to abandon', 'white');
    setSelectInfo(info);
    setAbandonInfo('');
    return;
  }

  let selectSinglePlanetButton = html`
		<div  style=${{ width: "100px" }} > 
			<button 
				onClick=${selectSinglePlanet}
			> set Single Planet </button>
		</div>
	`;

  function selectRangePlanet() {
    console.log("Select Range Planet");
    setCursorMode(CursorMode.RANGE);
    showPlanetList = [];
    canNotAbandonPlanets = [];
    let info = infoWithColor('determine the area of planet(s) with level filter', 'white');
    setSelectInfo(info);
    setAbandonInfo('');
    return;
  }


  let selectRangeButton =
    html`
			<div style=${{ marginLeft: "8px", width: "100px" }}>
			<button
			onClick=${selectRangePlanet}
			>Set Range Planet(s)</button>
			</div>
		`;

  function selectAllPlanet() {
    console.log("Select All Planet");
    setCursorMode(CursorMode.ALL);
    showPlanetList = [];
    canNotAbandonPlanets = [];
    let info = infoWithColor('determine all planet(s) with level filter', 'white');
    setSelectInfo(info);
    setAbandonInfo('');
  }

  let selectAllButton = html`
	<div style=${{ marginLeft: "8px", width: "100px" }}>
	<button
	onClick=${selectAllPlanet}
	>Set All Planet(s)</button>
	</div>
	`;
  const flexRow = {
    display: "flex",
    flexDirection: "row",
  };

  let selectComponent = html`<div>
	<div style=${{ ...flexRow, marginTop: "16px", marginLeft: "10px" }}>
	${selectSinglePlanetButton}
	${selectRangeButton}
	${selectAllButton}
	</div>
		${selectInfo}
	</div>`;

  async function abandonPlanets() {
    refreshPlanetList();

    let info = [];
    let content = 'try to abandon ' + showPlanetList.length + ' circled planet(s)';
    let infoItem = infoWithColor(content, 'pink');
    info.push(infoItem);
    content = 'please wait for a while...';
    infoItem = infoWithColor(content, 'pink');
    info.push(infoItem);

    setAbandonInfo(info);

    await sleep(100);

    for (const from of showPlanetList) {
      let candidateAimPlanets = df.getMyPlanets()
        .filter(planet => (
          showPlanetList.includes(planet) === false &&
          planet.location !== undefined &&
          planet.destroyed === false &&
          getArrivalsToPlanet(planet) < 6
        ))
        .sort((a, b) => {
          let aDist = df.getDist(a.locationId, from.locationId);
          let bDist = df.getDist(b.locationId, from.locationId);
          return aDist - bDist;
        });

      if (candidateAimPlanets.length === 0) {
        canNotAbandonPlanets.push(from);
        continue;
      }
      let to = candidateAimPlanets[0];
      let fromId = from.locationId;
      let toId = to.locationId;
      let arrivingEnergy = 2;
      let abandoning = true;

      let energyNeed = df.getEnergyNeededForMove(fromId, toId, arrivingEnergy, abandoning);
      energyNeed = Math.ceil(energyNeed);
      let energyHave = Math.floor(from.energy);
      if (energyNeed > energyHave) {
        canNotAbandonPlanets.push(from);
        continue;
      }

      let forces = energyHave;
      let silver = 0;
      let artifactMoved = undefined;
      try {
        await df.move(fromId, toId, forces, silver, artifactMoved, abandoning);
      } catch (error) {
        console.error('move may be revert...');
      }
    }

    console.log(canNotAbandonPlanets);

    info = [];

    let cnt = showPlanetList.length - canNotAbandonPlanets.length;
    content = cnt + ' planet(s) can abandon';
    infoItem = infoWithColor(content, 'yellow');
    info.push(infoItem);


    content = canNotAbandonPlanets.length + ' planet(s) can not abandon';
    infoItem = infoWithColor(content, '#FF6666');
    info.push(infoItem);
    content = 'Red circles are around these planet(s)';
    infoItem = infoWithColor(content, '#FF6666');
    info.push(infoItem);

    content = 'need sometimes to wait move(s) confirmed';
    infoItem = infoWithColor(content, 'yellow');
    info.push(infoItem);
    content = 'notice move may revert!!!';
    infoItem = infoWithColor(content, '#FF66FF');
    info.push(infoItem);

    setAbandonInfo(info);
    await sleep(100);
  }

  let abandonComponent = html`
	<div style=${{ marginTop: "16px" }}>
	<button
	onClick=${abandonPlanets}
	>Abandon The Planet(s)</button>
	<div>${abandonInfo}</div>
	</div>`;

  return html`
	<div style=${divStyle}>
		${selectLevelComponent}
		${selectComponent}
		${abandonComponent}		
	</div>`;
}


function App() {
  return html`<${abandonAreaPlanets} />`;
}

class Plugin {
  constructor() {
    minLevel = 0;
    maxLevel = 2;
    cursorMode === CursorMode.ALL;
    showPlanetList = df.getMyPlanets();
    refreshPlanetList();
    this.container = null;
  }

  onClick = () => {
    if (cursorMode === CursorMode.SINGLE) {
      let p = ui.getSelectedPlanet();
      if (p == undefined) return;
      if (p.owner != df.account) return;
      showPlanetList = [];
      showPlanetList.push(p);


    } else if (cursorMode === CursorMode.RANGE) {
      let coords = ui.getHoveringOverCoords();
      if (!coords) return;
      if (planetRange.beginCoords == null) {
        planetRange.beginCoords = coords;
        return;
      } else if (planetRange.endCoords == null) {
        planetRange.endCoords = coords;
        // console.log(planetRange);
        refreshPlanetList();
      } else {
        //console.log(planetRange);
        refreshPlanetList();
      }
    } else if (cursorMode === CursorMode.ALL) {
      refreshPlanetList();
    }

  }

  draw(ctx) {
    if (cursorMode === CursorMode.RANGE) {
      let begin = planetRange.beginCoords;
      let end = planetRange.endCoords || ui.getHoveringOverCoords();

      drawRectangle(ctx, begin, end, "red");
      if (begin != null && end != null) {
        let coordsA = begin;//planetRange.beginCoords;
        let coordsB = end;//planetRange.endCoords;
        let beginX = Math.min(coordsA.x, coordsB.x);
        let beginY = Math.min(coordsA.y, coordsB.y);
        let endX = Math.max(coordsA.x, coordsB.x);
        let endY = Math.max(coordsA.y, coordsB.y);

        const planets = df.getMyPlanets();

        if (minLevel > maxLevel) {
          let tmp = minLevel;
          minLevel = maxLevel;
          maxLevel = tmp;
        }


        for (let i in planets) {
          let p = planets[i];
          if (!p?.location?.coords) continue;
          if (p.planetLevel < minLevel) continue;
          if (p.planetLevel > maxLevel) continue;

          let coords = p.location.coords;
          if (coords.x >= beginX && coords.y >= beginY && coords.x <= endX && coords.y <= endY) {

            let color = getPlayerColor(p.owner);
            drawRound(ctx, p, color, 2, 0.7);
          }
        }
      }
    }
    for (let i in showPlanetList) {
      let p = showPlanetList[i];
      let color = getPlayerColor(p.owner);
      drawRound(ctx, p, color, 2, 1);
    }
    canNotAbandonPlanets.forEach(p => drawRound(ctx, p, '#FF6666', 3, 1));
  }

  async render(container) {
    this.container = container;
    container.style.width = "350px";
    container.style.height = "360px";
    window.addEventListener("click", this.onClick);
    render(html`<${App} />`, container);
  }

  destroy() {
    render(null, this.container);
  }
}

export default Plugin;





