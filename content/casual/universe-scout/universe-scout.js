const {
  default: perlin,
} = await import('https://df-plugins.netlify.app/miner/perlin.js')

// Fake their enum
const SpaceType = {
  0: 'Nebula',
  1: 'Space',
  2: 'Deep Space',
}

// Fake their enum
const BiomeNames = [
  'Unknown',
  'Ocean',
  'Forest',
  'Grassland',
  'Tundra',
  'Swamp',
  'Desert',
  'Ice',
  'Wasteland',
  'Lava',
];

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
      let spacePerlin = perlin(coords);
      let sk = df.spaceTypeFromPerlin(spacePerlin);
      this.spaceType.innerHTML = `Space: ${SpaceType[sk]}`;
      // Biome perlin stuff
      let biomePerlin = perlin(coords, true, true);
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

plugin.register(new Plugin());
