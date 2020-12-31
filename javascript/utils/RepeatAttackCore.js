function checkNumInboundVoyages(planetId, from = "") {
  if (from == "") {
    return (
      df
        .getAllVoyages()
        .filter(
          (v) =>
            v.toPlanet == planetId &&
            v.arrivalTime > new Date().getTime() / 1000
        ).length +
      df.getUnconfirmedMoves().filter((m) => m.to == planetId).length
    );
  } else {
    return (
      df
        .getAllVoyages()
        .filter((v) => v.toPlanet == planetId)
        .filter((v) => v.fromPlanet == from).length +
      df.getUnconfirmedMoves().filter((m) => m.to == planetId && m.from == from)
        .length
    );
  }
}

function planetPower$1(planet) {
  return (planet.energy * planet.defense) / 100;
}
function planetPercentEnergy(planet, percentCap = 25) {
  const unconfirmedDepartures = planet.unconfirmedDepartures.reduce(
    (acc, dep) => {
      return acc + dep.forces;
    },
    0
  );
  const FUZZY_ENERGY = Math.floor(planet.energy - unconfirmedDepartures);
  return (FUZZY_ENERGY * percentCap) / 100;
}
function planetCurrentPercentEnergy(planet) {
  const unconfirmedDepartures = planet.unconfirmedDepartures.reduce(
    (acc, dep) => {
      return acc + dep.forces;
    },
    0
  );
  const FUZZY_ENERGY = Math.floor(planet.energy - unconfirmedDepartures);
  return Math.floor((FUZZY_ENERGY / planet.energyCap) * 100);
}

function getDistance(a, b) {
  const dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  return dist;
}

function getEnergyArrival(srcId, syncId, percentageSend = 25) {
  const { energyCap } = df.getPlanetWithId(srcId);
  const payload = (energyCap * percentageSend) / 100;
  const sync = df.getPlanetWithId(syncId);
  return (
    df.getEnergyArrivingForMove(srcId, syncId, payload) / (sync.defense / 100)
  );
}
function getEnergyArrivalAbs(srcId, syncId, energy) {
  return df.getEnergyArrivingForMove(srcId, syncId, energy);
}
function findNearBy(
  planetLocationId,
  maxDistance = 5000,
  levelLimit = 3,
  numOfPlanets = 5
) {
  const owned = df.getMyPlanets();

  const ownedFiltered = owned
    .filter((p) => p.locationId !== planetLocationId)
    .filter((p) => p.planetLevel <= levelLimit)
    .filter((p) => df.getDist(planetLocationId, p.locationId) < maxDistance);
  ownedFiltered.sort(
    (a, b) =>
      df.getDist(planetLocationId, a.locationId) -
      df.getDist(planetLocationId, b.locationId)
  );
  return ownedFiltered.slice(0, numOfPlanets).map((p) => {
    const landingForces = getEnergyArrival(p.locationId, planetLocationId);
    return {
      landingForces,
      planet: p,
    };
  });
}
function findWeapons(
  planetLocationId,
  levelLimit = 7,
  numOfPlanets = 5,
  maxTime = 30 * 60,
  excludeList = []
) {
  const warmWeapons = df
    .getMyPlanets()
    .filter((p) => p.locationId !== planetLocationId)
    .filter((p) => p.planetLevel <= levelLimit)
    .filter((p) => !excludeList.includes(p.locationId))
    .filter((p) => df.getTimeForMove(p.locationId, planetLocationId) < maxTime);
  const mapped = warmWeapons.map((p) => {
    const landingForces = getEnergyArrival(
      p.locationId,
      planetLocationId,
      planetCurrentPercentEnergy(p)
    );
    return {
      landingForces,
      planet: p,
    };
  });

  mapped.sort((a, b) => {
    return b.landingForces - a.landingForces;
  });
  return mapped.map((p) => p.planet).slice(0, numOfPlanets);
}
function planetIsRevealed(planetId) {
  return !!contractsAPI.getLocationOfPlanet(planetId);
}
async function waitingForPassengers(locationId, passengersArray) {
  const arrivals = await df.contractsAPI.getArrivalsForPlanet(locationId);
  return (
    arrivals
      .filter((a) => a.player == df.account)
      .filter((a) => a.arrivalTime * 1000 > new Date().getTime()) //If not arrived
      .filter((a) => passengersArray.includes(a.fromPlanet)).length > 0
  );
}

function modelEnergyNeededToTake(srcId, syncId) {
  const src = df.getPlanetWithId(srcId);
  const sync = df.getPlanetWithId(srcId);
  const dist = df.getDist(srcId, syncId);
  const power_needed_on_arrival = ((sync.energy * sync.defense) / 100) * 1.2; //Want a little buffer
  const scale = (1 / 2) ** (dist / src.range);
  const power_needed_to_send =
    power_needed_on_arrival / scale + 0.05 * src.energyCap;

  return power_needed_to_send;
}

var planet = /*#__PURE__*/ Object.freeze({
  __proto__: null,
  checkNumInboundVoyages: checkNumInboundVoyages,
  planetPower: planetPower$1,
  planetPercentEnergy: planetPercentEnergy,
  planetCurrentPercentEnergy: planetCurrentPercentEnergy,
  getDistance: getDistance,
  getEnergyArrival: getEnergyArrival,
  getEnergyArrivalAbs: getEnergyArrivalAbs,
  findNearBy: findNearBy,
  findWeapons: findWeapons,
  planetIsRevealed: planetIsRevealed,
  waitingForPassengers: waitingForPassengers,
  modelEnergyNeededToTake: modelEnergyNeededToTake,
});

const PIRATES = "0x0000000000000000000000000000000000000000";
const c = {
  FLOOD: "FLOOD",
  OVERLOAD: "OVERLOAD",
  PESTER: "PESTER",
  AID: "AID",
  FEED: "AID",
  SUPPLY: "SUPPLY",
  EXPLORE: "EXPLORE",
  DELAYED_MOVE: "DELAYED_MOVE",
  CHAINED_MOVE: "CHAINED_MOVE",
  PIRATES,
};

// A recurring attack

function pester(
  yourPlanetLocationId,
  opponentsPlanetLocationsId,
  percentageTrigger = 65,
  percentageSend = 20
) {
  const match = df
    .getMyPlanets()
    .filter((t) => t.locationId == yourPlanetLocationId);
  if (match.length == 0) {
    return;
  }
  const source = match[0];
  const unconfirmedDepartures = source.unconfirmedDepartures.reduce(
    (acc, dep) => {
      return acc + dep.forces;
    },
    0
  );
  if (checkNumInboundVoyages(opponentsPlanetLocationsId) >= 6) {
    //Too many inbound
    return;
  }
  const TRIGGER_AMOUNT = Math.floor(
    (source.energyCap * percentageTrigger) / 100
  );
  const FUZZY_ENERGY = Math.floor(source.energy - unconfirmedDepartures);

  if (FUZZY_ENERGY > TRIGGER_AMOUNT) {
    //If significantly over the trigger amount just batch include excess energy in the attack
    // If current energy is 90% instead of sending 20% and landing at 70%, send 45% then recover;

    const overflow_send =
      planetCurrentPercentEnergy(source) - (percentageTrigger - percentageSend);

    const FORCES = Math.floor((source.energyCap * overflow_send) / 100);
    console.log(`[pester]: launching attack from ${source.locationId}`);
    terminal.println(`[pester]: launching attack from ${source.locationId}`, 4);

    //send attack
    terminal.jsShell(
      `df.move('${
        source.locationId
      }', '${opponentsPlanetLocationsId}', ${FORCES}, ${0})`
    );
    df.move(yourPlanetLocationId, opponentsPlanetLocationsId, FORCES, 0);
  }
}

function createPester(
  srcId,
  syncId,
  percentageTrigger = 75,
  percentageSend = 45,
  meta = {}
) {
  return {
    id: `[PESTER]-${srcId}-${syncId}-${percentageTrigger}-${percentageSend}`,
    type: c.PESTER,
    payload: {
      srcId,
      syncId,
      percentageTrigger,
      percentageSend,
    },
    meta,
  };
}

function explore(
  srcId,
  percentageRange = 75,
  percentageSend = 25,
  minLevel = 3
) {
  const explorer = df.getPlanetWithId(srcId);
  const takeable = df
    .getPlanetsInRange(srcId, percentageRange)
    .filter((p) => p.planetLevel >= minLevel)
    .filter((p) => p.owner == pirates)
    .filter((p) => planetIsRevealed(p.locationId))
    .filter((p) => checkNumInboundVoyages(p.planetId, explorer.owner) < 1)
    //Energy Needed to Take
    .filter(
      (p) =>
        df.getEnergyNeededForMove(srcId, p.locationId, planetPower(p)) <
        planetPercentEnergy(explorer, percentageSend)
    );
  takeable.sort((a, b) => b.planetLevel - a.planetLevel);
  if (takeable.length > 0) {
    console.log("[explore]: launching exploration");
    terminal.println("[explore]: launching exploration", 4);
    const target = takeable[0];
    const FORCES = Math.floor(
      df.getEnergyNeededForMove(
        srcId,
        target.locationId,
        planetPower(target) + 200
      )
    );

    //send attack
    terminal.jsShell(
      `df.move('${explorer.locationId}', '${
        target.locationId
      }', ${FORCES}, ${0})`
    );
    df.move(explorer.locationId, target.locationId, FORCES, 0);
  } else if (planetCurrentPercentEnergy(explorer) > 75) {
    console.error(
      `[explore]: ${explorer.id} has not valid targets consider increasing percentageSend`
    );
    terminal.println(
      `[explore]: ${explorer.id} has not valid targets consider increasing percentageSend`,
      3
    );
  }
}

function createExplore(
  srcId,
  percentageRange = 75,
  percentageSend = 25,
  minLevel = 3
) {
  return {
    id: `[EXPLORE]-${srcId}-${percentageRange}-${percentageSend}-${minLevel}`,
    type: c.EXPLORE,
    payload: {
      srcId,
      percentageRange,
      percentageSend,
      minLevel,
    },
  };
}

function secondsToMs(s) {
  return s * 1000;
}
function msToSeconds(ms) {
  return ms / 1000;
}

function within5Minutes(before, now) {
  return (now - before) / 1000 / 60 < 5;
}

var time = /*#__PURE__*/ Object.freeze({
  __proto__: null,
  secondsToMs: secondsToMs,
  msToSeconds: msToSeconds,
  within5Minutes: within5Minutes,
});

function delayedMove(action) {
  const { srcId, syncId, sendAt, percentageSend } = action.payload;

  const match = df.getMyPlanets().filter((t) => t.locationId == srcId);
  if (match.length == 0) {
    //Should delete self on this case
    return;
  }
  const source = match[0];
  if (checkNumInboundVoyages(syncId) >= 7) {
    //Too many inbound
    return;
  }

  const FORCES = Math.floor((source.energy * percentageSend) / 100);
  console.log(sendAt);

  if (sendAt < new Date().getTime()) {
    console.log(`[delay]: ${source.locationId} attack launch`);
    terminal.println(`[delay]: ${source.locationId} attack launch`, 4);

    //send attack
    terminal.jsShell(`df.move('${srcId}', '${syncId}', ${FORCES}, ${0})`);
    df.move(srcId, syncId, FORCES, 0);
    return true;
  } else {
    console.log(
      `[delay]: ${source.locationId} launch in ${msToSeconds(
        sendAt - new Date().getTime()
      )}`
    );
  }
  return false;
}

function createDelayedMove(
  srcId,
  syncId,
  sendAt,
  percentageSend = 80,
  meta = {
    sent: false,
  }
) {
  return {
    type: c.DELAYED_MOVE,
    id: `${c.DELAYED_MOVE}-${srcId}-${syncId}`,
    payload: {
      srcId,
      syncId,
      sendAt,
      percentageSend,
    },
    meta: meta,
  };
}

async function chainedMove(action) {
  const {
    srcId,
    syncId,
    passengers,
    departure,
    percentageSend,
    createdAt,
  } = action.payload;

  const match = df.getMyPlanets().filter((t) => t.locationId == srcId);
  if (match.length == 0) {
    //Should delete self on this case
    return false;
  }
  const source = match[0];
  if (checkNumInboundVoyages(syncId) >= 7) {
    //Too many inbound
    return false;
  }
  const send = () => {
    console.log("[chained]: launching attack");
    terminal.println("[chained]: launching attack", 4);

    //send attack
    terminal.jsShell(`df.move('${srcId}', '${syncId}', ${FORCES}, ${0})`);
    df.move(srcId, syncId, FORCES, 0);
    return true;
  };

  const FORCES = Math.floor((source.energy * percentageSend) / 100);
  if (within5Minutes(createdAt, new Date().getTime())) {
    console.log("too soon, waiting for passengers to depart");
    return false;
  } else if (await waitingForPassengers(srcId, passengers)) {
    console.log("Waiting for passengers to arrive'");
    return false;
  } else {
    return send();
  }
}

function createChainedMove(
  srcId,
  syncId,
  passengers,
  departure,
  percentageSend = 90
) {
  return {
    type: c.CHAINED_MOVE,
    id: `${c.CHAINED_MOVE}-${srcId}-${syncId}`,
    payload: {
      srcId,
      syncId,
      passengers,
      departure,
      percentageSend,
      createdAt: new Date().getTime(),
    },
    meta: {
      sent: false,
    },
  };
}

function markChainedMoveSent(chainedMove) {
  chainedMove.meta.sent = true;
  return chainedMove;
}

function createSwarm(
  planetId,
  maxDistance = 5000,
  levelLimit = 1,
  numOfPlanets = 5
) {
  const nearby = findNearBy(planetId, maxDistance, levelLimit, numOfPlanets);
  return nearby.map((p) => {
    return createPester(p.planet.locationId, planetId, 75, 40, {
      tag: "SWARM",
    });
  });
}

function createFlood(
  locationId,
  levelLimit = 7,
  numOfPlanets = 5,
  searchRangeSec = 60 * 60,
  test = true
) {
  const weapons = findWeapons(
    locationId,
    levelLimit,
    numOfPlanets,
    searchRangeSec
  );
  //Sort by who will take longest to land

  weapons.sort(
    (a, b) =>
      df.getTimeForMove(b.locationId, locationId) -
      df.getTimeForMove(a.locationId, locationId)
  );
  const ETA_MS =
    new Date().getTime() +
    secondsToMs(df.getTimeForMove(weapons[0].locationId, locationId)) +
    secondsToMs(10);
  //Add 10 seconds for processing
  if (test == true) {
    const totalLandingEnergy = weapons.reduce(
      (acc, w) => acc + getEnergyArrival(w.locationId, locationId, 80),
      0
    );
    console.log(
      `all energy will land with ${totalLandingEnergy} at ${locationId}`
    );
    return [];
  }
  return weapons.map((p) => {
    return createDelayedMove(
      p.locationId,
      locationId,
      Math.floor(
        ETA_MS - secondsToMs(df.getTimeForMove(p.locationId, locationId))
      ),
      {
        ROUTINE: c.FLOOD,
        sent: false,
      }
    );
  });
}

function createOverload(
  srcId,
  targetId,
  searchRangeSec = 30 * 60,
  levelLimit = 7,
  numOfPlanets = 5,
  test = false
) {
  //Change Find Weapons to go off of travel time instead of distance
  const weapons = findWeapons(srcId, levelLimit, numOfPlanets, searchRangeSec);
  if (weapons.length == 0) {
    //No valid weapons
    return false;
  }
  //Sort by who will take longest to land
  weapons.sort(
    (a, b) =>
      df.getTimeForMove(b.locationId, srcId) -
      df.getTimeForMove(a.locationId, srcId)
  );
  const now = new Date().getTime();

  const ETA_MS =
    now +
    secondsToMs(df.getTimeForMove(weapons[0].locationId, srcId)) +
    secondsToMs(10);
  const juice = weapons.map((p) => {
    console.log(
      `[overload]: incoming charge from ${
        p.locationId
      } scheduled in ${msToSeconds(
        Math.floor(
          ETA_MS - now + secondsToMs(df.getTimeForMove(p.locationId, srcId))
        )
      )}s`
    );

    return createDelayedMove(
      p.locationId,
      srcId,
      Math.floor(ETA_MS - secondsToMs(df.getTimeForMove(p.locationId, srcId)))
    );
  });
  console.log(
    `[overload]:  discharge scheduled in ${new Date(
      ETA_MS + secondsToMs(3 * 60)
    )} `
  );
  if (test) {
    const addedEnergy = juice.reduce(
      (acc, a) => acc + getEnergyArrival(a.payload.srcId, srcId, 75),
      0
    );
    console.log(
      `OVERLOAD TEST: Expect at Minimum ${getEnergyArrivalAbs(
        srcId,
        targetId,
        addedEnergy
      )}`
    );
    return [];
  }
  const launch = createChainedMove(
    srcId,
    targetId,
    juice.map((a) => a.payload.srcId),
    ETA_MS + secondsToMs(3 * 60)
  );
  return [launch, ...juice];
}

function distance(fromLoc, toLoc) {
  return Math.sqrt(
    (fromLoc.coords.x - toLoc.coords.x) ** 2 +
      (fromLoc.coords.y - toLoc.coords.y) ** 2
  );
}
function distanceSort(a, b) {
  return a[1] - b[1];
}

async function capturePlanets(
  fromId,
  minCaptureLevel,
  maxDistributeEnergyPercent,
  capturedMemo = []
) {
  //Ripped from Sophon

  const planet = df.getPlanetWithId(fromId);

  const candidates_ = df
    .getPlanetsInRange(fromId, maxDistributeEnergyPercent)
    .filter((p) => p.owner === "0x0000000000000000000000000000000000000000")
    .filter((p) => p.planetLevel >= minCaptureLevel)
    .map((to) => {
      const fromLoc = df.getLocationOfPlanet(fromId);
      const toLoc = df.getLocationOfPlanet(to.locationId);
      return [to, distance(fromLoc, toLoc)];
    })
    .sort(distanceSort);

  let i = 0;
  const energyBudget = Math.floor(
    (maxDistributeEnergyPercent / 100) * planet.energy
  );

  console.log("energyBudget ", energyBudget);

  let energySpent = 0;
  try {
    while (energyBudget - energySpent > 0 && i < candidates_.length) {
      const energyLeft = energyBudget - energySpent;

      // Remember its a tuple of candidates and their distance
      const candidate = candidates_[i++][0];

      // Check if has incoming moves from another planet to safe
      const arrivals = await df.contractsAPI.getArrivalsForPlanet(
        candidate.locationId
      );
      if (arrivals.length !== 0) {
        continue;
      }

      const energyArriving = candidate.energyCap * 0.25;
      const energyNeeded = Math.ceil(
        df.getEnergyNeededForMove(fromId, candidate.locationId, energyArriving)
      );
      if (energyLeft - energyNeeded < 0) {
        continue;
      }
      if (capturedMemo.includes(candidate.locationId)) {
        continue;
      }

      console.log(
        `df.move("${fromId}","${candidate.locationId}",${energyNeeded},0)`
      );
      await df.move(fromId, candidate.locationId, energyNeeded, 0);
      capturedMemo.push(candidate.locationId);
      energySpent += energyNeeded;
    }
  } catch (err) {
    console.error(err);
  }

  return capturedMemo;
}

function distance$1(fromLoc, toLoc) {
  return Math.sqrt(
    (fromLoc.coords.x - toLoc.coords.x) ** 2 +
      (fromLoc.coords.y - toLoc.coords.y) ** 2
  );
}
function distanceSort$1(a, b) {
  return a[1] - b[1];
}

function isAsteroid(p) {
  return p.silverGrowth > 0;
}

async function distributeSilver(fromId, maxDistributeEnergyPercent) {
  const planet = df.getPlanetWithId(fromId);
  const candidates_ = df
    .getPlanetsInRange(fromId, maxDistributeEnergyPercent)
    .filter((p) => p.owner === df.getAccount())
    .filter((p) => p.planetLevel >= 4)
    .filter((p) => !isAsteroid(p))
    .map((to) => {
      const fromLoc = df.getLocationOfPlanet(fromId);
      const toLoc = df.getLocationOfPlanet(to.locationId);
      return [to, distance$1(fromLoc, toLoc)];
    })
    .sort(distanceSort$1);

  let i = 0;
  const energyBudget = Math.floor(
    (maxDistributeEnergyPercent / 100) * planet.energy
  );
  const silverBudget = Math.floor(planet.silver);

  let energySpent = 0;
  let silverSpent = 0;
  while (energyBudget - energySpent > 0 && i < candidates_.length) {
    const silverLeft = silverBudget - silverSpent;
    const energyLeft = energyBudget - energySpent;

    // Remember its a tuple of candidates and their distance
    const candidate = candidates_[i++][0];

    // Check if has incoming moves from a previous asteroid to be safe
    const arrivals = await df.contractsAPI.getArrivalsForPlanet(
      candidate.locationId
    );
    if (arrivals.length !== 0) {
      continue;
    }

    const silverRequested = Math.ceil(candidate.silverCap - candidate.silver);
    const silverNeeded =
      silverRequested > silverLeft ? silverLeft : silverRequested;

    // Setting a 100 silver guard here, but we could set this to 0
    if (silverNeeded < 100) {
      continue;
    }

    const energyNeeded = Math.ceil(
      df.getEnergyNeededForMove(fromId, candidate.locationId, 1)
    );
    if (energyLeft - energyNeeded < 0) {
      continue;
    }

    console.log(
      'df.move("' +
        fromId +
        '","' +
        candidate.locationId +
        '",' +
        energyNeeded +
        "," +
        silverNeeded +
        ")"
    );
    await df.move(fromId, candidate.locationId, energyNeeded, silverNeeded);
    energySpent += energyNeeded;
    silverSpent += silverNeeded;
  }
}

function checkPlanetUpgradeLevel(planet) {
  return planet.upgradeState.reduce((acc, i) => acc + i, 0);
}

async function autoUpgrade(location) {
  const planet = df.getPlanetById(location);
  if (planet.planetLevel < 4 && checkPlanetUpgradeLevel(planet) < 4) {
    //auto upgrade defense
    df.upgrade(planet.locationId, 0);
  }
}

function parseVersionString(string) {
  const [major, minor, patch] = string.split(".");
  return { major, minor, patch };
}

function areVersionsCompatible(newVersion, oldVersion) {
  if (!oldVersion) {
    return false;
  }
  const newV = parseVersionString(newVersion);
  const oldV = parseVersionString(oldVersion);
  if (newV.major !== oldV.major) {
    //Raise Error
    return false;
  } else if (newV.minor !== oldV.minor) {
    //Should have a migration available
    return false;
  } else if (newV.patch !== oldV.patch) {
    //Should not effect actions schema
    return true;
  } else {
    return true;
  }
}

var version = /*#__PURE__*/ Object.freeze({
  __proto__: null,
  areVersionsCompatible: areVersionsCompatible,
});

var utils = /*#__PURE__*/ Object.freeze({
  __proto__: null,
  planet: planet,
  version: version,
  time: time,
});

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
class Manager {
  actions = [];
  intervalId = "";
  version = "0.0.1";
  dead = false;
  utils = utils;
  constructor(blob = []) {
    if (typeof window.__SELDON_CORELOOP__ == "undefined") {
      //setup append only interval id storage
      window.__SELDON_CORELOOP__ = [];
    } else {
      //clear out old intervald
      console.log("KILLING PREVIOUS INTERVALS");
      window.__SELDON_CORELOOP__.forEach((id) => clearInterval(id));
    }
    if (blob.length > 0) {
      this.actions = blob;
      this.storeActions();
    }
    this.rehydrate();
    this.intervalId = setInterval(this.coreLoop.bind(this), 15000);
    window.__SELDON_CORELOOP__.push(this.intervalId);
    //aliases
    this.p = this.createPester.bind(this);
    this.pester = this.createPester.bind(this);
    this.s = this.swarm.bind(this);
    this.e = this.createExplore.bind(this);
    this.explore = this.createExplore.bind(this);
    this.f = this.flood.bind(this);
  }
  storeActions() {
    window.localStorage.setItem(
      "actions",
      JSON.stringify({ version: this.version, actions: this.actions })
    );
  }
  createAction(action) {
    this.actions.push(action);
    this.storeActions();
  }
  digIn(locationId, levelLimit = 3, maxDistributeEnergyPercent = 50) {
    capturePlanets(locationId, levelLimit, maxDistributeEnergyPercent, []);
  }
  expand() {
    const owned = df.getMyPlanets();
    let captured = [];
    owned.forEach(async (p) => {
      captured = await capturePlanets(p.locationId, 4, 50, captured);
    });
  }

  distribute() {
    const owned = df.getMyPlanets().filter((p) => p.silverGrowth > 0);
    let captured = [];
    owned.forEach(async (p) => {
      captured = await distributeSilver(p.locationId, 40);
    });
  }

  exploreDirective() {
    terminal.println("[CORE]: Running Directive Explore", 2);
    try {
      const busy = this.actions
        .filter((a) => a.type == this.c.PESTER)
        .map((a) => a.payload.yourPlanetLocationId);
      console.log(busy);
      df.getMyPlanets()
        .filter((p) => busy.includes(p.location))
        .forEach((p) => {
          console.log(p.locationId);
          this.explore(p.locationId, 75, 50, 2);
        });
    } catch (err) {
      console.log(err);
    }
  }
  checkForOOMThreat() {
    return (
      df.getUnconfirmedMoves().length == df.getUnconfirmedUpgrades().length > 2
    );
  }

  async coreLoop() {
    if (this.actions.length > 0) {
      terminal.println("[CORE]: Running Subroutines", 2);
    }
    asyncForEach(this.actions, async (action) => {
      if (this.checkForOOMThreat()) {
        // Prevent OOM bug when executing too many snarks in parallel
        return;
      }
      try {
        switch (action.type) {
          case c.PESTER:
            pester(
              action.payload.srcId,
              action.payload.syncId,
              action.payload.percentageTrigger,
              action.payload.percentageSend
            );
            break;
          case c.FEED:
            pester(
              action.payload.srcId,
              action.payload.syncId,
              action.payload.percentageTrigger,
              action.payload.percentageSend
            );
            break;
          case c.EXPLORE:
            explore(
              action.payload.ownPlanetId,
              action.payload.percentageRange,
              action.payload.percentageSend,
              action.payload.minLevel
            );
            break;
          case c.DELAYED_MOVE:
            if (delayedMove(action)) {
              //send once
              this.delete(action.id);
            }
            break;
          case c.CHAINED_MOVE:
            if (action.meta.sent == false) {
              if (await chainedMove(action)) {
                this.update(markChainedMoveSent(action));
              }
            }
            break;
          default:
            break;
        }
      } catch (error) {
        console.error(action);
        console.error(error);
      }
      return;
    });
  }
  unswarm(planetId) {
    this.actions = this.actions.filter((a) => {
      return a.payload.opponentsPlanetLocationsId !== planetId;
    });
  }
  flood(
    planetId,
    levelLimit = 7,
    numOfPlanets = 5,
    searchRangeSec = 60 * 60,
    test = false
  ) {
    if (this.dead) {
      console.log("[CORELOOP IS DEAD], flood ignored");
      return;
    }
    createFlood(
      planetId,
      levelLimit,
      numOfPlanets,
      searchRangeSec,
      test
    ).forEach((a) => this.createAction(a));
  }
  overload(
    srcId,
    targetId,
    searchRangeSec = 30 * 60,
    levelLimit = 4,
    numOfPlanets = 5,
    test = false
  ) {
    if (this.dead) {
      console.log("[CORELOOP IS DEAD], flood ignored");
      return;
    }
    createOverload(
      srcId,
      targetId,
      searchRangeSec,
      levelLimit,
      numOfPlanets,
      test
    ).forEach((a) => this.createAction(a));
  }

  swarm(planetId, maxDistance = 5000, levelLimit = 5, numOfPlanets = 5) {
    if (this.dead) {
      console.log("[CORELOOP IS DEAD], swarm ignored");
      return;
    }
    createSwarm(
      planetId,
      (maxDistance = 5000),
      (levelLimit = 5),
      (numOfPlanets = 5)
    ).forEach((action) => this.createAction(action));
  }
  createExplore(
    ownPlanetId,
    percentageRange = 75,
    percentageSend = 25,
    minLevel = 3
  ) {
    if (this.dead) {
      console.log("[CORELOOP IS DEAD], createExplore ignored");
      return;
    }
    this.createAction(
      createExplore(ownPlanetId, percentageRange, percentageSend, minLevel)
    );
  }
  createPester(
    yourPlanetLocationId,
    opponentsPlanetLocationsId,
    percentageTrigger = 75,
    percentageSend = 45,
    meta = {}
  ) {
    if (this.dead) {
      console.log("[CORELOOP IS DEAD], createPester ignored");
      return;
    }
    this.createAction(
      createPester(
        yourPlanetLocationId,
        opponentsPlanetLocationsId,
        percentageTrigger,
        percentageSend,
        meta
      )
    );
  }

  delete(id) {
    this.actions = this.actions.filter((a) => a.id !== id);
    this.storeActions();
  }
  update(action) {
    this.actions = [...this.actions.filter((a) => a.id !== action.id), action];
    this.storeActions();
  }
  wipeActionsFromPlanet(locationId) {
    this.actions = this.actions.filter((a) => {
      if (a.type !== "PESTER") {
        return a.yourPlanetLocationId !== locationId;
      }
      return true;
    });
  }
  _wipeActions() {
    this.actions = [];
    this.storeActions();
  }
  kill() {
    console.log(`KILLING CORE LOOP ${this.intervalId}`);
    this.dead = true;
    clearInterval(this.intervalId);
  }
  killAll() {
    window.__SELDON_CORELOOP__.forEach((intervalId) =>
      clearInterval(intervalId)
    );
  }
  pause() {
    this.dead = true;
    clearInterval(this.intervalId);
  }
  restart() {
    this.intervalId = setInterval(this.coreLoop.bind(this), 30000);
    window.__SELDON_CORELOOP__.push(this.intervalId);
    this.dead = false;
  }
  printActions() {
    console.log(JSON.stringify(this.actions));
  }
  listActions() {
    console.log(this.actions);
  }
  _not_working_centerPlanet(locationId) {
    let p = df.getPlanetWithId(locationId);
    uiManager.setSelectedPlanet(p);
    uiManager.emit("centerLocation", p);
  }
  rehydrate() {
    try {
      const raw = window.localStorage.getItem("actions");
      if (raw === null) {
        console.error("No Actions to Rehydrate");
        return;
      }
      const payload = JSON.parse(raw);
      if (areVersionsCompatible(this.version, payload?.version)) {
        this.actions = payload.actions;
      }
    } catch (err) {
      console.error("Issue Rehydrating Actions");
      throw err;
    }
  }
}

export default Manager;
