// Highlight Artifacts

import { PlanetLevel, PlanetLevelNames } from "https://cdn.skypack.dev/@darkforest_eth/types";

let viewport = ui.getViewport();

class Plugin {
  constructor() {
    this.artifacts = [];
    this.levelFilter = 3;
  }

  cacheArtifactPlanets = () => {
    this.artifacts = [];
    for (let planet of df.getAllPlanets()) {
      if (
        planet.planetLevel >= this.levelFilter &&
        df.isPlanetMineable(planet) &&
        !planet.hasTriedFindingArtifact
      ) {
        this.artifacts.push(planet);
      }
    }
  }

  render(container) {
    container.parentElement.style.minHeight = 'unset';
    container.style.minHeight = 'unset';

    container.style.width = '200px';

    let levelLabel = document.createElement('label');
    levelLabel.innerText = 'Min. planets to show';
    levelLabel.style.display = 'block';

    let levelSelect = document.createElement('select');
    levelSelect.style.background = 'rgb(8,8,8)';
    levelSelect.style.width = '100%';
    levelSelect.style.marginTop = '10px';
    levelSelect.style.marginBottom = '10px';
    Object.values(PlanetLevel).forEach(lvl => {
      let opt = document.createElement('option');
      opt.value = `${lvl}`;
      opt.innerText = PlanetLevelNames[lvl];
      levelSelect.appendChild(opt);
    });
    levelSelect.value = `${this.levelFilter}`;

    let showButton = document.createElement('button');
    showButton.style.display = 'block';
    showButton.style.width = '100%';
    showButton.innerText = 'Highlight Planets!';
    showButton.onclick = () => {
      this.levelFilter = parseInt(levelSelect.value, 10);
      this.cacheArtifactPlanets();
    }

    container.appendChild(levelLabel);
    container.appendChild(levelSelect);
    container.appendChild(showButton);
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'red';
    for (let planet of this.artifacts) {
      if (planet.location) {
        let { x, y } = planet.location.coords;
        ctx.beginPath();
        ctx.arc(
          viewport.worldToCanvasX(x),
          viewport.worldToCanvasY(y),
          viewport.worldToCanvasDist(planet.planetLevel * 20),
          0,
          2 * Math.PI,
        );
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
      }
    }
    ctx.restore();
  }

  destroy() {

  }
}

export default Plugin;
