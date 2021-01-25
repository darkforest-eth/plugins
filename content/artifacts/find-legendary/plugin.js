let { locationIdToDecStr, locationIdFromDecStr } = df.getCheckedTypeUtils();

// Exploit calculator script
let script = `
import web3Utils from 'https://cdn.skypack.dev/web3-utils';
let { toBN } = web3Utils;

function isExploitableMove(locationIdInDec, moveNumber) {
  // https://blog.8bitzen.com/posts/18-03-2019-keccak-abi-encodepacked-with-javascript/
  let seed = web3Utils.soliditySha3(
    locationIdInDec,
    locationIdInDec,
    moveNumber
  );
  let artifactSeed = toBN(seed);
  let lastByteOfSeed = artifactSeed.mod(toBN(0xFF));
  let secondLastByteOfSeed = artifactSeed.sub(lastByteOfSeed).div(toBN(256)).mod(toBN(0xFF));

  return (secondLastByteOfSeed < 4);
}

onmessage = ({ data: [locationIdInDec, startMoveNumber, moveWindow] }) => {
  nextMove:
  for (let x = toBN(startMoveNumber); true; x++) {
    for (let w = 0; w < moveWindow; w++) {
      if (!isExploitableMove(locationIdInDec, x + w)) {
        continue nextMove;
      }
    }
    // To keep everything in sync
    // planetId, exploit move number, moveWindow
    postMessage([locationIdInDec, x, moveWindow]);
    break nextMove;
  }
}
`

let scriptAsUrl = URL.createObjectURL(new Blob([script], {
  type: 'text/javascript'
}));

function getRandomActionId() {
  const hex = '0123456789abcdef';

  let ret = '';
  for (let i = 0; i < 10; i += 1) {
    ret += hex[Math.floor(hex.length * Math.random())];
  }
  return ret;
};

function toNumber(bn) {
  if (typeof bn === 'number') {
    return bn;
  }

  if (typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }

  return parseInt(bn, 10);
}

class Plugin {
  constructor() {
    this.running = true;
    this.watchMoves();

    this.moveWindow = 2;
    this.planetLevel = 3;

    this.lastAttempt = null;

    this.currentMoveMessage = document.createElement('div');
    this.currentMoveMessage.innerText = 'Current move: ???';

    this.nextAttemptMessage = document.createElement('div');
    this.nextAttemptMessage.innerText = 'Next attempt: N/A';

    this.attemptedLink = document.createElement('span');
    this.attemptedLink.style.textDecoration = 'underline';
    this.attemptedLink.style.cursor = 'pointer';
    this.attemptedLink.style.color = 'rgb(0, 173, 225)';
    this.attemptedLink.innerText = 'N/A';
    this.attemptedLink.onclick = () => {
      if (this.lastAttempt) {
        ui.centerLocationId(this.lastAttempt);
      }
    }

    this.attemptedMessage = document.createElement('div');
    this.attemptedMessage.innerHTML = '<span>Attempted on: </span>'
    this.attemptedMessage.appendChild(this.attemptedLink);

    this.worker = new Worker(scriptAsUrl, {
      type: 'module'
    });

    this.queuedMints = new Map();
    this.order = [];

    this.worker.onmessage = async ({ data: [locationIdInDec, exploitMove, moveWindow] }) => {
      let locationId = locationIdFromDecStr(locationIdInDec);
      let planet = df.getPlanetWithId(locationId);
      if (planet) {
        let snarkArgs = await df.snarkHelper.getFindArtifactArgs(
          planet.location.coords.x,
          planet.location.coords.y
        );
        this.queuedMints.set(toNumber(exploitMove), [
          planet.location,
          snarkArgs,
          getRandomActionId()
        ]);
      }
      this.cleanup();
    }
  }

  cleanup() {
    let order = [];
    let currentMove = toNumber(this.currentMove);
    for (let [moveNumber, [loc]] of this.queuedMints) {
      if (loc.hash === this.lastAttempt || moveNumber < currentMove) {
        this.queuedMints.delete(moveNumber);
      } else {
        order.push(moveNumber);
      }
    }
    this.order = order.sort((a, b) => a - b);
    // console.log('[EXPLOIT] Remaining queue:', this.queuedMints, this.order);
  }

  watchMoves = async () => {
    while (this.running) {
      try {
        this.currentMove = await df.contractsAPI.coreContract.planetEventsCount();
        let attempt = this.queuedMints.get(toNumber(this.currentMove));
        if (attempt) {
          // console.log('[EXPLOIT] Attempt at:', this.currentMove.toString());
          let [location, snarkArgs, actionId] = attempt;
          try {
            // Don't choke the send
            await df.contractsAPI.findArtifact(
              location,
              snarkArgs,
              actionId
            );
          } catch (err) {
            console.log('error finding artifact', err);
          }
          this.attemptedLink.innerText = location.hash.slice(4, 9);
          this.lastAttempt = location.hash;
          this.cleanup();
        }
        // console.log('[EXPLOIT] Current move:', this.currentMove.toString());
        this.currentMoveMessage.innerText = `Current move: ${this.currentMove.toString()}`;
        if (this.order.length) {
          let next = this.order[0] - this.currentMove;
          if (next < 0) {
            this.cleanup();
          }
          this.nextAttemptMessage.innerText = `Next attempt: ${next}`;
          // console.log('[EXPLOIT] Next in:', this.order[0] - this.currentMove);
        }
      } catch (err) {
        console.log('error getting moves', err);
      }
    }
  }

  render(container) {
    container.parentElement.style.minHeight = 'unset';
    container.style.minHeight = 'unset';

    container.style.width = '200px';

    let message = document.createElement('div');
    message.innerText = `Higher move window level equals higher chance to exploit.`;

    let moveWindowLabel = document.createElement('span');
    moveWindowLabel.innerText = 'Move window:';

    let moveWindow = document.createElement('select');
    moveWindow.style.background = 'rgb(8,8,8)';
    moveWindow.style.display = 'inline-block';
    moveWindow.style.marginTop = '10px';
    moveWindow.style.marginBottom = '10px';
    [1, 2, 3].forEach(mw => {
      let opt = document.createElement('option');
      opt.value = `${mw}`;
      opt.innerText = `${mw} moves`;
      moveWindow.appendChild(opt);
    });
    moveWindow.value = `${this.moveWindow}`;
    moveWindow.onchange = () => {
      this.moveWindow = parseInt(moveWindow.value, 10);
    };

    let selectedButton = document.createElement('button');
    selectedButton.style.display = 'block';
    selectedButton.style.width = '100%';
    selectedButton.innerText = 'Exploit selected!';
    selectedButton.onclick = () => {
      let planet = ui.getSelectedPlanet();
      if (planet && this.currentMove) {
        let locationIdInDec = locationIdToDecStr(planet.locationId);
        this.worker.postMessage([
          locationIdInDec,
          this.currentMove.toString(),
          this.moveWindow
        ]);
      }
    }

    let legMsg = document.createElement('div');
    legMsg.innerText = 'Only Level 3+ planets can mint Legendaries.';

    let planetLevelLabel = document.createElement('label');
    planetLevelLabel.innerText = 'Planet lvl:';

    let planetLevel = document.createElement('select');
    planetLevel.style.background = 'rgb(8,8,8)';
    planetLevel.style.display = 'inline-block';
    planetLevel.style.marginTop = '10px';
    planetLevel.style.marginBottom = '10px';
    [0, 1, 2, 3, 4, 5, 6, 7].forEach(lvl => {
      let opt = document.createElement('option');
      opt.value = `${lvl}`;
      opt.innerText = `Level ${lvl}`;
      planetLevel.appendChild(opt);
    });
    planetLevel.value = `${this.planetLevel}`;
    planetLevel.onchange = () => {
      this.planetLevel = parseInt(planetLevel.value, 10);
    };

    let allButton = document.createElement('button');
    allButton.style.display = 'block';
    allButton.style.width = '100%';
    allButton.style.marginBottom = '10px';
    allButton.innerText = 'Exploit all artifacts!';
    allButton.onclick = () => {
      let planetsWithArtifacts = df.getMyPlanets().filter(planet => {
        return (
          planet.planetLevel >= this.planetLevel &&
          df.isPlanetMineable(planet) &&
          !planet.hasTriedFindingArtifact
        );
      });
      // console.log(planetsWithArtifacts);
      for (let planet of planetsWithArtifacts) {
        if (planet && this.currentMove) {
          let locationIdInDec = locationIdToDecStr(planet.locationId);
          this.worker.postMessage([
            locationIdInDec,
            this.currentMove.toString(),
            this.moveWindow
          ]);
        }
      }
    }

    container.appendChild(message);
    container.appendChild(moveWindowLabel);
    container.appendChild(moveWindow);
    container.appendChild(selectedButton);
    container.appendChild(legMsg);
    container.appendChild(planetLevelLabel);
    container.appendChild(planetLevel);
    container.appendChild(allButton);
    container.appendChild(this.currentMoveMessage);
    container.appendChild(this.nextAttemptMessage);
    container.appendChild(this.attemptedMessage);
  }

  destroy() {
    this.running = false;
  }
}

plugin.register(new Plugin());
