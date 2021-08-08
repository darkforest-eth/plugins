// Universe Scout
//
// The universe scout plugin launches a modal that shows you the coordinates,
// space type, and biome of your mouse as you hover (even for unexplored
// space!).

import {
  SpaceTypeNames,
  BiomeNames
} from "https://cdn.skypack.dev/@darkforest_eth/types";

class Plugin {
  constructor() {
    this.el = document.createElement('div');
    this.description = document.createElement('div');
    this.description.innerHTML = 'Hovering over:'
    this.coords = document.createElement('div');
    this.coords.innerHTML = '(???, ???)';
    this.spaceType = document.createElement('div');
    this.spaceType.innerHTML = 'Space: ???';
    this.biome = document.createElement('div');
    this.biome.innerHTML = 'Biome: ???';

    this.el.appendChild(this.description);
    this.el.appendChild(this.coords);
    this.el.appendChild(this.spaceType);
    this.el.appendChild(this.biome);
  }

  onMouseMove = () => {
    let coords = ui.getHoveringOverCoords();
    if (coords) {
      this.coords.innerHTML = `(${coords.x}, ${coords.y})`
      // Space perlin stuff
      let spacePerlin = df.spaceTypePerlin(coords, true);
      let sk = df.spaceTypeFromPerlin(spacePerlin);
      this.spaceType.innerHTML = `Space: ${SpaceTypeNames[sk]}`;
      // Biome perlin stuff
      let biomePerlin = df.biomebasePerlin(coords, true);
      let fakeLoc = {
        coords,
        perlin: spacePerlin,
        biomebase: biomePerlin,
      };
      let biome = df.entityStore.getBiome(fakeLoc);
      this.biome.innerHTML = `Biome: ${BiomeNames[biome]}`;
    }
  }
  async render(container) {
    container.style.width = '160px';

    container.appendChild(this.el);

    window.addEventListener('mousemove', this.onMouseMove);
  }

  destroy() {
    window.removeEventListener('mousemove', this.onMouseMove);
  }
}

export default Plugin;
