import bigInt from '/vendor/big-integer.js';

const LOCATION_ID_UB = bigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

// TODO: Is this the same value?
const locationIdFromDecStr = (location) => {
  const locationBI = bigInt(location);
  if (locationBI.geq(LOCATION_ID_UB)) throw new Error('not a valid location');
  let ret = locationBI.toString(16);
  while (ret.length < 64) ret = '0' + ret;
  return ret;
};

export class RemoteWorker {
  constructor(url) {
    this.url = url || 'http://0.0.0.0:8000/mine';
  }

  async postMessage(msg) {
    const msgJson = JSON.parse(msg);

    const resp = await fetch(this.url, {
      method: 'POST',
      body: JSON.stringify({
        chunkFootprint: msgJson.chunkFootprint,
        planetRarity: msgJson.planetRarity,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const exploredChunk = await resp.json();

    const chunkCenter = {
      x: exploredChunk.chunkFootprint.bottomLeft.x + exploredChunk.chunkFootprint.sideLength / 2,
      y: exploredChunk.chunkFootprint.bottomLeft.y + exploredChunk.chunkFootprint.sideLength / 2,
    };

    exploredChunk.perlin = perlin(chunkCenter, false);
    for (const planetLoc of exploredChunk.planetLocations) {
      planetLoc.hash = locationIdFromDecStr(planetLoc.hash);
      planetLoc.perlin = perlin({ x: planetLoc.coords.x, y: planetLoc.coords.y });
      planetLoc.biomebase = perlin({ x: planetLoc.coords.x, y: planetLoc.coords.y }, true, true);
    }

    this.onmessage({ data: JSON.stringify([chunker, msgJson.jobId]) });
  }

  onmessage = () => { };
  terminate = () => { };
}
