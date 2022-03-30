//
// Capture Wait Time
//
// author: https://twitter.com/ddy_mainland
//
// Show how many blocks need to wait to capture planet and energy percent.
//
// 

import { html, render, useState, useEffect } from
  "https://unpkg.com/htm/preact/standalone.module.js";

import {
  EMPTY_ADDRESS
} from 'https://cdn.skypack.dev/@darkforest_eth/constants';

let showCalcPlanet = [];
let showAllInvadePlanets = [];

export let getEnergyPercent = (planet) => {
  if (!planet) return 0;
  return Math.floor(planet.energy / planet.energyCap * 100);
}

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

function infoWithColor(text, textColor) {
  return html`<div style=${{ color: textColor }}>${text}</div>`;
}

function captureWaitTime() {

  const [info, setInfo] = useState('select one planet :-)');

  useEffect(() => {
    window.addEventListener("click", calcCaptureTime);
    return () => {
      window.removeEventListener("click", calcCaptureTime);
    }
  }, []);

  function calcCaptureTime() {

    let planet = ui.getSelectedPlanet();
    if (planet === undefined) {
      showCalcPlanet = [];
      return;
    }

    planet = df.getPlanetWithId(planet.locationId);
    if (showCalcPlanet.length !== 0) showCalcPlanet = [];
    showCalcPlanet.push(planet);

    let infoTmp = [];
    let content = undefined;
    let infoItem = undefined;

    if (planet.invader === EMPTY_ADDRESS) {
      content = 'Not Invade :-C';
      infoItem = infoWithColor(content, 'white');
      infoTmp.push(infoItem);
      setInfo(infoTmp);

    } else if (planet.invader !== EMPTY_ADDRESS && planet.capturer !== EMPTY_ADDRESS) {
      content = 'Capture Before :-C';
      infoItem = infoWithColor(content, '#CC3333');
      infoTmp.push(infoItem);
      setInfo(infoTmp);

    } else if (planet.capturer === EMPTY_ADDRESS) {
      let currentBlockNumber = df.contractsAPI.ethConnection.blockNumber;
      let beginBlockNumber = planet.invadeStartBlock;
      let delta = df.contractConstants.CAPTURE_ZONE_HOLD_BLOCKS_REQUIRED;//256*8;
      let lastBlock = beginBlockNumber + delta - currentBlockNumber;

      lastBlock = Math.max(lastBlock, 0);

      let energyPercent = getEnergyPercent(planet);
      content = 'Energy percent is about ' + energyPercent + '%';

      infoItem = infoWithColor(content, 'yellow');
      infoTmp.push(infoItem);

      content = 'need wait ' + lastBlock + ' block(s)';
      infoItem = infoWithColor(content, 'pink');
      infoTmp.push(infoItem);
      let scoresList = df.contractConstants.CAPTURE_ZONE_PLANET_LEVEL_SCORE;
      let score = scoresList[planet.planetLevel];
      content = 'Can Get ' + score + ' Score(s)';
      infoItem = infoWithColor(content, 'pink');
      infoTmp.push(infoItem);
      setInfo(infoTmp);
    }
    return;
  }

  function getAllInvadePlanets() {
    let planets = Array.from(df.getAllPlanets())
      .filter(planet => {
        if (planet.destroyed === true) return false;
        if (planet.location === undefined) return false;
        let aboutState = planet.capturer === EMPTY_ADDRESS &&
          planet.invader !== EMPTY_ADDRESS;
        return aboutState;
      });
    showAllInvadePlanets = planets;
  }

  function clearPlanets() {
    showAllInvadePlanets = [];
  }

  let allInvadePlanetsButton = html`<div>
		<button  style=${{ marginLeft: "8px", width: "130px", height: "50px" }}
			onClick=${getAllInvadePlanets}
		>Show All Invade Planets</button>
		</div>
	`;

  let clearPlanetsButton = html`<div>
		<button style=${{ marginLeft: "18px", width: "130px", height: "50px" }}
			onClick=${clearPlanets}
		>Clear Planets</button>
		</div>
	`;
  const flexRow = {
    display: "flex",
    flexDirection: "row",
    marginTop: "16px",
    marginLeft: "10px",
    marginBottom: "10px"
  };

  return html`<div>
		<div style=${{ ...flexRow }}>
			${allInvadePlanetsButton}
			${clearPlanetsButton}
		</div>
		<div style=${{ textAlign: 'center' }}>${info}</div>
	</div>`;
}

class Plugin {
  constructor() {
    this.container = null;
  }
  draw(ctx) {
    showAllInvadePlanets.forEach(p => drawRound(ctx, p, 'pink', 2, 0.7));
    showCalcPlanet.forEach(p => drawRound(ctx, p, 'pink', 5, 1));
  }

  async render(container) {
    this.container = container;
    container.style.width = "320px";
    container.style.height = "150px";
    render(html`<${captureWaitTime} />`, container);
  }
  destroy() {
    render(null, this.container);
  }
}

export default Plugin;

