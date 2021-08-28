// Highlight Buffs
//
// Highlight all buffs (2x modifiers), also artifact locations and spacetime rips!
//
// author: https://twitter.com/davidryan59

import { PlanetType, PlanetLevel, PlanetLevelNames } from "https://cdn.skypack.dev/@darkforest_eth/types";

const PLUGIN_NAME = "Highlight Buffs";

// See Dark Forest Client, file: src/_types/global/GlobalTypes.ts/StatIdx
const StatIdx = {
  EnergyCap: 0,
  EnergyGro: 1,
  Range: 2,
  Speed: 3,
  Defense: 4,
}

// Make smaller planets visible at long range by making highlight bigger
// Additive for Fill, Multiplicative for Line
const DEFAULT_LEVEL_MIN = 2;  // default minimum level of planets to highlight
const DEFAULT_LEVEL_MAX = 9;  // default maximum level of planets to highlight
const BASE_LINE_WIDTH_PX = 1.0;
const LINE_WIDTH_PLANET_LEVEL_FACTOR = 0.5;
const EXTRA_RADIUS_CANVAS_PX_ADD = 2.0; 
const EXTRA_RADIUS_WORLD_PX_LINE_MULTIPLY = 1.15;
const EXTRA_RADIUS_WORLD_PX_PULSE_MULTIPLY = 1.30;
const ELLIPSE_FACTOR = 1.1;
const PULSES_PER_ROTATION = 3;  // Number of pulses for full rotation of the circular or elliptical arc
const CIRC_START_RAD = 0;
const CIRC_END_RAD = 2 * Math.PI;
const PULSE_FAST_FACTOR = 2;  // In fast mode, how much faster than normal mode

// If not pulsing alpha, use this constant alpha
const DEFAULT_ALPHA = 0.75;

// Desynchronises pulsing of separate planets using prime numbers multiplied by canvas coord components
const [DESYNC_X, DESYNC_Y] = [101, 103]

// Planet arrays are not highlighted if they have this constant as first element (and will be otherwise empty)
const TOGGLE_OFF = "TOGGLE_OFF";
const isToggledOn = (arr) => arr[0] !== TOGGLE_OFF;

// When hovering over / mouseover a button, it is normal brightness
// Otherwise dim it by subtracting this number of RGB points, min=0
const NON_HOVER_DIMMER = 15;
const getRgb = (arr, hover, invert=false) => {
  const [r, g, b] = arr.map(c => hover ? (invert ? 255-c : c) : Math.max(0, (invert ? 255-c : c) - NON_HOVER_DIMMER));
  return `rgb(${r}, ${g}, ${b})`
}

// Control default button RGB colours, for toggle off and on, and for background, text, and border
const buttonDefaultColours = {
  off: {
    bg: [50, 50, 50],
    text: [200, 200, 200],
    bord: [120, 120, 120],
  },
  on: {
    bg: [80, 80, 80],
    text: [230, 230, 230],
    bord: [200, 200, 200],
  }
};

// Set up 7 different highlights

// Pulsing period - use prime numbers to desynchronise flashing of any two buffs
const periodMsHighlightArtifact = 1201;  // want artifact the fastest
const periodMsHighlightRip = 1279;
const periodMsHighlight2xEnergyCap = 1361;
const periodMsHighlight2xEnergyGro = 1451;
const periodMsHighlight2xDefense = 1543;
const periodMsHighlight2xSpeed = 1657;
const periodMsHighlight2xRange = 1753;

// Set up colours for each of the highlights. Use similar colours to asteroid colour for 2x buffs.
const colsHighlight2xEnergyCap = [255, 160, 60];
const colsHighlight2xEnergyGro = [120, 255, 120];
const colsHighlight2xDefense = [180, 140, 255];
const colsHighlight2xSpeed = [255, 100, 255];
const colsHighlight2xRange = [225, 225, 80];
const colsHighlightRip = [80, 200, 255];
const colsHighlightArtifact = [255, 100, 100];

// Helper functions for filters
const prospectExpired = (plugin, planet) => {
  if (plugin.dateNow / 1000 > df.contractConstants.TOKEN_MINT_END_SECONDS) return true;  // Round has ended
  if (!planet.prospectedBlockNumber) return false;
  if (planet.hasTriedFindingArtifact) return false;
  return planet.prospectedBlockNumber + 255 - df.contractsAPI.ethConnection.blockNumber <= 0;  // 256 blocks to prospect an artifact
}
const levelInRange = (plugin, planet) => plugin.levelMinValue <= planet.planetLevel && planet.planetLevel <= plugin.levelMaxValue;
const filter2xStat = stat => (plugin, planet) => levelInRange(plugin, planet) && planet.bonus && planet.bonus[stat];

// Filters for each highlight type
const filter2xEnergyCap = filter2xStat(StatIdx.EnergyCap);
const filter2xEnergyGro = filter2xStat(StatIdx.EnergyGro);
const filter2xDefense = filter2xStat(StatIdx.Defense);
const filter2xSpeed = filter2xStat(StatIdx.Speed);
const filter2xRange = filter2xStat(StatIdx.Range);
const filterRip = (plugin, planet) => levelInRange(plugin, planet) && planet.planetType === PlanetType.TRADING_POST;
const filterArtifact = (plugin, planet) => {
  // Filter out planets of wrong size
  if (!levelInRange(plugin, planet)) return false;

  // Include any planet with an artifact circling (and is big enough)
  if (planet.heldArtifactIds.length > 0) return true;

  // Otherwise, only keep planet if it's a foundry (RUINS) that hasn't been mined yet, and hasn't expired
  return planet.planetType === PlanetType.RUINS
    && !(planet.hasTriedFindingArtifact || planet.unconfirmedFindArtifact)
    && !prospectExpired(plugin, planet);
};

let viewport = ui.getViewport();

const hrCreator = () => {
  let hr = document.createElement("hr");
  hr.style.margin = "7px 0px";
  hr.style.borderColor = "rgb(80, 80, 80)";
  return hr;
};

const labelCreator = (labelText, halfWidth=false) => {
  let label = document.createElement("label");
  label.style.display = "flex";
  label.style.width = halfWidth ? "125px" : "270px";
  label.style.margin = "3px 9px";
  label.innerText = labelText;
  return label;
};

const selectCreator = (initialValue, valueLabelArr, onChange) => {
  let select = document.createElement("select");
  let mouseOver = false;
  select.style.display = "inline";
  select.style.width = "135px";
  select.style.border = "1px solid";
  select.style.borderRadius = "6px";
  select.style.margin = "3px 3px";
  select.style.padding = "3px 3px";
  valueLabelArr.forEach(([value, label]) => {
    let option = document.createElement("option");
    option.value = `${value}`;
    option.innerText = label;
    select.appendChild(option);
  });
  const updateColours = () => {
    const colArrs = buttonDefaultColours.off;
    select.style.color = getRgb(colArrs.text, mouseOver);
    select.style.borderColor = getRgb(colArrs.bord, mouseOver);
    select.style.backgroundColor = getRgb(colArrs.bg, mouseOver);
  }
  updateColours();
  select.onmouseover = () => {
    mouseOver = true;
    updateColours();
  };
  select.onmouseleave = () => {
    mouseOver = false;
    updateColours();
  };
  select.onchange = () => {
    onChange();
    select.blur();
  }
  select.value = `${initialValue}`;
  return select;
};

const buttonCreator = (buttonText, onClickFn, initialToggleState=false, bgOverrideOn=false, invertTextOn=false, smallText=false) => {
  let button = document.createElement("button");
  let toggledOn = initialToggleState;
  let mouseOver = false;
  button.innerText = buttonText;
  button.style.display = "inline";
  button.style.width = "135px";
  button.style.border = "1px solid";
  button.style.borderRadius = "6px";
  button.style.margin = "3px 3px";
  if (smallText) button.style.fontSize = "85%";
  const setButtonColours = () => {
    const colArrs = toggledOn ? buttonDefaultColours.on : buttonDefaultColours.off;
    const bgCols = toggledOn && bgOverrideOn ? bgOverrideOn : colArrs.bg;
    button.style.color = getRgb(colArrs.text, mouseOver, invertTextOn && toggledOn);
    button.style.borderColor = getRgb(colArrs.bord, mouseOver);
    button.style.backgroundColor = getRgb(bgCols, mouseOver);
  };
  setButtonColours();
  button.onmouseover = () => {
    mouseOver = true;
    setButtonColours();
  };
  button.onmouseleave = () => {
    mouseOver = false;
    setButtonColours();
  };
  button.onclick = () => {
    toggledOn = !toggledOn;
    setButtonColours();
    onClickFn();
    button.blur();
  };
  return button;
};

const drawHighlights = (plugin, planetArr, colRgbArr, periodMs) => {
  const ctx = plugin.ctx;
  const timeMs = plugin.dateNow;
  const drawOptions = plugin.drawOptions;
  if (isToggledOn(planetArr)) {
    for (let planet of planetArr) {
      if (!planet.location) continue;
      let { x, y } = planet.location.coords;
      // Function to calculate pulse shape, to vary parameter by a triangle wave between 0 and 1
      const getSawWave01 = (item, defaultValue=0.5, slowFactor=1) => {
        if (!drawOptions[item].value) return defaultValue;
        const thisTimeMs = drawOptions.sync.value ? (timeMs / slowFactor) : (timeMs / slowFactor) + DESYNC_X * x + DESYNC_Y * y;  // Large number of seconds from 1970 (approx)
        const thisPeriodMs = drawOptions.pulseFast.value ? periodMs / PULSE_FAST_FACTOR : periodMs;  // Cycle Period, in ms
        return (thisTimeMs % thisPeriodMs) / thisPeriodMs;  // Sawtooth Wave, position in cycle, between 0 and 1
      }
      const getTriWave01 = (item, defaultValue=0.5) => {
        const sawWave01 = getSawWave01(item, defaultValue);
        return 2 * Math.min(sawWave01, 1 - sawWave01);  // Triangle Wave, between 0 and 1
      }
      const colAlpha = getTriWave01("pulseOpacity", DEFAULT_ALPHA);
      let radius = ui.getRadiusOfPlanetLevel(planet.planetLevel);
      const extraRadiusFactor = 1 + EXTRA_RADIUS_WORLD_PX_PULSE_MULTIPLY * getTriWave01("pulseRadius");
      if (!drawOptions.line.value) {
        ctx.fillStyle = `rgba(${"" + colRgbArr[0]}, ${"" + colRgbArr[1]}, ${"" + colRgbArr[2]}, ${"" + colAlpha})`;
      } else {
        ctx.strokeStyle = `rgba(${"" + colRgbArr[0]}, ${"" + colRgbArr[1]}, ${"" + colRgbArr[2]}, ${"" + colAlpha})`;
        radius *= EXTRA_RADIUS_WORLD_PX_LINE_MULTIPLY;
        ctx.lineWidth = (BASE_LINE_WIDTH_PX + LINE_WIDTH_PLANET_LEVEL_FACTOR * planet.planetLevel) * (0.5 + getTriWave01("pulseLineWidth"));
        if (drawOptions.lineDashed.value) {
          ctx.setLineDash([5, 3]);
        } else {
          ctx.setLineDash([]);
        }
      }
      ctx.beginPath();
      const cX = viewport.worldToCanvasX(x);
      const cY = viewport.worldToCanvasY(y);
      const cR = extraRadiusFactor * (viewport.worldToCanvasDist(radius) + EXTRA_RADIUS_CANVAS_PX_ADD);
      const rotationRad = CIRC_END_RAD * getSawWave01("line", 0, PULSES_PER_ROTATION);
      if (drawOptions.ellipse.value && ctx.ellipse) {
        const cR1 = cR / ELLIPSE_FACTOR;
        const cR2 = cR * ELLIPSE_FACTOR;
        ctx.ellipse(cX, cY, cR1, cR2, rotationRad, CIRC_START_RAD, CIRC_END_RAD);  
      } else {
        ctx.arc(cX, cY, cR, CIRC_START_RAD + rotationRad, CIRC_END_RAD + rotationRad);  
      }
      if (drawOptions.line.value) {
        ctx.stroke();
      } else {
        ctx.fill();
      }
      ctx.closePath();
    }
  }
}

class Plugin {
  constructor() {
    this.ctx = null;
    this.dateNow = Date.now();
    this.levelMinValue = DEFAULT_LEVEL_MIN;
    this.levelMaxValue = DEFAULT_LEVEL_MAX;
    this.levelMinSelect = null;
    this.levelMaxSelect = null;
    this.drawOptions = {
      ellipse: {value: false, label: "Ellipse"},
      pulseOpacity: {value: true, label: "Pulse Opacity"},
      line: {value: true, label: "Line"},
      pulseRadius: {value: true, label: "Pulse Radius"},
      lineDashed: {value: false, label: "Line Dashed"},
      pulseLineWidth: {value: true, label: "Pulse Line Width"},
      sync: {value: false, label: "Sync Pulses"},
      pulseFast: {value: false, label: "Pulse Fast"},
    }
    this.drawOptionList = Object.keys(this.drawOptions);
    this.highlightData = {
      planetsWithArtifact: {label: "Artifacts", filter: filterArtifact, array: [TOGGLE_OFF], periodMs: periodMsHighlightArtifact, cols: colsHighlightArtifact},
      planetsWithRip: {label: "Spacetime Rips", filter: filterRip, array: [TOGGLE_OFF], periodMs: periodMsHighlightRip, cols: colsHighlightRip},
      planetsWith2xDefense: {label: "2x Defense", filter: filter2xDefense, array: [TOGGLE_OFF], periodMs: periodMsHighlight2xDefense, cols: colsHighlight2xDefense},
      planetsWith2xEnergyCap: {label: "2x Energy Cap", filter: filter2xEnergyCap, array: [TOGGLE_OFF], periodMs: periodMsHighlight2xEnergyCap, cols: colsHighlight2xEnergyCap},
      planetsWith2xSpeed: {label: "2x Speed", filter: filter2xSpeed, array: [TOGGLE_OFF], periodMs: periodMsHighlight2xSpeed, cols: colsHighlight2xSpeed},
      planetsWith2xEnergyGro: {label: "2x Energy Gro", filter: filter2xEnergyGro, array: [TOGGLE_OFF], periodMs: periodMsHighlight2xEnergyGro, cols: colsHighlight2xEnergyGro},
      planetsWith2xRange: {label: "2x Range", filter: filter2xRange, array: [TOGGLE_OFF], periodMs: periodMsHighlight2xRange, cols: colsHighlight2xRange},
    };
    this.highlightList = Object.keys(this.highlightData);
  }

  // Toggle individual draw options on or off
  toggleDrawOption = key => {
    this.drawOptions[key].value = !this.drawOptions[key].value;
  };

  updateLevelValues = () => {
    this.levelMinValue = parseInt(this.levelMinSelect.value, 10);
    this.levelMaxValue = parseInt(this.levelMaxSelect.value, 10);
  };

  logHighlight = (label, count) => {
    console.log(`${PLUGIN_NAME} plugin: highlighted ${count} of ${label}`);
  }

  // Recalculate all highlights, keep each state
  recalcAllHighlights = () => {
    this.updateLevelValues();
    this.highlightList.forEach(key => {
      const obj = this.highlightData[key];
      const arr = obj.array;
      const filterFn = obj.filter;
      if (isToggledOn(arr)) {
        // Recalc On
        arr.length = 0;
        for (let planet of df.getAllPlanets()) {
          if (filterFn(this, planet)) arr.push(planet);
        }
        this.logHighlight(obj.label, arr.length);
      } else {
        // Recalc Off
        arr.length = 0;
        arr[0] = TOGGLE_OFF;
      }
    })
  };

  // Recalculate specific highlight, toggle its state
  toggleHighlight = key => {
    this.updateLevelValues();
    const obj = this.highlightData[key];
    const arr = obj.array;
    const filterFn = obj.filter;
    if (isToggledOn(arr)) {
      // Toggle to Off
      arr.length = 0;  // Keep array object, but make it empty
      arr[0] = TOGGLE_OFF;
    } else {
      // Toggle to On
      arr.length = 0;
      for (let planet of df.getAllPlanets()) {
        if (filterFn(this, planet)) arr.push(planet);
      }
      this.logHighlight(obj.label, arr.length);
    }
  };

  render(container) {
    container.parentElement.style.minHeight = "unset";
    container.style.minHeight = "unset";
    container.style.width = "300px";

    const levelValueLabelArr = Object.values(PlanetLevel).map( lvl => [lvl, PlanetLevelNames[lvl]]);
    let levelMinSelect = selectCreator(this.levelMinValue, levelValueLabelArr, this.recalcAllHighlights);
    let levelMaxSelect = selectCreator(this.levelMaxValue, levelValueLabelArr, this.recalcAllHighlights);
    this.levelMinSelect = levelMinSelect;
    this.levelMaxSelect = levelMaxSelect;

    let levelDiv = document.createElement("div");
    levelDiv.style.display = "flex";
    const halfWidth = true;
    levelDiv.appendChild(labelCreator("Min. level:", halfWidth));
    levelDiv.appendChild(labelCreator("Max. level:", halfWidth));
    container.appendChild(levelDiv);
    container.appendChild(levelMinSelect);
    container.appendChild(levelMaxSelect);

    container.appendChild(hrCreator());

    container.appendChild(labelCreator("Buffs to highlight:"));
    this.highlightList.forEach(key => {
      const obj = this.highlightData[key];
      const buttonText = obj.label;
      const onClickFn = () => this.toggleHighlight(key);
      const initialToggleState = isToggledOn(obj.array);
      const bgOverrideOn = obj.cols;
      const invertTextOn = true;
      const smallText = false;
      container.appendChild(buttonCreator(buttonText, onClickFn, initialToggleState, bgOverrideOn, invertTextOn, smallText));
    })

    container.appendChild(hrCreator());

    container.appendChild(labelCreator("Display options:"));
    this.drawOptionList.forEach(key => {
      const obj = this.drawOptions[key];
      const buttonText = obj.label;
      const onClickFn = () => this.toggleDrawOption(key);
      const initialToggleState = obj.value;
      const bgOverrideOn = false;
      const invertTextOn = false;
      const smallText = true;
      container.appendChild(buttonCreator(buttonText, onClickFn, initialToggleState, bgOverrideOn, invertTextOn, smallText));
    })
  }

  draw(ctx) {
    ctx.save();
    this.ctx = ctx;
    this.dateNow = Date.now();
    this.highlightList.forEach(key => {
      const obj = this.highlightData[key];
      drawHighlights(this, obj.array, obj.cols, obj.periodMs);
    })
    ctx.restore();
  }

  destroy() {}
}

export default Plugin;
