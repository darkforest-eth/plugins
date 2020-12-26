const {
  MinerManager,
  MinerManagerEvent
} = await import('https://df-plugins.netlify.app/game/MinerManager.js');
const {
  RemoteWorker
} = await import('https://df-plugins.netlify.app/miner/RemoteWorker.js');
const {
  html,
  render,
  useState,
  useLayoutEffect
} = await import('https://unpkg.com/htm/preact/standalone.module.js');

const NEW_CHUNK = MinerManagerEvent.DiscoveredNewChunk;

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
    justifyContent: 'space-between'
  };

  let remove = () => {
    onRemove(miner);
  }

  return html`
    <div style=${wrapper}>
      <span>${miner.url} - ${hashRate} hashes/sec</span>
      <button onClick=${remove}>X</button>
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
  const [miners, setMiners] = useState(initialMiners);
  const [nextUrl, setNextUrl] = useState(null);

  const onChange = (evt) => {
    setNextUrl(evt.target.value)
  }

  const add = () => {
    const miners = addMiner(nextUrl);
    setMiners(miners);
    setNextUrl(null);
  }

  const remove = (miner) => {
    const miners = removeMiner(miner);
    setMiners(miners);
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

  addMiner = (url) => {
    const pattern = df.getMiningPattern();
    const miner = MinerManager.create(
      df.persistentChunkStore,
      pattern,
      df.getWorldRadius(),
      df.planetRarity,
      RemoteWorker,
    );

    miner.url = url;
    miner.id = this.id++;
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
    container.style.minWidth = '400px';

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
