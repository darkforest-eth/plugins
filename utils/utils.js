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
  const totalLevel = planet.upgradeState.reduce((a, b) => a + b);
  return Math.floor((totalLevel + 1) * 0.2 * planet.silverCap);
};

export let getSilver = (planet) => {
  if (!planet) return 0;
  return Math.floor(planet.silver);
};
