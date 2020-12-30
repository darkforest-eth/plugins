export let coords = (planet) => {
  return `(${planet.location.coords.x}, ${planet.location.coords.y})`
}

export let canUpgrade = (planet) => {
  return df.entityStore.planetCanUpgrade(planet)
};

export let isAsteroid = (planet) => planet.planetResource === 1

export let getPlanetRank = (planet) => {
  if (!planet) return 0;
  return planet.upgradeState.reduce((a, b) => a + b);
};

export let getSilverNeeded = (planet) => {
  if (!planet) return 0;
  let totalLevel = planet.upgradeState.reduce((a, b) => a + b);
  return Math.floor((totalLevel + 1) * 0.2 * planet.silverCap);
};

export let getSilver = (planet) => {
  if (!planet) return 0;
  return Math.floor(planet.silver);
};

export let BiomeNames = [
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

export let emptyAddress = "0x0000000000000000000000000000000000000000";

export let isUnowned = (planet) => planet.owner === emptyAddress;

export let isMine = (planet) => planet.owner === df.account;

export let unlockTimestamp = (planet) => {
  return (planet.artifactLockedTimestamp + (12 * 60 * 60)) * 1000;
}

export let unlockTime = (planet) => {
  return (new Date(unlockTimestamp(planet))).toLocaleString();
}

export let canWithdraw = (planet) => {
  if (planet && planet.artifactLockedTimestamp) {
    return Date.now() > unlockTimestamp(planet)
  } else {
    return false;
  }
}

export let energy = (planet) => {
  return Math.floor(planet.energy / planet.energyCap * 100);
}

export let canHaveArtifact = (planet) => {
  return df.isPlanetMineable(planet) && !planet.hasTriedFindingArtifact
}

export let canFindArtifact = (planet) => energy(planet) >= 96;
export let hasArtifact = (planet) => planet.heldArtifactId != null;

export let canDeposit = (planet) => {
  return planet && isMine(planet) && !planet.heldArtifactId
}

export let calcBonus = (bonus) => {
  return bonus - 100
}

export let myPlanetsWithArtifacts = () => {
  return Array.from(df.getMyPlanets())
    .filter(df.isPlanetMineable)
    .sort((p1, p2) => parseInt(p1.locationId, 16) - parseInt(p2.locationId, 16));
}

export let allPlanetsWithArtifacts = () => {
  return Array.from(df.getAllPlanets())
    .filter(canHaveArtifact)
    .sort((p1, p2) => parseInt(p1.locationId, 16) - parseInt(p2.locationId, 16));
}

export let myArtifactsToDeposit = () => {
  return df.getMyArtifacts()
    .filter(artifact => !artifact.onPlanetId)
    .sort((a1, a2) => parseInt(a1.id, 16) - parseInt(a2.id, 16));
}

export let findArtifacts = () => {
  Array.from(df.getMyPlanets())
    .filter(canHaveArtifact)
    .filter(canFindArtifact)
    .forEach(planet => {
      df.findArtifact(planet.locationId);
    });
}

export let withdrawArtifacts = () => {
  Array.from(df.getMyPlanets())
    .filter(canWithdraw)
    .forEach(planet => {
      df.withdrawArtifact(planet.locationId);
    });
}
