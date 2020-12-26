const {
  MinerManager,
  MinerManagerEvent
} = await import('https://df-plugins.netlify.app/game/MinerManager.js');
const {
  SpiralPattern
} = await import('https://df-plugins.netlify.app/game/SpiralPattern.js');
const {
  SwissCheesePattern
} = await import('https://df-plugins.netlify.app/game/SwissCheesePattern.js');
const {
  RemoteWorker
} = await import('https://df-plugins.netlify.app/miner/RemoteWorker.js');
const {
  html,
  render,
  useState,
  useEffect,
  useLayoutEffect
} = await import('https://unpkg.com/htm/preact/standalone.module.js');

const NEW_CHUNK = MinerManagerEvent.DiscoveredNewChunk;

function getPattern(coords, patternType, chunkSize) {
  if (patternType === 'swiss') {
    return new SwissCheesePattern(coords, chunkSize);
  } else {
    return new SpiralPattern(coords, chunkSize);
  }
}

function Target() {

  const wrapper = {
    width: '1em',
    height: '1em',
    display: 'inline-block',
    position: 'relative',
    verticalAlign: 'text-bottom',
  };

  const svg = {
    width: '100%',
    height: '100%',
  };

  const path = {
    fill: 'white'
  };

  return html`
    <span style=${wrapper}>
      <svg style=${svg} version="1.1" xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
        <path style=${path} d="M512 224h-50.462c-13.82-89.12-84.418-159.718-173.538-173.538v-50.462h-64v50.462c-89.12 13.82-159.718 84.418-173.538 173.538h-50.462v64h50.462c13.82 89.12 84.418 159.718 173.538 173.538v50.462h64v-50.462c89.12-13.82 159.718-84.418 173.538-173.538h50.462v-64zM396.411 224h-49.881c-9.642-27.275-31.255-48.889-58.53-58.53v-49.881c53.757 12.245 96.166 54.655 108.411 108.411zM256 288c-17.673 0-32-14.327-32-32s14.327-32 32-32c17.673 0 32 14.327 32 32s-14.327 32-32 32zM224 115.589v49.881c-27.275 9.641-48.889 31.255-58.53 58.53h-49.881c12.245-53.756 54.655-96.166 108.411-108.411zM115.589 288h49.881c9.641 27.275 31.255 48.889 58.53 58.53v49.881c-53.756-12.245-96.166-54.654-108.411-108.411zM288 396.411v-49.881c27.275-9.642 48.889-31.255 58.53-58.53h49.881c-12.245 53.757-54.654 96.166-108.411 108.411z"></path>
      </svg>
    </span>
  `;
}

function MinerUI({ miner, onRemove }) {
  const [hashRate, setHashRate] = useState(0);

  // No idea why useEffect doesn't run
  useLayoutEffect(() => {
    const calcHash = (chunk, miningTimeMillis) => {
      df.addNewChunk(chunk);
      const hashRate = chunk.chunkFootprint.sideLength ** 2 / (miningTimeMillis / 1000);
      setHashRate(Math.floor(hashRate));

      const res = miner.getCurrentlyExploringChunk();
      if (res) {
        const { bottomLeft, sideLength } = res;
        ui?.setExtraMinerLocation?.(miner.id, {
          x: bottomLeft.x + sideLength / 2,
          y: bottomLeft.y + sideLength / 2,
        });
      } else {
        ui?.removeExtraMinerLocation?.(miner.id);
      }
    }
    miner.on(NEW_CHUNK, calcHash);

    return () => {
      miner.off(NEW_CHUNK, calcHash);
    }
  }, [miner]);

  const wrapper = {
    paddingBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    whiteSpace: 'nowrap',
  };

  const buttonWrapper = {
    width: '50px',
    display: 'flex',
    justifyContent: 'space-between',
  };

  let remove = () => {
    onRemove(miner);
  }

  let [targeting, setTargeting] = useState(false);
  let target = () => setTargeting(true);

  useEffect(() => {
    let hover = () => {
      ui?.setExtraMinerLocation?.(miner.id, ui.getHoveringOverCoords())
    };
    let click = () => {
      window.removeEventListener('mousemove', hover);
      window.removeEventListener('click', click);
      const pattern = getPattern(
        ui.getHoveringOverCoords(),
        miner.patternType,
        miner.chunkSize
      );
      miner.setMiningPattern(pattern);
      miner.startExplore();
      setTargeting(false);
    }
    if (targeting) {
      miner.stopExplore();
      window.addEventListener('mousemove', hover);
      window.addEventListener('click', click);
    }

    return () => {
      window.removeEventListener('mousemove', hover)
      window.removeEventListener('click', click)
    }
  }, [targeting])

  return html`
    <div style=${wrapper}>
      <span>${miner.url} - ${hashRate} hashes/sec</span>
      <div style=${buttonWrapper}>
        <button onClick=${target}><${Target} /></button>
        <button onClick=${remove}>X</button>
      </div>
    </div>
  `;
}

function App({ initialMiners = [], addMiner, removeMiner }) {
  const wrapper = { display: 'flex' };
  const input = {
    flex: '1',
    padding: '5px',
    outline: 'none',
    color: 'black',
  };
  const button = {
    marginLeft: '5px',
    outline: 'none',
  };
  const select = {
    background: 'rgb(8,8,8)',
  };
  const [miners, setMiners] = useState(initialMiners);
  const [nextUrl, setNextUrl] = useState(null);
  const [patternType, setPatternType] = useState('spiral');

  const onChange = (evt) => {
    setNextUrl(evt.target.value)
  }

  const add = () => {
    const miners = addMiner(nextUrl, patternType, 16);
    setMiners(miners);
    setNextUrl(null);
  }

  const remove = (miner) => {
    const miners = removeMiner(miner);
    setMiners(miners);
  }

  const changePattern = (evt) => {
    setPatternType(evt.target.value);
  }

  return html`
    <div>
      ${miners.map(miner => html`
        <${MinerUI}
          key=${miner.url}
          miner=${miner}
          onRemove=${remove} />
      `)}
      <div style=${wrapper}>
        <input
          style=${input}
          value=${nextUrl}
          onChange=${onChange}
          placeholder="URL for explore server" />
        <select style=${select} value=${patternType} onChange=${changePattern}>
          <option value="spiral">Spiral</option>
          <option value="swiss">Swiss</option>
        </select>
        <button style=${button} onClick=${add}>Explore!</button>
      </div>
    </div>
  `;
}

class Plugin {
  constructor() {
    this.miners = [];
    this.id = 0;

    this.addMiner('http://0.0.0.0:8000/mine');
  }

  addMiner = (url, patternType = 'spiral', chunkSize = 16) => {
    // TODO: Somehow set a default coords
    const pattern = getPattern({ x: 0, y: 0 }, patternType, chunkSize)
    const miner = MinerManager.create(
      df.persistentChunkStore,
      pattern,
      df.getWorldRadius(),
      df.planetRarity,
      RemoteWorker,
    );

    miner.url = url;
    miner.id = this.id++;
    miner.chunkSize = chunkSize;
    miner.patternType = patternType;
    miner.workers.forEach(worker => worker.url = url);

    miner.startExplore();

    this.miners.push(miner);

    return this.miners;
  }

  removeMiner = (miner) => {
    this.miners = this.miners.filter(m => {
      if (m === miner) {
        m.stopExplore();
        m.destroy();
        return false;
      } else {
        return true;
      }
    });

    return this.miners;
  }

  async render(container) {
    container.style.minWidth = '450px';
    container.style.width = 'auto';

    render(html`
      <${App}
        initialMiners=${this.miners}
        addMiner=${this.addMiner}
        removeMiner=${this.removeMiner} />
    `, container)
  }

  destroy() {
    for (const miner of this.miners) {
      df?.removeMinerLocation?.(miner.id);
      miner.stopExplore();
      miner.destroy();
    }
  }
}

plugin.register(new Plugin());
