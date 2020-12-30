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
