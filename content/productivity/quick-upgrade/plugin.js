const {
  html,
  render,
  useState,
  useLayoutEffect,
} = await import('https://unpkg.com/htm/preact/standalone.module.js');

const {
  eachLimit
} = await import('https://cdn.skypack.dev/async-es');

const {
  Defense,
  Range,
  Speed,
} = await import('https://plugins.zkga.me/game/Icons.js');

const {
  UpgradeBranchName,
  SpaceType,
  canStatUpgrade,
  canPlanetUpgrade,
} = await import('https://plugins.zkga.me/utils/utils.js')

function upgrade(planet, branch) {
  if (planet && canPlanetUpgrade(planet) && canStatUpgrade(planet, branch)) {
    df.upgrade(planet.locationId, branch)
  }
}

function UpgradeButton({ Icon, planet, branch }) {
  let isEnabled = canPlanetUpgrade(planet) && canStatUpgrade(planet, branch);

  let button = {
    opacity: isEnabled ? '1' : '0.5',
  };

  let label = {
    marginLeft: '5px',
  };

  let [iconColor, setIconColor] = useState('white');

  function colorBlack() {
    setIconColor('black');
  }

  function colorWhite() {
    setIconColor('white');
  }

  function onClick() {
    upgrade(planet, branch);
  }

  return html`
    <button style=${button} disabled=${!isEnabled} onClick=${onClick} onMouseOver=${colorBlack} onMouseOut=${colorWhite}>
      <${Icon} pathStyle=${{ fill: iconColor }} />
      <span style=${label}>Lvl ${planet.upgradeState[branch]}</span>
    </button>
  `;
}

function UpgradeAllButton({ Icon, branch, onFeedback }) {
  let button = {
    paddingLeft: '10px',
    paddingRight: '10px',
  };

  let [iconColor, setIconColor] = useState('white');

  function colorBlack() {
    setIconColor('black');
  }

  function colorWhite() {
    setIconColor('white');
  }

  function onClick() {
    let myPlanets = df.getMyPlanets()
      .filter(planet => canPlanetUpgrade(planet) && canStatUpgrade(planet, branch));
    onFeedback(`Queueing ${myPlanets.length} planet upgrades.`);

    if (myPlanets.length === 0) {
      onFeedback('No planet upgrades to queue.');
      return;
    }

    eachLimit(myPlanets, 1, (planet, cb) => {
      setTimeout(() => {
        upgrade(planet, branch);
        cb();
      }, 250);
    }, () => {
      onFeedback('Planet upgrades queued!');
    });
  }

  return html`
    <button style=${button} onClick=${onClick} onMouseOver=${colorBlack} onMouseOut=${colorWhite}>
      <${Icon} pathStyle=${{ fill: iconColor }} />
    </button>
  `;
}

function UpgradeSelectedPlanet({ planet }) {
  let wrapper = {
    display: 'flex',
    justifyContent: 'space-between',
  };

  if (!planet) {
    return html`
      <div style=${wrapper}>
        No planet selected.
      </div>
    `;
  }
  return html`
    <div style=${wrapper}>
      <span>Selected:</span>
      <${UpgradeButton} Icon=${Defense} planet=${planet} branch=${UpgradeBranchName.Defense} />
      <${UpgradeButton} Icon=${Range} planet=${planet} branch=${UpgradeBranchName.Range} />
      <${UpgradeButton} Icon=${Speed} planet=${planet} branch=${UpgradeBranchName.Speed} />
    </div>
  `;
}

function UpgradeAllPlanets() {
  let wrapper = {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px',
  };

  let [feedback, setFeedback] = useState(null);

  return html`
    <div style=${wrapper}>
      <span>All planets:</span>
      <${UpgradeAllButton} Icon=${Defense} branch=${UpgradeBranchName.Defense} onFeedback=${setFeedback} />
      <${UpgradeAllButton} Icon=${Range} branch=${UpgradeBranchName.Range} onFeedback=${setFeedback} />
      <${UpgradeAllButton} Icon=${Speed} branch=${UpgradeBranchName.Speed} onFeedback=${setFeedback} />
    </div>
    <div>
      ${feedback}
    </div>
  `;
}

function App() {
  let [selectedPlanet, setSelectedPlanet] = useState(ui.getSelectedPlanet());

  useLayoutEffect(() => {
    let onClick = () => {
      setSelectedPlanet(ui.getSelectedPlanet());
    }
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('click', onClick);
    }
  }, []);

  return html`
    <div>
      <${UpgradeSelectedPlanet} planet=${selectedPlanet} />
      <${UpgradeAllPlanets} />
    </div>
  `;
}

class Plugin {
  constructor() {
    this.container = null;
    this.root = null;
  }

  render(container) {
    container.parentElement.style.minHeight = 'unset';
    container.style.width = '325px';
    container.style.minHeight = 'unset';

    this.container = container;

    this.root = render(html`<${App} />`, container);
  }

  destroy() {
    render(null, this.container, this.root);
  }
}

export default Plugin;
