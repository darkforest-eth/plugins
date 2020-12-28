// Fake their enums
const UpgradeBranchName = {
  Defense: 0,
  Range: 1,
  Speed: 2,
}

const SpaceType = {
  NEBULA: 0,
  SPACE: 1,
  DEEP_SPACE: 2,
}

let canStatUpgrade = (planet, stat) => {
  if (!planet) {
    return false;
  }
  // [defenseCan, rangeCan, speedCan]
  let canUpgrade = planet.upgradeState.map((level, i) => {
    if (
      i === UpgradeBranchName.Defense &&
      planet.spaceType === SpaceType.DEEP_SPACE
    )
      return level < 2;
    return level < 4;
  })

  return canUpgrade[stat];
}

const canUpgrade = (planet) => {
  if (!planet) {
    return false;
  }
  return df.entityStore.planetCanUpgrade(planet)
};

class Plugin {
  constructor() {
    this.selectedPlanet = ui.getSelectedPlanet();

    this.wrapper = document.createElement('div');
    this.wrapper.style.display = 'flex';
    this.wrapper.style.justifyContent = 'space-between';
  }

  upgrade = (branch) => {
    let planet = this.selectedPlanet;
    if (planet && canUpgrade(planet) && canStatUpgrade(planet, branch)) {
      df.upgrade(planet.locationId, branch)
    }
  }

  updateSelected = () => {
    this.selectedPlanet = ui.getSelectedPlanet();
    this.rerender()
  }

  renderDefense() {
    let branch = UpgradeBranchName.Defense;
    let wrapper = document.createElement('div');
    if (this.selectedPlanet) {
      let content = document.createElement('div');
      content.innerText = `Defense: ${this.selectedPlanet.upgradeState[branch]}`
      wrapper.appendChild(content);
    }
    let button = document.createElement('button');
    button.innerText = 'Defense';
    button.onclick = () => {
      console.log('upgrade')
      this.upgrade(branch);
    }
    if (!canUpgrade(this.selectedPlanet) || !canStatUpgrade(this.selectedPlanet, branch)) {
      button.disabled = true;
      button.style.opacity = '0.5';
    }
    wrapper.appendChild(button);
    this.wrapper.appendChild(wrapper);
  }

  renderRange() {
    let branch = UpgradeBranchName.Range;
    let wrapper = document.createElement('div');
    if (this.selectedPlanet) {
      let content = document.createElement('div');
      content.innerText = `Range: ${this.selectedPlanet.upgradeState[branch]}`
      wrapper.appendChild(content);
    }
    let button = document.createElement('button');
    button.innerText = 'Range';
    button.onclick = () => {
      console.log('upgrade')
      this.upgrade(branch);
    }
    if (!canUpgrade(this.selectedPlanet) || !canStatUpgrade(this.selectedPlanet, branch)) {
      button.disabled = true;
      button.style.opacity = '0.5';
    }
    wrapper.appendChild(button);
    this.wrapper.appendChild(wrapper);
  }

  renderSpeed() {
    let branch = UpgradeBranchName.Speed;
    let wrapper = document.createElement('div');
    if (this.selectedPlanet) {
      let content = document.createElement('div');
      content.innerText = `Speed: ${this.selectedPlanet.upgradeState[branch]}`
      wrapper.appendChild(content);
    }
    let button = document.createElement('button');
    button.innerText = 'Speed';
    button.onclick = () => {
      console.log('upgrade')
      this.upgrade(branch);
    }
    if (!canUpgrade(this.selectedPlanet) || !canStatUpgrade(this.selectedPlanet, branch)) {
      button.disabled = true;
      button.style.opacity = '0.5';
    }
    wrapper.appendChild(button);
    this.wrapper.appendChild(wrapper);
  }

  rerender() {
    this.wrapper.innerHTML = '';
    this.renderDefense();
    this.renderRange();
    this.renderSpeed();
  }

  render(container) {
    container.parentElement.style.minHeight = 'unset';
    container.style.width = '250px';
    container.style.minHeight = 'unset';

    window.addEventListener('click', this.updateSelected);

    this.rerender();

    container.appendChild(this.wrapper);
  }

  destroy() {
    window.removeEventListener('click', this.updateSelected);
  }
}

plugin.register(new Plugin());
