// rendering adopted from artifactory and from repeat-attacks
const {
  html,
  render,
  useState,
  useLayoutEffect,
} = await import('https://unpkg.com/htm/preact/standalone.module.js');

// 30 seconds
let REFRESH_INTERVAL = 1000 * 30;

function centerPlanet(id) {
  let p = df.getPlanetWithId(id);
  if (!p) return;
  if (df.getPlanetWithId(id).locationId)
    ui.centerLocationId(id);
}

let VerticalSpacing = {
  marginBottom: "12px",
};

let HalfVerticalSpacing = {
  marginBottom: "6px",
};

let Clickable = {
  cursor: "pointer",
  textDecoration: "underline",
};


let PIRATES = "0x0000000000000000000000000000000000000000";

function simulatedPlanets(planet, t = 0, arrivalQueue = []) {
  // simulate fuutre state of a planet t seconds in the future time
  // first item is t=0 ... accounting for unconfirmed departures
  // account for arrival queue  
  // returns an array of simulated future planets
  // for time = t, we round t to exact seconds so as to make easier for caller to pick it out

  // 1, clone planet
  // 2, do time =0 to account for unconfirmed departures [& silver]
  if (t < 0) t = 0;

  let simPlanets = [];
  let curPlanet = clonePlanet(planet);
  let curOwner = planet.owner;
  const nowInSeconds = Date.now() / 1000;

  if (planet.unconfirmedDepartures.length > 0) {
    curPlanet.energyRecovered = - planet.unconfirmedDepartures.reduce(
      (acc, dep) => {
        return acc + dep.forces;
      },
      0
    );
    curPlanet.energy += curPlanet.energyRecovered;  // this accounts for unconfirmed Departures
  }

  //TODO: account for unconfirmed silver too
  curPlanet.lastUpdated = nowInSeconds;
  curPlanet.futureTinSeconds = 0;
  curPlanet.prevOwner = curOwner;

  simPlanets.push(Object.assign({}, curPlanet));  //first entry is always t=0;
  // 3, fake time t as an empty arrival; any upgrate + art event we also fake an entry
  // 4, sort arrivalQueue

  let clonedArrivalQueue = [];

  let fakeArrivalAtT = {
    eventId: "faked",
    player: "faked",
    fromPlanet: "faked",
    toPlanet: planet.locationId,
    energyArriving: 0,
    silverMoved: 0,
    departureTime: nowInSeconds,
    arrivalTime: nowInSeconds + t,
  };

  if (t > 0) clonedArrivalQueue.push(Object.assign({}, fakeArrivalAtT));
  for (var a of arrivalQueue) {
    clonedArrivalQueue.push(Object.assign({}, a));
  }

  clonedArrivalQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);

  // 5, do arrival one at a time; each time return a simPlanet
  // 6, when all done, but if energy <95% of energyCap, do a count to return future state until 95%

  for (const arrival of clonedArrivalQueue) {
    let duration = arrival.arrivalTime - curPlanet.lastUpdated;
    curPlanet.prevOwner = curOwner;
    curPlanet.event = arrival;
    myDoArrive(curPlanet, arrival);
    curPlanet.futureTinSeconds += duration;
    curOwner = curPlanet.owner;
    simPlanets.push(Object.assign({}, curPlanet));
    //    console.log ("t= ", curPlanet.futureTinSeconds, "e=", curPlanet.energy, "t+=", arrival.arrivalTime-curPlanet.lastUpdated);
  };

  // if last item energy < 95% then iterate until it shows until 95%

  let curPct = curPlanet.energy / curPlanet.energyCap * 100;
  let nextPct = Math.ceil(curPct / 5) * 5;

  //  console.log(curPct, nextPct);

  while (nextPct <= 95 && curPlanet.owner !== PIRATES) {
    curPlanet.prevOwner = curPlanet.owner;
    curPlanet.lastUpdated += getEnergyCurveAtPercent(curPlanet, curPct, nextPct),
      curPlanet.futureTinSeconds += getEnergyCurveAtPercent(curPlanet, curPct, nextPct),
      curPlanet.energyRecovered = (nextPct - curPct) * curPlanet.energyCap / 100,
      curPlanet.energy = (nextPct) * curPlanet.energyCap / 100,
      curPlanet.event = "GROWTH";
    simPlanets.push(Object.assign({}, curPlanet));
    curPct = nextPct;
    nextPct = nextPct + 5;
  };

  return simPlanets;

}

function clonePlanet(planet) {
  return {
    locationId: planet.locationId,
    defense: planet.defense,
    energy: planet.energy,
    energyCap: planet.energyCap,
    energyGrowth: planet.energyGrowth,
    lastUpdated: planet.lastUpdated,
    location: planet.location,
    owner: planet.owner,
    prevOwner: planet.owner,
    planetLevel: planet.planetLevel,
    range: planet.range,
    silver: planet.silver,
    silverCap: planet.silverCap,
    silverGrowth: planet.silverGrowth,
    spaceType: planet.spaceType,
    speed: planet.speed,
    upgradeState: planet.upgradeState,
    futureTinSeconds: 0,
    event: "INIT",
    energyArrived: 0,
    energyRecovered: 0
  };
}

function myDoArrive(toPlanet, arrival) {
  // adopted from Game code GameEntityMemoryStore.ts
  // make sure toPlanet is cloned! - dangerous if called w/o cloning
  let contractPrecision = 1000;
  let duration = arrival.arrivalTime - toPlanet.lastUpdated;

  if (toPlanet.locationId !== arrival.toPlanet) {
    throw new Error(
      `attempted to apply arrival for wrong toPlanet ${toPlanet.locationId}`
    );
  }

  const { energyArriving: shipsMoved } = arrival;

  // update toPlanet energy and silver right before arrival
  let energyBeforeGrowth = toPlanet.energy;
  if (toPlanet.owner !== PIRATES) {
    toPlanet.energy = modelEnergyGrowth(toPlanet.energy, toPlanet.energyGrowth, toPlanet.energyCap, duration);
    toPlanet.energyRecovered = toPlanet.energy - energyBeforeGrowth;
  }
  toPlanet.energyArrived = shipsMoved;
  //  toPlanet.silver = getSilverOverTime.....not  implemented...
  toPlanet.lastUpdated = arrival.arrivalTime;

  // apply energy
  if (arrival.player !== toPlanet.owner) {
    // attacking enemy - includes emptyAddress

    if (
      toPlanet.energy >
      Math.floor((shipsMoved * contractPrecision * 100) / toPlanet.defense) /
      contractPrecision
    ) {
      // attack reduces target planet's garrison but doesn't conquer it
      toPlanet.energy -=
        Math.floor(
          (shipsMoved * contractPrecision * 100) / toPlanet.defense
        ) / contractPrecision;
    } else {
      // conquers planet
      toPlanet.owner = arrival.player;
      toPlanet.energy =
        shipsMoved -
        Math.floor(
          (toPlanet.energy * contractPrecision * toPlanet.defense) / 100
        ) /
        contractPrecision;
    }
  } else {
    // moving between my own planets
    toPlanet.energy += shipsMoved;
  }

  // apply silver - this only works on no silver producing planet for now
  if (toPlanet.silver + arrival.silverMoved > toPlanet.silverCap) {
    toPlanet.silver = toPlanet.silverCap;
  } else {
    toPlanet.silver += arrival.silverMoved;
  }
}

function getPlanetRank(planet) {
  if (!planet || planet === null) return undefined;
  return planet.upgradeState.reduce((a, b) => a + b);
};

function getPlanetLevel(planet) {
  if (!planet || planet === null) return undefined;
  return planet.planetLevel;
};

function getEnergyCurveAtPercent(planet, pct0, percent) {
  //getEnergyCurveAtPercent(explorer,20,80)
  // returns time (seconds) that planet will reach percent% of energycap
  const p1 = (percent / 100) * planet.energyCap;
  const c = planet.energyCap;
  const p0 = (pct0 / 100) * planet.energyCap;
  const g = planet.energyGrowth;

  const t1 = (c / (4 * g)) * Math.log((p1 * (c - p0)) / (p0 * (c - p1)))
  return t1;
}

function modelEnergyGrowth(energy, energyGrowth, energyCap, duration = 10) {
  const denom =
    Math.exp((-4 * energyGrowth * duration) / energyCap) *
    (energyCap / energy - 1) +
    1;
  return energyCap / denom;
}

function getPlanetLongForm(planet) {
  if (!planet) return "Unknown";
  let owner;
  switch (planet.owner) {
    case df.account:
      owner = "Our";
      break;
    case PIRATES:
      owner = "Unclaimed";
      break;
    default:
      owner = "Their";
  }

  return `${owner} ${getPlanetShortHash(planet)}(L${planet.planetLevel}R${getPlanetRank(planet)}) @${Math.round([planet.energy / planet.energyCap] * 100)}%`;
}

function getPlanetShortHash(planet) {
  if (!planet) return '00000';
  else return planet.locationId.substring(4, 9);
};

function getPlayerShortHash(address) {
  return address.substring(0, 6);
};

function planetIsRevealed(planetId) {
  return !!df.getLocationOfPlanet(planetId);
}

function summarize(r) {   // 
  let sums = {};
  Object.keys(r[0]).forEach(function (k) { // For each key in the data of a single data object
    this[k] = r.map(function (o) { return o[k] }) // Pluck values
      .map(function (w) {
        if (this[w]) { this[w]++; } else { this[w] = 1; } // Count values using an object
        return this;
      }, {}).pop();  // Take just one of the count object copies (poor-man's reduce with this)
  }, sums);
  return sums;
}


function Assess({ selected }) {
  if (!selected) {
    return
  }

  let planetList = {
    maxHeight: '200px',
    overflowX: 'hidden',
    overflowY: 'scroll',
  };

  let [selectedPlanet, setSelectedPlanet] = useState(ui.getSelectedPlanet());

  //    console.log ("selected..", selectedPlanet);

  useLayoutEffect(() => {
    let onClick = () => {
      setSelectedPlanet(ui.getSelectedPlanet());
    }
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('click', onClick);
    }
  }, []);

  let arrivalQueue = [];
  let planets = [];
  let planetStatus = "";

  if (selectedPlanet) {
    arrivalQueue = df.getAllVoyages()
      .filter((v) => v.toPlanet == selectedPlanet.locationId)
      .filter((v) => v.arrivalTime > Date.now() / 1000);

    if (arrivalQueue.length > 0) {
      if (arrivalQueue.filter((q) => q.player !== selectedPlanet.owner).length > 0) {
        planetStatus = " UNDER ATTACK";
      } else
        planetStatus = " transporting";
    }

    planets = simulatedPlanets(selectedPlanet, 0, arrivalQueue);
  }

  function getVoyId(simulatedPlanet) {
    let p = simulatedPlanet;
    if (!p) return `Error`;
    if (p.event !== "INIT" && p.event !== "GROWTH") {
      //            console.log (p.event.fromPlanet);
      return p.event.fromPlanet;
    }
    return "nothing to do";
  }

  function getArrivalText(simulatedPlanet) {
    let p = simulatedPlanet;
    let damage;
    let ret = "";
    if (!p) return `Error`;

    //        console.log (p);

    switch (p.event) {
      case "INIT": {
        if (p.energyRecovered < 0)
          ret = `= ${Math.round(p.energyRecovered)} (${Math.round(p.energyRecovered / p.energyCap * 100)}%) departing`;
      }
        break;
      case "GROWTH":
        ret = `= ${Math.round(p.energyRecovered)}(${Math.round(p.energyRecovered / p.energyCap * 100)}%) growth`;
        break;
      default: {
        damage = (p.event.player == p.prevOwner) ? p.event.energyArriving : -p.event.energyArriving / p.defense * 100;

        ret = `=  ${Math.round(damage)}`;
        ret += `(${Math.round(damage / p.energyCap * 100)}%) f/ `;
        let planet = df.getPlanetWithId(p.event.fromPlanet);
        // this will sometimes fail due to lazy update or network issues
        if (!planet) { ret += "unknown fromPlanet" } else {
          ret += `${getPlanetShortHash(planet)}(L${planet.planetLevel}R${getPlanetRank(planet)})`;
        }
        ret += ` + ${Math.round(p.energyRecovered)}(${Math.round(p.energyRecovered / p.energyCap * 100)}%) g/`;
      }
    }
    return ret;
  }

  let planetsChildren = planets.map(planet => {
    let planetEntry = {
      marginBottom: '1px',
      display: 'flex',
      //            justifyContent: 'space-between',
      //            color: lastLocationId === planet.locationId ? 'pink' : '',
    };
    // lastLocationId is used to color the selected planet

    let text = `t=${Math.round(planet.futureTinSeconds)}s @${Math.round(planet.energy / planet.energyCap * 100)}%`;
    text += getArrivalText(planet);

    // debug
    //        console.log(planet);


    return html`
        <div key=${getVoyId(planet)} style=${planetEntry}>
        <span onClick=${() => centerPlanet(getVoyId(planet))}>${text}</span>
        </div>
        ${planet.owner == planet.prevOwner ? '' : 'Planet Owner Changed!'}
    `;
  });


  return html`
    <div style=${planetList}><u>
          <span style=${planetList}
        > ${selectedPlanet ? getPlanetLongForm(selectedPlanet)
      + " def=" + selectedPlanet.defense + planetStatus : "(select a planet)"}</u></span>
  </div>
    <div style=${planetList}>
      ${planetsChildren.length ? planetsChildren : 'Not assessing anything ...'}
    </div>
  `;
}

function SitRep({ selected }) {
  if (!selected) {
    return;
  }

  let planetList = {
    maxHeight: '200px',
    overflowX: 'hidden',
    overflowY: 'scroll',
  };


  //    let report = sitRep();
  let notMyVoages = df.getAllVoyages()
    .filter((v) => v.player !== df.getAccount())
    .filter((v) => v.arrivalTime > Date.now() / 1000)

  let inMymap = notMyVoages
    .filter((v) => planetIsRevealed(v.fromPlanet) || planetIsRevealed(v.toPlanet))
    .sort((a, b) => { return a.arrivalTime - b.arrivalTime })

  let usUnderAttack = inMymap
    .filter((v) => df.getPlanetWithId(v.toPlanet).owner == df.account)

  //    let arrivals = inMymap;
  let arrivals = usUnderAttack;

  let voyInMyMap = 0;
  if (inMymap.length !== 0) {
    voyInMyMap = inMymap.length;
  }


  let summary;
  let activePlayers = 0;

  if (notMyVoages.length !== 0) {
    summary = summarize(notMyVoages);
    // if sorting needed: Object.entries(obj).sort((a, b) => b[0].localeCompare(a[0]));
    activePlayers = Object.keys(summary.player).length;
  }

  let voyAttackingUs = 0
  if (arrivals.length !== 0) {
    voyAttackingUs = arrivals.length;
  }

  console.log("voyInMap", voyInMyMap);

  ////
  let arrivalsChildren = arrivals.map(arrival => {
    let arrivalEntry = {
      marginBottom: '1px',
      display: 'flex',
      //            justifyContent: 'space-between',
    };

    let toPlanet = df.getPlanetWithId(arrival.toPlanet);
    //        let fromPlanet = df.getPlanetWithId(arrival.fromPlanet);
    let arrivalTimeInSeconds = Math.round((arrival.arrivalTime - Date.now() / 1000));

    let text = `t= ${arrivalTimeInSeconds}s ${Math.round(arrival.energyArriving / toPlanet.defense * 100)} arrv@ `;
    text += `${getPlanetShortHash(toPlanet)}(L${toPlanet.planetLevel}R${getPlanetRank(toPlanet)}) `;
    text += `(${Math.round((arrival.energyArriving / toPlanet.defense * 100) / toPlanet.energyCap * 100)}% damage vs `;
    text += `${Math.round((toPlanet.energy) / toPlanet.energyCap * 100)}% ) `;
    //        text += `defense = ${(toPlanet.defense)} `;

    return html`
      <div key=${toPlanet.locationId} style=${arrivalEntry}>
      <span onClick=${() => centerPlanet(toPlanet.locationId)}>${text}</span>
      </div>
    `;
  })

  let summaryText = `${notMyVoages.length} voages from ${activePlayers} other players; ${voyInMyMap} in our map. \n`;

  return html`
    <div style=${HalfVerticalSpacing}> ${summaryText} </div>
    <div style=${HalfVerticalSpacing}> <u> ${voyAttackingUs} incomings attacks!</u> </div>
    <div style=${planetList}>
      ${arrivalsChildren.length ? arrivalsChildren : 'peaceful day today....'}
    </div>
  `;
}


function App() {
  let buttonBar = {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '10px',
  };

  // ['assess', 'sitRep']
  let [tab, setTab] = useState('sitRep');
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
    <button onClick=${() => setTab('sitRep')}>Sit Rep </button>
    <button onClick=${() => setTab('assess')}>Assess</button>
    </div>
    <div>
      <${Assess} selected=${tab === 'assess'} />
      <${SitRep} selected=${tab === 'sitRep'} />
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