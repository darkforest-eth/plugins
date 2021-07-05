// Gift Empire
// Give your entire empire away.

let hasArtifact = (planet) => planet.heldArtifactId != null;
let canHaveArtifact = (planet) => {
  return df.isPlanetMineable(planet) && !planet.hasTriedFindingArtifact
}

class Plugin {
  constructor() {
    this.artifactCheckbox = document.createElement('input');
    this.artifactCheckbox.type = 'checkbox';
    this.artifactCheckbox.style.marginLeft = 'auto';

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

  giftPlanet = (planet) => {
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

    if (this.userInput.value) {
      let value = this.userInput.value.startsWith('@') ? this.userInput.value.slice(1) : this.userInput.value;
      let player = ui.getAllPlayers().find(player => {
        return player.address === value || player.twitter === value;
      });
      if (!player) {
        this.feedback.innerText = `Unable to find that user.`;
        this.feedback.style.color = 'red';
        return;
      }
      df.transferOwnership(planet.locationId, player.address);
      return;
    }

    if (this.userSelect.value) {
      df.transferOwnership(planet.locationId, this.userSelect.value);
    }
  }

  giftEmpire = () => {
    for (let planet of df.getMyPlanets()) {
      if (hasArtifact(planet) || canHaveArtifact(planet)) {
        if (!this.artifactCheckbox.checked) {
          console.log('Keeping:', planet);
          continue;
        }
      }
      this.giftPlanet(planet);
    }

    this.feedback.innerText = `Empire transferred!`;
    this.feedback.style.color = 'green';
  }

  async render(container) {
    let artifactWrapper = document.createElement('div');
    artifactWrapper.style.marginBottom = '10px';
    artifactWrapper.style.display = 'flex';

    let artifactLabel = document.createElement('span');
    artifactLabel.innerText = 'Gift planets with artifacts?';

    artifactWrapper.appendChild(artifactLabel);
    artifactWrapper.appendChild(this.artifactCheckbox);

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
    giftButton.innerText = 'Gift Empire!';
    giftButton.onclick = this.giftEmpire;

    container.appendChild(artifactWrapper);
    container.appendChild(selectWrapper);
    container.appendChild(inputWrapper);
    container.appendChild(this.feedback);
    container.appendChild(giftButton);
  }
}

export default Plugin;
