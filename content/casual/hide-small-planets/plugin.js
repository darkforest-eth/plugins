// Hide small planets
//
// This plugin overwrites the zoom based detail level of the map so that smaller planets can be hidden even on higher zoom levels.
// Planets with an owner are preferred. Everything goes back to normal when the plugin window is closed.
// Please note that small planets always flash for a second while zooming - didn't find a workaround for it yet.
// Hiding planets can also improve rendering performance especially with slower GPUs by reducing the number of draw calls.

class Plugin {
  constructor() {
    this.level = Math.max(0, ui.getDetailLevel() - 1);
    this.maxLevel = ui.gameManager.contractConstants.planetCumulativeRarities.length + 1;
  }

  getMinLevel() {
    return Math.min(this.maxLevel - 1, this.level);
  }

  getMinOwnerLevel() {
    return Math.max(0, this.level - 1);
  }

  async render(div) {
    // make the window as small as possible
    div.style.width = '350px';
    div.style.height = '30px';
    div.style.minHeight = '30px';
    div.parentNode.style.minHeight = '30px';

    const label = document.createElement('label');
    div.innerHTML = `
    <label>Min Level: <input type='range'
        value='${this.getMinLevel()}'
        min='0'
        max='${this.maxLevel}'
        step='1'
        style='transform: translateY(3px); margin: 0 10px;' />
      <span>${this.getMinLevel()} (Owner: ${this.getMinOwnerLevel()})</span>
    </label>`;

    this.value = div.querySelector('span');
    this.slider = div.querySelector('input');
    this.slider.addEventListener('input', this.inputHandler.bind(this));
  }

  inputHandler() {
    this.level = parseInt(this.slider.value, 10);
    this.value.innerHTML = `${this.getMinLevel()} (Owner: ${this.getMinOwnerLevel()})`;
  }

  draw(ctx) {
    const currentLevel = ui.getViewport().getDetailLevel();

    // only set when the level changed because of a map zoom
    if (currentLevel !== this.level) {
      ui.setDetailLevel(this.level);
    }
  }

  destroy() {
    this.slider.removeEventListener('input', this.inputHandler);
  }
}

export default Plugin;
