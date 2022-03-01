// Highlight my planets
//
// The highlight my planets plugin help you find your small planets.
// (Thanks to Heatmap plugin)

const defaultSettings = {
  version: 1,
  highlightStyle: 0,
  rangePercent: 8,
  alpha: 0,
  globalAlpha: 1,
  ownColor: '#ffffff'
}

const SettingsStorage = {
  key: 'highlight-my-planets.settings',
  read() {
    const value = localStorage.getItem(this.key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch (error) {
        console.log(`Failed to parse ${this.key} from localstorage`);
        localStorage.removeItem(this.key);
      }
    }

    return defaultSettings;
  },
  save(settings) {
    localStorage.setItem(this.key, JSON.stringify(settings));
  }
}

class Plugin {
  constructor() {
    this.settings = SettingsStorage.read();
    console.log(this.settings);

    this.highlightStyleHandler = this.highlightStyleHandler.bind(this);
    this.rangeHandler = this.rangeHandler.bind(this);
    this.alphaHandler = this.alphaHandler.bind(this);
    this.globalAlphaHandler = this.globalAlphaHandler.bind(this);
    this.ownColorHandler = this.ownColorHandler.bind(this);
    this.useDefaultsHandler = this.useDefaultsHandler.bind(this);
  }

  hexToHsl(H) {
    let r = 0, g = 0, b = 0;
    if (H.length == 4) {
      r = '0x' + H[1] + H[1]; g = '0x' + H[2] + H[2]; b = '0x' + H[3] + H[3];
    } else if (H.length == 7) {
      r = '0x' + H[1] + H[2]; g = '0x' + H[3] + H[4]; b = '0x' + H[5] + H[6];
    }
    r /= 255; g /= 255; b /= 255;
    let cmin = Math.min(r, g, b),
      cmax = Math.max(r, g, b),
      delta = cmax - cmin,
      h = 0, s = 0, l = 0;
  
    if (delta == 0) h = 0;
    else if (cmax == r) h = ((g - b) / delta) % 6;
    else if (cmax == g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  
    h = Math.round(h * 60);
  
    if (h < 0) h += 360;
  
    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);
    
    return [h + ', ' + s + '%, ' + l + '%'];
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

  getColorPicker(className, text, value) {
    return `<label class='${className}'>
      <div style='display: inline-block; min-width: 120px'>${text}</div><input type='color' 
          value='${value}'
          style='transform: translateY(3px); margin: 0 10px;' />
      </label>`;
  }

  getSelect(className, text, items, selectedValue) {

    return `<label class='${className}'>
      <div style='display: inline-block; min-width: 120px'>${text}</div>
        <select style='background: rgb(8,8,8); margin-top: 5px; padding: 3px 5px; border: 1px solid white; border-radius: 3px;' 
          value=${selectedValue}
        >
          ${items.map(
            ({ value, text }) => (
              value === selectedValue
                ? `<option value=${value} selected="selected">${text}</option>`
                : `<option value=${value}>${text}</option>`
            )
          )}
        </select>
      </label>`;
  }

  getUseDefaultsButton(className, text) {
    return `<br /><div class="content"><df-row><df-shortcut-button class="${className}">${text}</df-shortcut-button></df-row></div>`;
  }

  async render(div) {
    div.style.width = '330px';
    //div.style.height = '100px';
    //div.style.minHeight = '100px';

    div.innerHTML = [
      this.getColorPicker('ownColor', 'Color:', this.settings.ownColor),
      this.getSelect('highlight', 'Highlight:', [{value: 0, text: "Heatmap"}, {value: 1, text: "Circle"}], this.settings.highlightStyle),
      this.getSliderHtml('range', 'Planet Range:', 1, 100, 1, this.settings.rangePercent),
      this.getSliderHtml('alpha', 'Gradient Alpha:', 0, 1, 0.01, this.settings.alpha),
      this.getSliderHtml('globalAlpha', 'Global Alpha:', 0, 1, 0.01, this.settings.globalAlpha),
      this.getUseDefaultsButton('useDefaults', 'Use Defaults')
    ].join('<br />');

    this.selectHighlightStyle = div.querySelector('label.highlight select');
    this.selectHighlightStyle.addEventListener('change', this.highlightStyleHandler);

    this.valueRange = div.querySelector('label.range span');
    this.sliderRange = div.querySelector('label.range input');
    this.sliderRange.addEventListener('input', this.rangeHandler);

    this.valueAlpha = div.querySelector('label.alpha span');
    this.sliderAlpha = div.querySelector('label.alpha input');
    this.sliderAlpha.addEventListener('input', this.alphaHandler);

    this.valueGlobalAlpha = div.querySelector('label.globalAlpha span');
    this.sliderGlobalAlpha = div.querySelector('label.globalAlpha input');
    this.sliderGlobalAlpha.addEventListener('input', this.globalAlphaHandler);

    this.colorPickerOwnColor = div.querySelector('label.ownColor input');
    this.colorPickerOwnColor.addEventListener('input', this.ownColorHandler);
    
    this.useDefaultsButton = div.querySelector('df-shortcut-button.useDefaults');
    this.useDefaultsButton.addEventListener('click', this.useDefaultsHandler)
    this.highlightStyleHandler();
  }

  highlightStyleHandler() {
    this.settings.highlightStyle = Number(this.selectHighlightStyle.value);
    
    const displayMode = this.settings.highlightStyle === 0
      ? 'inline-block'
      : 'none';
    document.querySelector('label.alpha').style.display = displayMode;
    document.querySelector('label.range').style.display = displayMode;
    document.querySelector('label.globalAlpha').style.display = displayMode;
  }

  rangeHandler() {
    this.settings.rangePercent = parseInt(this.sliderRange.value);
    this.valueRange.innerHTML = `${this.sliderRange.value}%`;
  }

  alphaHandler() {
    this.settings.alpha = parseFloat(this.sliderAlpha.value);
    this.valueAlpha.innerHTML = `${this.sliderAlpha.value}`;
  }

  globalAlphaHandler() {
    this.settings.globalAlpha = parseFloat(this.sliderGlobalAlpha.value);
    this.valueGlobalAlpha.innerHTML = `${this.sliderGlobalAlpha.value}`;
  }

  ownColorHandler() {
    this.settings.ownColor = this.colorPickerOwnColor.value;
  }

  useDefaultsHandler() {
    console.log('use defaults...');
    this.sliderRange.value = defaultSettings.rangePercent;
    this.sliderRange.dispatchEvent(new Event('input'));

    this.sliderAlpha.value = defaultSettings.alpha;
    this.sliderAlpha.dispatchEvent(new Event('input'));

    this.sliderGlobalAlpha.value = defaultSettings.globalAlpha;
    this.sliderGlobalAlpha.dispatchEvent(new Event('input'));

    this.colorPickerOwnColor.value = defaultSettings.ownColor;
    this.colorPickerOwnColor.dispatchEvent(new Event('input'));

    this.selectHighlightStyle.value = defaultSettings.highlightStyle.toString();
    this.selectHighlightStyle.dispatchEvent(new Event('change'));
  }

  draw(ctx) {
    const origGlobalAlpha = ctx.globalAlpha;
    const origFillStyle = ctx.fillStyle;
    const origSrokeStyle = ctx.strokeStyle;
    const viewport = ui.getViewport();
    const planets = df.getMyPlanets();
    const settings = this.settings;

    // paint bigger ones first
    // planets.sort((a, b) => b.range - a.range);

    if (settings.highlightStyle === 0) for (const p of planets) {

      // draw range circle
      const { x, y } = viewport.worldToCanvasCoords(p.location.coords);
      const hsl = this.hexToHsl(settings.ownColor);

      const fac = Math.max(0, Math.log2(settings.rangePercent / 5));
      const range = fac * p.range;
      const trueRange = viewport.worldToCanvasDist(range);

      ctx.globalAlpha = settings.globalAlpha;
      ctx.beginPath();
      ctx.arc(x, y, trueRange, 0, 2 * Math.PI);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, trueRange);
      gradient.addColorStop(0, `hsla(${hsl}, 1)`);
      gradient.addColorStop(1, `hsla(${hsl}, ${settings.alpha})`);   
      ctx.fillStyle = gradient;
      ctx.fill();

      // reset ctx
      ctx.fillStyle = origFillStyle;
      ctx.strokeStyle = origSrokeStyle;
      ctx.globalAlpha = origGlobalAlpha;
    } else {

      ctx.fillStyle = settings.ownColor;
      ctx.strokeStyle = settings.ownColor;
      
      for (let planet of planets) {
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
    }
  }

  destroy() {
    this.selectHighlightStyle.removeEventListener('select', this.highlightStyleHandler);
    this.sliderRange.removeEventListener('input', this.rangeHandler);
    this.sliderAlpha.removeEventListener('input', this.alphaHandler);
    this.sliderGlobalAlpha.removeEventListener('input', this.globalAlphaHandler);
    SettingsStorage.save(this.settings);
  }
  
}

export default Plugin;