import Emitter from 'https://cdn.skypack.dev/mitt';
import range from 'https://cdn.skypack.dev/lodash.range';
import perlin from '/miner/perlin.js';

export const MinerManagerEvent = {
  DiscoveredNewChunk: 'DiscoveredNewChunk',
}

export class MinerManager extends Emitter {
  minedChunksStore = null;
  isExploring = false;
  miningPattern = null;
  workers = null;
  worldRadius = null;
  planetRarity = null;
  cores = 1;
  // chunks we're exploring
  exploringChunk = {};
  // when we started exploring this chunk
  exploringChunkStart = {};
  minersComplete = {};
  currentJobId = 0;
  WorkerCtor = null;

  constructor(minedChunksStore, miningPattern, worldRadius, planetRarity, WorkerCtor) {
    super();

    this.WorkerCtor = WorkerCtor;

    this.minedChunksStore = minedChunksStore;
    this.miningPattern = miningPattern;
    this.worldRadius = worldRadius;
    this.planetRarity = planetRarity;
    // this.cores = navigator.hardwareConcurrency;
    this.workers = [];
  }

  setMiningPattern(pattern) {
    this.miningPattern = pattern;

    if (this.isExploring) {
      this.stopExplore();
      this.startExplore();
    }
  }

  getMiningPattern() {
    return this.miningPattern;
  }

  destroy() {
    this.workers.map((x) => x.terminate());
  }

  static create(chunkStore, miningPattern, worldRadius, planetRarity) {
    const minerManager = new MinerManager(
      chunkStore,
      miningPattern,
      worldRadius,
      planetRarity,
      useMockHash
    );
    range(minerManager.cores).forEach((i) => minerManager.initWorker(i));

    return minerManager;
  }

  initWorker(index) {
    this.workers[index] = new this.WorkerCtor();
    this.workers[index].onmessage = (e) => {
      // worker explored a slice of a chunk
      const [exploredChunk, jobId] = JSON.parse(e.data);
      const chunkKey = this.chunkLocationToKey(
        exploredChunk.chunkFootprint,
        jobId
      );
      this.exploringChunk[chunkKey].planetLocations.push(
        ...exploredChunk.planetLocations
      );

      this.minersComplete[chunkKey] += 1;
      if (this.minersComplete[chunkKey] === this.workers.length) {
        this.onDiscovered(this.exploringChunk[chunkKey], jobId);
      }
    };
  }

  async onDiscovered(exploredChunk, jobId) {
    const discoveredLoc = exploredChunk.chunkFootprint;
    const chunkKey = this.chunkLocationToKey(discoveredLoc, jobId);
    const miningTimeMillis = Date.now() - this.exploringChunkStart[chunkKey];
    this.emit(
      MinerManagerEvent.DiscoveredNewChunk,
      exploredChunk,
      miningTimeMillis
    );
    delete this.exploringChunk[chunkKey];
    delete this.minersComplete[chunkKey];
    delete this.exploringChunkStart[chunkKey];

    if (this.isExploring && this.currentJobId === jobId) {
      this.exploreNext(discoveredLoc, jobId);
    }
  }

  exploreNext(fromChunk, jobId) {
    this.nextValidExploreTarget(fromChunk, jobId).then(
      (nextChunk) => {
        if (!!nextChunk) {
          const nextChunkKey = this.chunkLocationToKey(nextChunk, jobId);
          const center = {
            x: nextChunk.bottomLeft.x + nextChunk.sideLength / 2,
            y: nextChunk.bottomLeft.y + nextChunk.sideLength / 2,
          };
          const centerPerlin = perlin(center, false);
          this.exploringChunk[nextChunkKey] = {
            chunkFootprint: nextChunk,
            planetLocations: [],
            perlin: centerPerlin,
          };
          this.exploringChunkStart[nextChunkKey] = Date.now();
          this.minersComplete[nextChunkKey] = 0;
          this.sendMessageToWorkers(nextChunk, jobId);
        }
      }
    );
  }

  setCores(nCores) {
    this.stopExplore();
    this.workers.map((x) => x.terminate());
    this.workers = [];

    this.cores = nCores;
    range(this.cores).forEach((i) => this.initWorker(i));
    this.startExplore();

    const terminalEmitter = TerminalEmitter.getInstance();
    terminalEmitter.println(`Now mining on ${nCores} core(s).`);
  }

  startExplore() {
    // increments the current job ID
    if (!this.isExploring) {
      this.isExploring = true;
      this.currentJobId += 1;
      const jobId = this.currentJobId;
      this.exploreNext(this.miningPattern.fromChunk, jobId);
    }
  }

  stopExplore() {
    this.isExploring = false;
  }

  getCurrentlyExploringChunk() {
    if (!this.isExploring) {
      return null;
    }

    for (const key in this.exploringChunk) {
      const res = this.chunkKeyToLocation(key);
      if (res) {
        const [chunkLocation, jobId] = res;
        if (jobId === this.currentJobId) {
          return chunkLocation;
        }
      }
    }
    return null;
  }

  setRadius(radius) {
    this.worldRadius = radius;
  }

  async nextValidExploreTarget(chunkLocation, jobId) {
    // returns the first valid chunk equal to or after `chunk` (in the explore order of mining pattern) that hasn't been explored
    // async because it may take indefinitely long to find the next target. this will block UI if done sync
    // we use this trick to promisify:
    // https://stackoverflow.com/questions/10344498/best-way-to-iterate-over-an-array-without-blocking-the-ui/10344560#10344560

    // this function may return null if user chooses to stop exploring or changes mining pattern in the middle of its resolution
    // so any function calling it should handle the null case appropriately
    let candidateChunk = chunkLocation;
    let count = 10000;
    while (!this.isValidExploreTarget(candidateChunk) && count > 0) {
      candidateChunk = this.miningPattern.nextChunk(candidateChunk);
      count -= 1;
    }
    // since user might have switched jobs or stopped exploring during the above loop
    if (!this.isExploring && jobId !== this.currentJobId) {
      return null;
    }
    if (this.isValidExploreTarget(candidateChunk)) {
      return candidateChunk;
    }
    return new Promise((resolve) => {
      setTimeout(async () => {
        const nextNextChunk = await this.nextValidExploreTarget(
          candidateChunk,
          jobId
        );
        resolve(nextNextChunk);
      }, 0);
    });
  }

  isValidExploreTarget(chunkLocation) {
    const { bottomLeft, sideLength } = chunkLocation;
    const xCenter = bottomLeft.x + sideLength / 2;
    const yCenter = bottomLeft.y + sideLength / 2;
    const xMinAbs = Math.abs(xCenter) - sideLength / 2;
    const yMinAbs = Math.abs(yCenter) - sideLength / 2;
    const squareDist = xMinAbs ** 2 + yMinAbs ** 2;
    // should be inbounds, and unexplored
    return (
      squareDist < this.worldRadius ** 2 &&
      !this.minedChunksStore.hasMinedChunk(chunkLocation)
    );
  }

  sendMessageToWorkers(chunkToExplore, jobId) {
    for (
      let workerIndex = 0;
      workerIndex < this.workers.length;
      workerIndex += 1
    ) {
      const msg = {
        chunkFootprint: chunkToExplore,
        workerIndex,
        totalWorkers: this.workers.length,
        planetRarity: this.planetRarity,
        jobId,
        useMockHash: this.useMockHash,
      };
      this.workers[workerIndex].postMessage(JSON.stringify(msg));
    }
  }

  chunkLocationToKey(chunkLocation, jobId) {
    const x = chunkLocation.bottomLeft.x;
    const y = chunkLocation.bottomLeft.y;
    const sideLength = chunkLocation.sideLength;
    return `${x},${y},${sideLength},${jobId}`;
  }

  chunkKeyToLocation(chunkKey) {
    // returns chunk footprint and job id
    try {
      const [x, y, sideLength, jobId] = chunkKey
        .split(',')
        .map((v) => parseInt(v));
      return [
        {
          bottomLeft: { x, y },
          sideLength,
        },
        jobId,
      ];
    } catch (e) {
      console.error(`error while deserializing miner chunk key: ${e}`);
      return null;
    }
  }
}
