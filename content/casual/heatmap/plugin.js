// Heatmap
//
// The heatmap plugin highlights enemy territories on the board.
// For each planet a semi transparent circle in the color of the owner and the size of the planet's range is rendered.

import { EMPTY_ADDRESS } from "https://cdn.skypack.dev/@darkforest_eth/constants";

class Plugin {
  constructor() {
    this.rangePercent = 10;
    this.alpha = 0;
    this.globalAlpha = 1;
    this.hueCache = {};
    this.rangeHandler = this.rangeHandler.bind(this);
    this.alphaHandler = this.alphaHandler.bind(this);
    this.globalAlphaHandler = this.globalAlphaHandler.bind(this);
  }

  getHue(address) {
    if (this.hueCache[address]) {
      return this.hueCache[address];
    }

    // color code modified from https://github.com/darkforest-eth/client/blob/00e1d9361c4d49dcf09b130617738ec798bc059d/src/utils/Utils.ts
    const hash = address.slice(2);
    let seed = (BigInt(address) & BigInt(0xffffff)).toString(16);
    seed = '0x' + '0'.repeat(6 - seed.length) + seed;
    const hue = parseInt(seed) % 360;

    this.hueCache[address] = hue;
    return hue;
  }

  getSliderHtml(className, text, min, max, step, value) {
    return `<label class='${className}'>
      <div style='display: inline-block; min-width: 120px'>${text}</div><input type='range'
          value='${value}'
          min='${min}'
          max='${max}'
          step='${step}'
          style='transform: translateY(3px); margin: 0 10px;' />
        <span>${value}</span>
      </label>`;
  }

  async render(div) {
    div.style.width = '310px';
    div.style.height = '75px';
    div.style.minHeight = '75px';

    const label = document.createElement('label');
    div.innerHTML = [
      this.getSliderHtml('range', 'Planet Range:', 1, 100, 1, this.rangePercent),
      this.getSliderHtml('alpha', 'Gradient Alpha:', 0, 1, 0.01, this.alpha),
      this.getSliderHtml('globalAlpha', 'Global Alpha:', 0, 1, 0.01, this.globalAlpha)
    ].join('<br />');

    this.valueRange = div.querySelector('label.range span');
    this.sliderRange = div.querySelector('label.range input');
    this.sliderRange.addEventListener('input', this.rangeHandler);

    this.valueAlpha = div.querySelector('label.alpha span');
    this.sliderAlpha = div.querySelector('label.alpha input');
    this.sliderAlpha.addEventListener('input', this.alphaHandler);

    this.valueGlobalAlpha = div.querySelector('label.globalAlpha span');
    this.sliderGlobalAlpha = div.querySelector('label.globalAlpha input');
    this.sliderGlobalAlpha.addEventListener('input', this.globalAlphaHandler);
  }

  rangeHandler() {
    this.rangePercent = parseInt(this.sliderRange.value);
    this.valueRange.innerHTML = `${this.sliderRange.value}%`;
  }

  alphaHandler() {
    this.alpha = parseFloat(this.sliderAlpha.value);
    this.valueAlpha.innerHTML = `${this.sliderAlpha.value}`;
  }

  globalAlphaHandler() {
    this.globalAlpha = parseFloat(this.sliderGlobalAlpha.value);
    this.valueGlobalAlpha.innerHTML = `${this.sliderGlobalAlpha.value}`;
  }

  draw(ctx) {
    const origGlobalAlpha = ctx.globalAlpha;
    const origFillStyle = ctx.fillStyle;
    const origSrokeStyle = ctx.strokeStyle;
    const viewport = ui.getViewport();
    const planets = ui.getPlanetsInViewport();

    // paint bigger ones first
    planets.sort((a, b) => b.range - a.range);

    for (const p of planets) {
      if (p.owner === EMPTY_ADDRESS) {
        continue;
      }

      // draw range circle
      const { x, y } = viewport.worldToCanvasCoords(p.location.coords);
      const hue = this.getHue(p.owner);
      const lightness = p.owner === df.account ? 100 : 70; // paint own planets in white

      // range from here: https://github.com/darkforest-eth/client/blob/00e1d9361c4d49dcf09b130617738ec798bc059d/src/app/renderer/entities/UIRenderManager.ts
      const fac = Math.max(0, Math.log2(this.rangePercent / 5));
      const range = fac * p.range;
      const trueRange = viewport.worldToCanvasDist(range);

      ctx.globalAlpha = this.globalAlpha;
      ctx.beginPath();
      ctx.arc(x, y, trueRange, 0, 2 * Math.PI);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, trueRange);
      gradient.addColorStop(0, `hsla(${hue},100%,${lightness}%, 1)`);
      gradient.addColorStop(1, `hsla(${hue},100%,${lightness}%, ${this.alpha})`);
      ctx.fillStyle = gradient;
      ctx.fill();

      // reset ctx
      ctx.fillStyle = origFillStyle;
      ctx.strokeStyle = origSrokeStyle;
      ctx.globalAlpha = origGlobalAlpha;
    }
  }

  destroy() {
    this.sliderRange.removeEventListener('input', this.rangeHandler);
    this.sliderAlpha.removeEventListener('input', this.alphaHandler);
    this.sliderGlobalAlpha.removeEventListener('input', this.globalAlphaHandler);
  }
}

export default Plugin;
