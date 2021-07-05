// Upgradeable Planets
// Quick view of planets ready for upgrade.

// Remixed from https://gist.github.com/blurpesec/ddd8c7a670a2f8f9f3a28b02c1ff0897
import {
  coords,
  getSilver,
  canPlanetUpgrade,
  getSilverNeeded,
} from 'https://plugins.zkga.me/utils/utils.js';

// 30 seconds
let REFRESH_INTERVAL = 1000 * 30;

class Plugin {
  constructor() {
    this.lastLocationId = null;
    this.loopId = null;

    this.planetList = document.createElement('div');
    this.planetList.style.maxHeight = '100px';
    this.planetList.style.overflowX = 'hidden';
    this.planetList.style.overflowY = 'scroll';
  }

  clearPlanetList = () => {
    this.planetList.innerHTML = '';
    this.planetList.innerText = '';
  }

  allPlanetsWithUpgrade() {
    return Array.from(df.getMyPlanets())
      .filter(canPlanetUpgrade)
      .sort((p1, p2) => parseInt(p2.planetLevel, 10) - parseInt(p1.planetLevel, 10));
  }

  renderSelectable = (planet, text) => {
    let content = document.createElement('span');
    content.innerText = text;
    let { x, y } = planet.location.coords;
    content.onclick = () => {
      this.centerPlanet({ x, y })
    };
    return content;
  }

  renderUpgradable = () => {
    this.clearPlanetList();

    let planets = this.allPlanetsWithUpgrade()
    let title = document.createElement('div');
    title.style.marginBottom = '10px';
    title.style.display = 'flex';
    title.style.justifyContent = 'space-between';
    title.innerText = `${planets.length} planets ready for upgrade!`;

    this.planetList.appendChild(title);

    for (let planet of planets) {
      if (planet.location) {
        let planetEntry = document.createElement('div');
        planetEntry.style.marginBottom = '10px';
        planetEntry.style.display = 'flex';
        planetEntry.style.justifyContent = 'space-between';
        planetEntry.dataset.locationId = planet.locationId;

        this.colorSelected(planetEntry);

        let text = `Level ${planet.planetLevel} at ${coords(planet)} - ${getSilver(planet)} / ${getSilverNeeded(planet)} silver`;
        let content = this.renderSelectable(planet, text)
        planetEntry.appendChild(content);

        this.planetList.appendChild(planetEntry);
      }
    }

    // 1 because the title is always there
    if (this.planetList.children.length === 1) {
      this.planetList.innerHTML = 'No planets to upgrade right now.';
    }
  };

  centerPlanet = (coords) => {
    let planet = df.getPlanetWithCoords(coords);
    if (planet) {
      this.lastLocationId = planet.locationId;
    }

    ui.centerPlanet(planet);

    if (this.planetList) {
      Array.from(this.planetList.children)
        .forEach(this.colorSelected);
    }
  }

  colorSelected = (el) => {
    if (el.dataset.locationId === this.lastLocationId) {
      el.style.color = 'pink';
    } else {
      el.style.color = '';
    }
  }

  async render(container) {
    container.style.width = '400px';
    let contentPane = document.createElement('div');
    container.appendChild(contentPane);

    this.renderUpgradable();
    this.loopId = setInterval(this.renderUpgradable, REFRESH_INTERVAL);

    contentPane.appendChild(this.planetList);
  }

  destroy() {
    if (this.loopId) {
      clearInterval(this.loopId)
    }
  }
}

export default Plugin;
