const BiomeNames = [
  'Unknown',
  'Ocean',
  'Forest',
  'Grassland',
  'Tundra',
  'Swamp',
  'Desert',
  'Ice',
  'Wasteland',
  'Lava',
];

let emptyAddress = "0x0000000000000000000000000000000000000000";

let isUnowned = (planet) => planet.owner === emptyAddress;

let isMine = (planet) => planet.owner === df.account;

let unlockTimestamp = (planet) => {
  return (planet.artifactLockedTimestamp + (12 * 60 * 60)) * 1000;
}

let unlockTime = (planet) => {
  return (new Date(unlockTimestamp(planet))).toLocaleString();
}

let canWithdraw = (planet) => {
  if (planet && planet.artifactLockedTimestamp) {
    return Date.now() > unlockTimestamp(planet)
  } else {
    return false;
  }
}

let coords = (planet) => {
  return `(${planet.location.coords.x}, ${planet.location.coords.y})`
}

let energy = (planet) => {
  return Math.floor(planet.energy / planet.energyCap * 100);
}

let canHazArtifact = (planet) => {
  return df.isPlanetMineable(planet) && !planet.hasTriedFindingArtifact
}

let canMint = (planet) => energy(planet) >= 95;
let hasArtifact = (planet) => planet.heldArtifactId != null;

class Plugin {
  constructor() {
    this.lastLocationId = null;

    this.planetList = document.createElement('div');
    this.planetList.style.maxHeight = '200px';
    this.planetList.style.overflowX = 'hidden';
    this.planetList.style.overflowY = 'scroll';
  }

  clearPlanetList = () => {
    this.planetList.innerHTML = '';
    this.planetList.innerText = '';
  }

  myPlanetsWithArtifacts() {
    return Array.from(df.getMyPlanets())
      .filter(df.isPlanetMineable)
      .sort((p1, p2) => parseInt(p1.locationId, 16) - parseInt(p2.locationId, 16));
  }

  allPlanetsWithArtifacts() {
    return Array.from(df.getAllPlanets())
      .filter(canHazArtifact)
      .sort((p1, p2) => parseInt(p1.locationId, 16) - parseInt(p2.locationId, 16));
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

  renderMyAvailable = () => {
    let planets = this.myPlanetsWithArtifacts().filter(planet => {
      return !planet.hasTriedFindingArtifact
    });

    for (let planet of planets) {
      let planetEntry = document.createElement('div');
      planetEntry.style.marginBottom = '10px';
      planetEntry.style.display = 'flex';
      planetEntry.style.justifyContent = 'space-between';

      let biome = BiomeNames[planet.biome];
      let text = `${biome} at ${coords(planet)} - ${energy(planet)}% energy`;
      let content = this.renderSelectable(planet, text)
      planetEntry.appendChild(content);

      if (canMint(planet)) {
        let button = document.createElement('button');
        button.style.marginLeft = '5px';
        button.innerText = 'Find!';
        button.onclick = () => {
          df.findArtifact(planet.locationId);
          button.innerText = 'Finding...';
          button.disabled = true;
        }
        planetEntry.appendChild(button);
      }

      this.planetList.appendChild(planetEntry);
    }

    if (this.planetList.children.length === 0) {
      this.planetList.innerHTML = 'No artifacts to find right now.';
    }
  };

  renderOnPlanets = () => {
    const planets = this.myPlanetsWithArtifacts()
      .filter(hasArtifact)
      .sort((p1, p2) => p1.artifactLockedTimestamp - p2.artifactLockedTimestamp)

    for (let planet of planets) {
      let planetEntry = document.createElement('div');

      planetEntry.style.marginBottom = '10px';
      let biome = BiomeNames[planet.biome];
      let text = `${biome} at ${coords(planet)} - ${unlockTime(planet)}`;
      let content = this.renderSelectable(planet, text)
      planetEntry.appendChild(content);

      if (canWithdraw(planet)) {
        let button = document.createElement('button');
        button.style.marginLeft = '5px';
        button.innerText = 'Withdraw!'
        button.onclick = () => {
          df.withdrawArtifact(planet);
          button.innerText = 'Withdrawing..';
          button.disabled = true;
        }
        planetEntry.appendChild(button);
      }

      this.planetList.appendChild(planetEntry);
    }

    if (this.planetList.children.length === 0) {
      this.planetList.innerHTML = 'No artifacts on your planets.';
    }
  };

  renderUntaken = () => {
    let planets = this.allPlanetsWithArtifacts()
      .filter(isUnowned);

    for (let planet of planets) {
      let planetEntry = document.createElement('div');
      planetEntry.style.marginBottom = '10px';
      planetEntry.style.display = 'flex';
      planetEntry.style.justifyContent = 'space-between';
      planetEntry.dataset.locationId = planet.locationId;

      let biome = BiomeNames[planet.biome];
      let text = `${biome} at ${coords(planet)}`;
      let content = this.renderSelectable(planet, text);
      planetEntry.appendChild(content);
      this.planetList.appendChild(planetEntry);
    }

    if (this.planetList.children.length === 0) {
      this.planetList.innerHTML = 'No artifacts to find right now.';
    }
  };

  centerPlanet = (coords) => {
    let planet = df.getPlanetWithCoords(coords);
    if (planet) {
      this.lastLocationId = planet.locationId;
    }

    ui.centerPlanet(planet);

    if (this.planetList) {
      Array.from(this.planetList.children).forEach(el => {
        if (el.dataset.locationId === this.lastLocationId) {
          el.style.color = 'pink';
        } else {
          el.style.color = '';
        }
      });
    }
  }

  async render(container) {
    container.style.width = '450px';

    let buttonBar = document.createElement('div');
    buttonBar.style.display = 'flex';
    buttonBar.style.justifyContent = 'space-around';
    buttonBar.style.marginBottom = '20px';
    let contentPane = document.createElement('div');

    const myAvailable = document.createElement('button');
    myAvailable.innerText = 'My unminted';
    buttonBar.appendChild(myAvailable);
    const onPlanets = document.createElement('button');
    onPlanets.innerText = 'On my planets'
    buttonBar.appendChild(onPlanets);
    const untaken = document.createElement('button');
    untaken.innerText = 'Untaken planets'
    buttonBar.appendChild(untaken);

    container.appendChild(buttonBar);
    container.appendChild(contentPane);

    myAvailable.onclick = () => {
      this.clearPlanetList();
      this.renderMyAvailable()
      contentPane.appendChild(this.planetList);
    }
    onPlanets.onclick = () => {
      this.clearPlanetList();
      this.renderOnPlanets();
      contentPane.appendChild(this.planetList);
    }
    untaken.onclick = () => {
      this.clearPlanetList();
      this.renderUntaken();
      contentPane.appendChild(this.planetList);
    }

    this.renderMyAvailable()
    contentPane.appendChild(this.planetList);
  }
}

plugin.register(new Plugin());
