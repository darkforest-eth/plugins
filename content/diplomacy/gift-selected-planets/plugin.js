// Gift Selected Planets
// Easily transfer planets to others.
// Select start/end coordinates to filter the planets.
import {
  PlanetType,
  PlanetTypeNames
} from "https://cdn.skypack.dev/@darkforest_eth/types";


let viewport = ui.getViewport();
let pg = df.getProcgenUtils();

const ANY = -1;
const PLANET_TYPES = [
  { value: ANY, text: "Any" },
  ...Object.values(PlanetType).filter((type) => type !== PlanetType.Unknown).map((type) => ({ value: type, text: PlanetTypeNames[type] }))
];

const ArtifactFilterType = {
  ANY: ANY,
  WITH: 0,
  WITHOUT: 1,
}
const ARTIFACT_FILTER = [
  { value: ArtifactFilterType.ANY, text: "Any" },
  { value: ArtifactFilterType.WITH, text: "With artifacts" },
  { value: ArtifactFilterType.WITHOUT, text: "Without artifacts" }
]

function blocksLeftToProspectExpiration(
  currentBlockNumber,
  prospectedBlockNumber
) {
  return (prospectedBlockNumber || 0) + 255 - currentBlockNumber;
}

function prospectExpired(currentBlockNumber, prospectedBlockNumber) {
  return blocksLeftToProspectExpiration(currentBlockNumber, prospectedBlockNumber) <= 0;
}

function isFindable(planet, currentBlockNumber) {
  return (
    currentBlockNumber !== undefined &&
    df.isPlanetMineable(planet) &&
    planet.prospectedBlockNumber !== undefined &&
    !planet.hasTriedFindingArtifact &&
    !planet.unconfirmedFindArtifact &&
    !prospectExpired(currentBlockNumber, planet.prospectedBlockNumber)
  );
}

function isProspectable(planet) {
  return df.isPlanetMineable(planet) && planet.prospectedBlockNumber === undefined && !planet.unconfirmedProspectPlanet;
}

function hasArtifact(planet) {
  return planet.heldArtifactId != null
}

function canHaveArtifact(planet) {
  const currentBlockNumber = df.contractsAPI.ethConnection.blockNumber;
  return isProspectable(planet) || isFindable(planet, currentBlockNumber);
}

function createDivider() {
  let e = document.createElement('div');
  e.style.width = "100%";
  e.style.border = "0.1px solid white";
  e.style.margin = "20px 0";
  e.style.height = "0";
  return e;
}

function createSelect(options, onchange) {
  let e = document.createElement('select');
  e.style.background = 'rgb(8,8,8)';
  e.style.padding = '5px';
  e.style.marginLeft = '5px';
  e.style.marginRight = '5px';
  e.style.width = "50%";
  if (options && options.length > 0) {
    options.forEach(o => {
      let option = document.createElement('option');
      option.value = o.value;
      option.innerText = o.text;
      e.appendChild(option);
    })
  }
  if (onchange) {
    e.onchange = onchange;
  }
  return e;
}

function createWrapper(labelText, children) {
  let wrapper = document.createElement('div');
  wrapper.style.marginBottom = '10px';

  if (labelText) {
    let label = document.createElement('span');
    label.innerText = labelText;
  
    wrapper.appendChild(label);
  }

  if (children && children.length > 0) {
    children.forEach(e => wrapper.appendChild(e));
  }

  return wrapper;
}

function createButton(text, width, onclick) {
  let btn = document.createElement('button');
  btn.innerText = text;
  btn.style.width = width;
  btn.onclick = onclick;
  return btn;
}

class Plugin {
  constructor() {
    this.selectedPlanets = [];

    this.beginXY = document.createElement('div');
    this.endXY = document.createElement('div');

    let clear = createButton('Clear selection', '100%', () => {
      this.beginCoords = null;
      this.beginXY.innerText = 'Begin: ???';
      this.endCoords = null;
      this.endXY.innerText = '';
      this.selectedPlanets = [];
      this.renderPlanetList();
    });

    this.xyWrapper = createWrapper("Click on the map to pin selection.", [this.beginXY, this.endXY, clear]);

    this.planetListContainer = createWrapper('Planet list:');

    this.planetTypeFilter = createSelect(PLANET_TYPES, this.filterPlanet);
    this.planetTypeFilter.style.float = "right";
    this.artifactFilter = createSelect(ARTIFACT_FILTER, this.filterPlanet);
    this.artifactFilter.style.float = "right";

    this.userSelect = createSelect();
    this.refreshUsers();

    this.userInput = document.createElement('input');
    this.userInput.placeholder = 'twitter or user id';
    this.userInput.style.color = 'black';
    this.userInput.style.padding = '5px';
    this.userInput.style.marginLeft = '5px';
    this.userInput.style.width = '70%';

    this.feedback = document.createElement('div');
    this.feedback.style.marginBottom = '10px';
    this.feedback.style.textAlign = 'center';
  }

  filterPlanet = () => {
    this.selectedPlanets = df.getMyPlanets().filter(p => this.isInSelection(p)).sort((a, b) => b.planetLevel - a.planetLevel);
    this.renderPlanetList();
  };

  planetLink = (planet, clickable = true) => {
    const locationId = planet.locationId;
    const planetElement = document.createElement(clickable ? "button" : "span");
    planetElement.innerText = `L${planet.planetLevel}R${planet.upgradeState.reduce((a, b) => a + b, 0)} ${pg.getPlanetName(planet)}`;
    planetElement.title = locationId;
    planetElement.style.textDecoration = "underline";
    planetElement.style.background = "none";
    planetElement.style.border = "none";
    planetElement.style.color = "white";
    planetElement.style.outline = "none";
    planetElement.style.padding = "0";
    if (clickable) {
      planetElement.addEventListener("click", () => {
        ui.centerLocationId(locationId);
      });
    }
    return planetElement;
  };

  renderPlanet = (planet) => {
    const pElement = document.createElement("span");
    pElement.append(this.planetLink(planet));
    return pElement;
  }

  renderPlanetList = () => {
    this.planetListContainer.innerHTML = "Planet list:";
    this.planetListContainer.append(document.createElement("br"));

    for (const planet of this.selectedPlanets) {
      const pElement = this.renderPlanet(planet);
      this.planetListContainer.append(pElement);

      // deleteButton for remove planet from the list
      const delButton = createButton('Del', 'auto', () => {
        for (let i = 0; i < this.selectedPlanets.length; i++) {
          if (this.selectedPlanets[i] == planet) {
            this.selectedPlanets.splice(i, 1);
            break;
          }
        }
        this.renderPlanetList(this.planetListContainer);
      });
      delButton.style.marginLeft = "10px";
      this.planetListContainer.append(delButton);

      // new line
      this.planetListContainer.append(document.createElement("br"));
    }

  }

  refreshUsers = () => {
    this.userSelect.innerHTML = '';

    let empty = document.createElement('option');
    empty.innerText = 'Choose someone';
    empty.value = '';

    this.userSelect.appendChild(empty);

    ui.getAllPlayers().sort((a, b) => {
      if (a.twitter) {
        if (b.twitter) {
          return a.twitter.toLowerCase() < b.twitter.toLowerCase() ? -1 : 1
        } else {
          return -1
        }
      } else {
        if (b.twitter) {
          return 1
        } else {
          return a.address < b.address ? -1 : 1
        }
      }
    }).forEach(player => {
      let option = document.createElement('option');
      option.value = player.address;
      option.innerText = player.twitter || player.address;
      this.userSelect.appendChild(option);
    });
  }

  giftPlanets = () => {
    this.feedback.innerText = '';
    this.feedback.style.color = 'white';

    if (this.userInput.value !== '' && this.userSelect.value !== '') {
      this.feedback.innerText = `Either select a user OR enter one.`;
      this.feedback.style.color = 'red';
      return;
    }

    if (this.userInput.value === '' && this.userSelect.value === '') {
      this.feedback.innerText = `Select someone to gift to.`;
      this.feedback.style.color = 'red';
      return;
    }

    let playerAddress = "";

    if (this.userInput.value) {
      let value = this.userInput.value.startsWith('@') ? this.userInput.value.slice(1) : this.userInput.value;
      let player = ui.getAllPlayers().find(player => {
        return player.address === value.toLocaleLowerCase() || player.twitter === value;
      })
      if (!player) {
        this.feedback.innerText = `Unable to find that user.`;
        this.feedback.style.color = 'red';
        return;
      }
      playerAddress = player.address;
    } else if (this.userSelect.value) {
      playerAddress = this.userSelect.value;
    }

    for (const planet of this.selectedPlanets) {
      df.terminal.current.println(`[GITF] transfer ${planet.locationId} to ${playerAddress}`, 2);
      df.transferOwnership(planet.locationId, playerAddress);
    }
  }

  isInSelection = (planet) => {
    if (!planet.location) return false;
    const x = planet.location.coords.x, y = planet.location.coords.y;
    const x_in_range = (x - this.beginCoords.x) * (x - this.endCoords.x) <= 0;
    const y_in_range = (y - this.beginCoords.y) * (y - this.endCoords.y) <= 0;
    let in_range =  x_in_range && y_in_range;
    if (!in_range) return false;
    const planetType = +this.planetTypeFilter.value, artifact = +this.artifactFilter.value;
    if (planetType !== ANY && planetType !== planet.planetType) return false;
    if (artifact !== ArtifactFilterType.ANY) {
      const withArtifact = hasArtifact(planet) || canHaveArtifact(planet);
      if ((artifact === ArtifactFilterType.WITH && !withArtifact) || (artifact === ArtifactFilterType.WITHOUT && withArtifact)) return false;
    };
    return true;
  }

  onMouseMove = () => {
    let coords = ui.getHoveringOverCoords();
    if (coords) {
      if (this.beginCoords == null) {
        this.beginXY.innerText = `Begin: (${coords.x}, ${coords.y})`
        return;
      }

      if (this.endCoords == null) {
        this.endXY.innerText = `End: (${coords.x}, ${coords.y})`
        return;
      }
    }
  }

  onClick = () => {
    let coords = ui.getHoveringOverCoords();
    if (coords) {
      if (this.beginCoords == null) {
        this.beginCoords = coords;
        return;
      }

      if (this.endCoords == null) {
        this.endCoords = coords;
        this.filterPlanet();
        return;
      }
    }
  }

  async render(container) {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('click', this.onClick);

    let planetTypeWrapper = createWrapper("Planet type filter:", [this.planetTypeFilter]);

    let artifactFilterWrapper = createWrapper("Artifact filter:", [this.artifactFilter]);

    let refreshButton = createButton('refresh', '20%', this.refreshUsers);
    let selectWrapper = createWrapper("Select user:", [this.userSelect, refreshButton]);

    let inputWrapper = createWrapper('Or enter them:', [this.userInput]);

    let giftButton = createButton('Gift Selected Planets!', '100%', this.giftPlanets);

    container.appendChild(this.xyWrapper);
    container.appendChild(this.planetListContainer);
    container.appendChild(createDivider());
    container.appendChild(planetTypeWrapper);
    container.appendChild(artifactFilterWrapper);
    container.appendChild(selectWrapper);
    container.appendChild(inputWrapper);
    container.appendChild(this.feedback);
    container.appendChild(giftButton);
  }

  draw(ctx) {
    let begin = this.beginCoords;
    let end = this.endCoords || ui.getHoveringOverCoords();
    if (begin && end) {
      let beginX = Math.min(begin.x, end.x);
      let beginY = Math.max(begin.y, end.y);
      let endX = Math.max(begin.x, end.x);
      let endY = Math.min(begin.y, end.y);
      let width = endX - beginX;
      let height = beginY - endY;

      ctx.save();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        viewport.worldToCanvasX(beginX),
        viewport.worldToCanvasY(beginY),
        viewport.worldToCanvasDist(width),
        viewport.worldToCanvasDist(height)
      );
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = "red";
    ctx.strokeStyle = "red";
    for (let planet of this.selectedPlanets) {
      if (!planet.location) continue;
      let { x, y } = planet.location.coords;

      // add red circle when level <= 4
      if (planet.planetLevel <= 4) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "dashed";
        ctx.beginPath();
        ctx.arc(
          viewport.worldToCanvasX(x),
          viewport.worldToCanvasY(y),
          viewport.worldToCanvasDist(ui.getRadiusOfPlanetLevel(3) * 6),
          0,
          2 * Math.PI
        );
        // ctx.fill();
        ctx.stroke();
        ctx.closePath();
      }

      ctx.beginPath();
      ctx.arc(
        viewport.worldToCanvasX(x),
        viewport.worldToCanvasY(y),
        viewport.worldToCanvasDist(
          ui.getRadiusOfPlanetLevel(planet.planetLevel)
        ),
        0,
        2 * Math.PI
      );
      ctx.fill();
      // ctx.stroke();
      ctx.closePath();
    }
    ctx.restore();
  }

  destroy() {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('click', this.onClick);
  }
}

export default Plugin;
