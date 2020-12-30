const {
  html,
  render,
  useState,
  useLayoutEffect,
} = await import('https://unpkg.com/htm/preact/standalone.module.js');

const {
  BiomeNames,
  energy,
  coords,
  isMine,
  isUnowned,
  unlockTime,
  canWithdraw,
  hasArtifact,
  canHaveArtifact,
  canFindArtifact,
} = await import('https://plugins.zkga.me/utils/utils.js');

const {
  Energy,
  EnergyGrowth,
  Defense,
  Range,
  Speed,
} = await import('https://plugins.zkga.me/game/Icons.js');

// 30 seconds
let REFRESH_INTERVAL = 1000 * 30;
// 10 minutes
let AUTO_INTERVAL = 1000 * 60 * 10;

function canDeposit(planet) {
  return planet && isMine(planet) && !planet.heldArtifactId
}

function calcBonus(bonus) {
  return bonus - 100
}

function myPlanetsWithArtifacts() {
  return Array.from(df.getMyPlanets())
    .filter(df.isPlanetMineable)
    .sort((p1, p2) => parseInt(p1.locationId, 16) - parseInt(p2.locationId, 16));
}

function allPlanetsWithArtifacts() {
  return Array.from(df.getAllPlanets())
    .filter(canHaveArtifact)
    .sort((p1, p2) => parseInt(p1.locationId, 16) - parseInt(p2.locationId, 16));
}

function myArtifactsToDeposit() {
  return df.getMyArtifacts()
    .filter(artifact => !artifact.onPlanetId)
    .sort((a1, a2) => parseInt(a1.id, 16) - parseInt(a2.id, 16));
}

function findArtifacts() {
  Array.from(df.getMyPlanets())
    .filter(canHaveArtifact)
    .filter(canFindArtifact)
    .forEach(planet => {
      df.findArtifact(planet.locationId);
    });
}

function withdrawArtifacts() {
  Array.from(df.getMyPlanets())
    .filter(canWithdraw)
    .forEach(planet => {
      df.withdrawArtifact(planet.locationId);
    });
}

function FindButton({ planet }) {
  let [finding, setFinding] = useState(false);

  let button = {
    marginLeft: '5px',
    opacity: finding ? '0.5' : '1',
  };

  function findArtifact() {
    try {
      // Why does this f'ing throw?
      df.findArtifact(planet.locationId);
    } catch (err) {
      console.log(err);
      setFinding(true);
    }
    setFinding(true);
  }

  if (canFindArtifact(planet)) {
    return html`
      <button style=${button} onClick=${findArtifact} disabled=${finding}>
        ${finding ? 'Finding...' : 'Find!'}
      </button>
    `;
  }
}

function WithdrawButton({ planet }) {
  let [withdrawing, setWithdrawing] = useState(false);

  let button = {
    marginLeft: '5px',
    opacity: withdrawing ? '0.5' : '1',
  };

  function withdrawArtifact() {
    df.withdrawArtifact(planet.locationId);
    setWithdrawing(true);
  }

  if (canWithdraw(planet)) {
    return html`
      <button style=${button} onClick=${withdrawArtifact} disabled=${withdrawing}>
        ${withdrawing ? 'Withdrawing...' : 'Withdraw!'}
      </button>
    `;
  }
}

function Multiplier({ Icon, bonus }) {
  let diff = calcBonus(bonus);
  let style = {
    marginLeft: '5px',
    marginRight: '10px',
    color: diff < 0 ? 'red' : 'green',
    minWidth: '32px',
  };
  let text = diff < 0 ? `${diff}%` : `+${diff}%`
  return html`
    <${Icon} />
    <span style=${style}>${text}</span>
  `
}

function Unfound({ selected }) {
  if (!selected) {
    return
  }

  let planetList = {
    maxHeight: '100px',
    overflowX: 'hidden',
    overflowY: 'scroll',
  };

  let [lastLocationId, setLastLocationId] = useState(null);

  let planets = myPlanetsWithArtifacts()
    .filter(planet => !planet.hasTriedFindingArtifact);

  let planetsChildren = planets.map(planet => {
    let planetEntry = {
      marginBottom: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      color: lastLocationId === planet.locationId ? 'pink' : '',
    };

    let biome = BiomeNames[planet.biome];
    let { x, y } = planet.location.coords;

    function centerPlanet() {
      let planet = df.getPlanetWithCoords({ x, y });
      if (planet) {
        ui.centerPlanet(planet);
        setLastLocationId(planet.locationId);
      }
    }

    let text = `${biome} at ${coords(planet)} - ${energy(planet)}% energy`;
    return html`
      <div key=${planet.locationId} style=${planetEntry}>
        <span onClick=${centerPlanet}>${text}</span>
        <${FindButton} planet=${planet} />
      </div>
    `;
  });

  return html`
    <div style=${planetList}>
      ${planetsChildren.length ? planetsChildren : 'No artifacts to find right now.'}
    </div>
  `;
}

// TODO: Bonuses in this panel?
function Withdraw({ selected }) {
  if (!selected) {
    return;
  }

  let planetList = {
    maxHeight: '100px',
    overflowX: 'hidden',
    overflowY: 'scroll',
  };

  let [lastLocationId, setLastLocationId] = useState(null);

  const planets = myPlanetsWithArtifacts()
    .filter(hasArtifact)
    .sort((p1, p2) => p1.artifactLockedTimestamp - p2.artifactLockedTimestamp);

  let planetsChildren = planets.map(planet => {
    let planetEntry = {
      marginBottom: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      color: lastLocationId === planet.locationId ? 'pink' : '',
    };

    let biome = BiomeNames[planet.biome];
    let { x, y } = planet.location.coords;

    function centerPlanet() {
      let planet = df.getPlanetWithCoords({ x, y });
      if (planet) {
        ui.centerPlanet(planet);
        setLastLocationId(planet.locationId);
      }
    }

    let text = `${biome} at ${coords(planet)} - ${unlockTime(planet)}`;
    return html`
      <div key=${planet.locationId} style=${planetEntry}>
        <span onClick=${centerPlanet}>${text}</span>
        <${WithdrawButton} planet=${planet} />
      </div>
    `;
  });

  return html`
    <div style=${planetList}>
      ${planetsChildren.length ? planetsChildren : 'No artifacts on your planets.'}
    </div>
  `;
}

function Deposit({ selected }) {
  if (!selected) {
    return;
  }

  let artifactList = {
    maxHeight: '100px',
    overflowX: 'hidden',
    overflowY: 'scroll',
  };

  let [depositing, setDepositing] = useState(false);

  let [planet, setPlanet] = useState(ui.getSelectedPlanet);

  useLayoutEffect(() => {
    let onClick = () => {
      setPlanet(ui.getSelectedPlanet());
    }
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('click', onClick);
    }
  }, []);

  let artifacts = myArtifactsToDeposit();

  let artifactChildren = artifacts.map(artifact => {
    let wrapper = {
      display: 'flex',
      marginBottom: '10px',
    };
    let button = {
      marginLeft: 'auto',
      opacity: depositing ? '0.5' : '1',
    };
    let {
      energyCapMultiplier,
      energyGroMultiplier,
      defMultiplier,
      rangeMultiplier,
      speedMultiplier
    } = artifact.upgrade;

    let deposit = () => {
      if (canDeposit(planet) && !depositing) {
        // TODO: Fast depositing
        setDepositing(true);
        df.depositArtifact(planet.locationId, artifact.id);
      }
    }

    return html`
      <div key=${artifact.id} style=${wrapper}>
        <${Multiplier} Icon=${Energy} bonus=${energyCapMultiplier} />
        <${Multiplier} Icon=${EnergyGrowth} bonus=${energyGroMultiplier} />
        <${Multiplier} Icon=${Defense} bonus=${defMultiplier} />
        <${Multiplier} Icon=${Range} bonus=${rangeMultiplier} />
        <${Multiplier} Icon=${Speed} bonus=${speedMultiplier} />
        ${canDeposit(planet) ? html`
          <button style=${button} onClick=${deposit} disabled=${depositing}>
            ${depositing ? 'Depositing...' : 'Deposit'}
          </button>
        ` : null
      }
      </div>
    `;
  });

  return html`
    <div style=${artifactList}>
      ${artifactChildren.length ? artifactChildren : 'No artifacts to deposit.'}
    </div>
  `;
}

function Untaken({ selected }) {
  if (!selected) {
    return;
  }

  let planetList = {
    maxHeight: '100px',
    overflowX: 'hidden',
    overflowY: 'scroll',
  };

  let [lastLocationId, setLastLocationId] = useState(null);

  const planets = allPlanetsWithArtifacts()
    .filter(isUnowned);

  let planetsChildren = planets.map(planet => {
    let planetEntry = {
      marginBottom: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      color: lastLocationId === planet.locationId ? 'pink' : '',
    };

    let biome = BiomeNames[planet.biome];
    let { x, y } = planet.location.coords;

    function centerPlanet() {
      let planet = df.getPlanetWithCoords({ x, y });
      if (planet) {
        ui.centerPlanet(planet);
        setLastLocationId(planet.locationId);
      }
    }

    let text = `${biome} at ${coords(planet)}`;
    return html`
        <div key=${planet.locationId} style=${planetEntry}>
          <span onClick=${centerPlanet}>${text}</span>
        </div>
      `;
  });

  return html`
    <div style=${planetList}>
      ${planetsChildren.length ? planetsChildren : 'No artifacts to find right now.'}
    </div>
  `;
}

function AutoButton({ loop, onText, offText }) {
  let button = {
    marginLeft: '10px',
  };

  let [isOn, setIsOn] = useState(false);
  let [timerId, setTimerId] = useState(null);

  function toggle() {
    setIsOn(!isOn);
  }

  useLayoutEffect(() => {
    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
    }

    if (isOn) {
      let timerId = setInterval(loop, AUTO_INTERVAL);
      setTimerId(timerId);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isOn]);

  return html`
    <button style=${button} onClick=${toggle}>${isOn ? onText : offText}</button>
  `;
}

function App() {
  let buttonBar = {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '10px',
  };

  // ['unfound', 'withdraw', 'deposit', 'untaken']
  let [tab, setTab] = useState('unfound');
  let [_, setLoop] = useState(0);

  useLayoutEffect(() => {
    let intervalId = setInterval(() => {
      setLoop(loop => loop + 1)
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    }
  }, []);

  return html`
    <div style=${buttonBar}>
      <button onClick=${() => setTab('unfound')}>Unfound</button>
      <button onClick=${() => setTab('withdraw')}>Withdraw</button>
      <button onClick=${() => setTab('deposit')}>Deposit</button>
      <button onClick=${() => setTab('untaken')}>Untaken</button>
    </div>
    <div>
      <${Unfound} selected=${tab === 'unfound'} />
      <${Withdraw} selected=${tab === 'withdraw'} />
      <${Deposit} selected=${tab === 'deposit'} />
      <${Untaken} selected=${tab === 'untaken'} />
    </div>
    <div>
      <span>Auto:</span>
      <${AutoButton} onText="Cancel Find" offText="Find" loop=${findArtifacts} />
      <${AutoButton} onText="Cancel Withdraw" offText="Withdraw" loop=${withdrawArtifacts} />
    </div>
  `;
}

class Plugin {
  constructor() {
    this.root = null;
    this.container = null
  }
  async render(container) {
    this.container = container;

    container.style.width = '450px';

    this.root = render(html`<${App} />`, container);
  }

  destroy() {
    render(null, this.container, this.root);
  }
}

plugin.register(new Plugin());
