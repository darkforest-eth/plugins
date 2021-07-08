// Gift Planet
// Easily transfer planets to others.

class Plugin {
  constructor() {
    this.selectedPlanet = null;

    this.planetEl = document.createElement('span');
    this.planetEl.style.marginLeft = '5px';
    this.setSelectedPlanet();

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

  setSelectedPlanet = () => {
    let planet = ui.getSelectedPlanet();
    if (planet) {
      this.selectedPlanet = planet;
      this.planetEl.innerText = planet.locationId.substring(5, 10);
    } else {
      this.selectedPlanet = null;
      this.planetEl.innerText = 'No planet selected';
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

  giftPlanet = () => {
    this.feedback.innerText = '';
    this.feedback.style.color = 'white';

    if (!this.selectedPlanet) {
      this.feedback.innerText = 'No planet selected.';
      this.feedback.style.color = 'red';
      return
    }

    if (this.selectedPlanet.owner !== df.account) {
      this.feedback.innerText = `You don't own that planet.`
      this.feedback.style.color = 'red';
      return;
    }

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
      })
      if (!player) {
        this.feedback.innerText = `Unable to find that user.`;
        this.feedback.style.color = 'red';
        return;
      }
      df.transferOwnership(this.selectedPlanet.locationId, player.address);

      this.feedback.innerText = `Planet transferred!`;
      this.feedback.style.color = 'green';
      return;
    }

    if (this.userSelect.value) {
      df.transferOwnership(this.selectedPlanet.locationId, this.userSelect.value);
      this.feedback.innerText = `Planet transferred!`;
      this.feedback.style.color = 'green';
    }
  }

  async render(container) {
    window.addEventListener('click', this.setSelectedPlanet)

    let planetWrapper = document.createElement('div');
    planetWrapper.style.marginBottom = '10px';

    let planetLabel = document.createElement('span');
    planetLabel.innerText = 'Selected planet:';

    planetWrapper.appendChild(planetLabel);
    planetWrapper.appendChild(this.planetEl);

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
    giftButton.innerText = 'Gift Planet!';
    giftButton.onclick = this.giftPlanet;

    container.appendChild(planetWrapper);
    container.appendChild(selectWrapper);
    container.appendChild(inputWrapper);
    container.appendChild(this.feedback);
    container.appendChild(giftButton);
  }

  destroy() {
    window.removeEventListener('click', this.setSelectedPlanet);
  }
}

export default Plugin;
