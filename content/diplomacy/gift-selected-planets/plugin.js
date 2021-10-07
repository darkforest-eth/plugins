// Gift Selected Planets
// Easily transfer planets to others.
// Select start/end coordinates to filter the planets.

let viewport = ui.getViewport();
let pg = df.getProcgenUtils();

class Plugin {
  constructor() {
    this.selectedPlanets = [];

    this.xyWrapper = document.createElement('div');
    this.xyWrapper.style.marginBottom = '10px';

    let msg = document.createElement('div');
    msg.innerText = 'Click on the map to pin selection.';
    this.beginXY = document.createElement('div');
    this.endXY = document.createElement('div');

    let clear = document.createElement('button');
    clear.innerText = 'Clear selection';
    clear.style.width = '100%';
    clear.onclick = () => {
      this.beginCoords = null;
      this.beginXY.innerText = 'Begin: ???';
      this.endCoords = null;
      this.endXY.innerText = '';
      this.selectedPlanets = [];
      this.renderPlanetList();
    }

    this.planetListContainer = document.createElement("div");
    this.planetListContainer.innerText = "Planet list:";
    this.planetListContainer.style.marginTop = '10px';

    this.xyWrapper.appendChild(msg);
    this.xyWrapper.appendChild(this.beginXY);
    this.xyWrapper.appendChild(this.endXY);
    this.xyWrapper.appendChild(clear);
    this.xyWrapper.appendChild(this.planetListContainer);

    this.userSelect = document.createElement('select');
    this.userSelect.style.background = 'rgb(8,8,8)';
    this.userSelect.style.padding = '5px';
    this.userSelect.style.marginLeft = '5px';
    this.userSelect.style.marginRight = '5px';
    this.userSelect.style.width = '50%';
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

      // deleteButton for remove pair from the list
      const delButton = document.createElement("button");
      this.planetListContainer.append(delButton);
      delButton.innerText = "Del";
      delButton.style.marginLeft = "10px";
      delButton.addEventListener("click", () => {
        for (let i=0; i<this.selectedPlanets.length; i++) {
          if (this.selectedPlanets[i] == planet) {
            this.selectedPlanets.splice(i, 1);
            break;
          }
        }
        this.renderPlanetList(this.planetListContainer);
      });

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

    ui.getAllPlayers().forEach(player => {
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
        return player.address === value || player.twitter === value;
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
    const x = planet.location.coords.x, y = planet.location.coords.y;
    const x_in_range = (x - this.beginCoords.x) * (x - this.endCoords.x) <= 0;
    const y_in_range = (y - this.beginCoords.y) * (y - this.endCoords.y) <= 0;
    return x_in_range && y_in_range;
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
        this.selectedPlanets = df.getMyPlanets().filter(p => this.isInSelection(p));
        this.renderPlanetList();
        return;
      }
    }
  }

  async render(container) {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('click', this.onClick);

    let selectWrapper = document.createElement('div');
    selectWrapper.style.marginBottom = '10px';

    let selectLabel = document.createElement('span');
    selectLabel.innerText = 'Select user:';

    let refreshButton = document.createElement('button');
    refreshButton.innerText = 'refresh';
    refreshButton.style.width = '20%';
    refreshButton.onclick = this.refreshUsers;

    selectWrapper.appendChild(selectLabel);
    selectWrapper.appendChild(this.userSelect);
    selectWrapper.appendChild(refreshButton);

    let inputWrapper = document.createElement('div');
    inputWrapper.style.marginBottom = '10px';

    let inputLabel = document.createElement('span');
    inputLabel.innerText = 'Or enter them:';

    inputWrapper.appendChild(inputLabel);
    inputWrapper.appendChild(this.userInput);

    let giftButton = document.createElement('button');
    giftButton.style.width = '100%';
    giftButton.innerText = 'Gift Selected Planets!';
    giftButton.onclick = this.giftPlanets;

    container.appendChild(this.xyWrapper);
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
