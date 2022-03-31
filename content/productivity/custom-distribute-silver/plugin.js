// Custom distribute Silver
//
// The "silver-spacetime" plugin has done a lot of automated works, however sometimes we have to make special configuration.
// For example: asteroid is too far away from spacetime rip, silver can not send directly, in this case the "silver-spacetime" plugins don't work.
// Use this plugin, we can first send silver from asteroid to a middle planet, and then send to spacetime rip.
//
// Custom distribute silver based on your selection of source(asteroid or middle planet) and target(middle planet or spacetime rip) , we call them a pair.
// After test a pair(use the "Test" button), you can add the pair to the pair list(use the "AddList" button).
// "Back up" by downloading the pair list, and upload the pair list when you restart the browser and the plugin.
//
// Constants
// MAX_CONCURRENT_NUM       :   Max concurrent ( withdraws + moves) num
// MIN_SILVER_SEND          :   Min silver moves per time
// MIN_DISTRIBUTE_PERCENT   :   Never send less than 90% of silverCap (except silverCap of the target planet is too small)
// AUTO_SECONDS             :   Trigger auto silver move and withdraw every 30 seconds

import {
  PlanetType,
  PlanetLevel,
  PlanetLevelNames,
} from "https://cdn.skypack.dev/@darkforest_eth/types"

import {
  getPlanetName
} from "https://cdn.skypack.dev/@darkforest_eth/procedural";


// Max concurrent ( withdraws + moves) num
const MAX_CONCURRENT_NUM = 5;

// Min silver moves per time
const MIN_SILVER_SEND = 2000;

// Never send less than 90% of silverCap (except silverCap of the target planet is too small)
const MIN_DISTRIBUTE_PERCENT = 90;

// Trigger auto silver move and withdraw every 30 seconds
const AUTO_SECONDS = 30;


// removes all the child nodes of an element
var removeAllChildNodes = (parent) => {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
};

// makes a (sometimes) clickable planet link
var planetLink = (locationId, clickable = true) => {
    const planet = df.getPlanetWithId(locationId);
    const planetElement = document.createElement(clickable ? "button" : "span");
    planetElement.innerText = `L${planet.planetLevel}R${planet.upgradeState.reduce((a, b) => a + b, 0)} ${getPlanetName(planet)}`;
    planetElement.title = locationId;
    planetElement.style.textDecoration = "underline";
    planetElement.style.background = "none";
    planetElement.style.border = "none";
    planetElement.style.color = "white";
    planetElement.style.outline = "none";
    planetElement.style.padding = "0";
    if (clickable) {
        planetElement.addEventListener("click", () => {
            ui.centerLocationId(locationId);
        });
    }
    return planetElement;
};

var addPair = (fromId, toId) => {
    const pairElement = document.createElement("span");
    pairElement.append(planetLink(fromId));
    pairElement.append(' => ');
    pairElement.append(planetLink(toId));
    return pairElement;
}

class Plugin {
  constructor() {
    this.planetSource = '';
    this.planetTarget = '';
    this.pairList = [];
    this.autoSeconds = AUTO_SECONDS;
  }

  sendAndWithdraw(planetSource, planetTarget) {
    console.log(`${this.planetSource} => ${this.planetTarget}`);
    if (planetTarget) {
      if (isSpaceRift(df.getPlanetWithId(planetTarget))) {
        withdrawSilver(planetTarget);
      }
      if (planetSource) {
        sendSilver(planetSource, planetTarget);
      }
    }
  }

  autoSendAndWithdraw() {
    if (df.getUnconfirmedMoves().length >= MAX_CONCURRENT_NUM) {
      console.log(`too many unconfirmed moves`);
      return;
    }
    let i = 0;
    for (const item of this.pairList) {
      const planetSource = item[0];
      const planetTarget = item[1];
      if (planetTarget) {
        if (isSpaceRift(df.getPlanetWithId(planetTarget))) {
          if (withdrawSilver(planetTarget) != 0) {
            i++;
          }
        }
        if (planetSource) {
          if (sendSilver(planetSource, planetTarget) != 0) {
            i++;
          }
        }
      }
      if (i >= MAX_CONCURRENT_NUM) {
        break;
      }
    }
  }

  renderPairList(pairListContainer) {
    removeAllChildNodes(pairListContainer);

    for (const item of this.pairList) {
      const pairElement = addPair(item[0], item[1]);
      pairListContainer.append(pairElement);

      // deleteButton for remove pair from the list
      const delButton = document.createElement("button");
      pairListContainer.append(delButton);
      delButton.innerText = "Del";
      delButton.style.marginLeft = "10px";
      delButton.addEventListener("click", () => {
        for (let i=0; i<this.pairList.length; i++) {
          if (this.pairList[i][0] == item[0] && this.pairList[i][1] == item[1]) {
            this.pairList.splice(i, 1);
            break;
          }
        }
        this.renderPairList(pairListContainer);
      });

      // new line
      const newLine = document.createElement("br");
      pairListContainer.append(newLine);
    }

  }

  render(container) {
    container.parentElement.style.minHeight = 'unset';
    container.style.minHeight = 'unset';
    container.style.width = '460px';

    // source display
    const sourcePlanetContainer = document.createElement("div");
    sourcePlanetContainer.innerText = "Current source: none";
    // button for adding an source
    const addPlanetSourceButton = document.createElement("button");
    addPlanetSourceButton.innerText = "Add source";
    addPlanetSourceButton.style.marginRight = "10px";
    addPlanetSourceButton.addEventListener("click", () => {
      removeAllChildNodes(sourcePlanetContainer);
      const sourcePlanet = ui.getSelectedPlanet();
      if (sourcePlanet) {
          this.planetSource = sourcePlanet.locationId;
      }
      // make the planet either be "none" when nothing is selected, or the planet link.
      sourcePlanetContainer.append("Current source: ", sourcePlanet ? planetLink(sourcePlanet.locationId) : "none");
    });

    // target display
    const targetPlanetContainer = document.createElement("div");
    targetPlanetContainer.innerText = "Current target: none";
    // button for adding an target
    const addPlanetTargetButton = document.createElement("button");
    addPlanetTargetButton.innerText = "Add target";
    addPlanetTargetButton.style.marginRight = "10px";
    addPlanetTargetButton.addEventListener("click", () => {
      removeAllChildNodes(targetPlanetContainer);
      const targetedPlanet = ui.getSelectedPlanet();
      if (targetedPlanet) {
          this.planetTarget = targetedPlanet.locationId;
      }
      // make the planet either be "none" when nothing is selected, or the planet link.
      targetPlanetContainer.append("Current target: ", targetedPlanet ? planetLink(targetedPlanet.locationId) : "none");
    });

    // button for test the pair (source => target)
    const testButton = document.createElement("button");
    testButton.innerText = "Test";
    testButton.style.marginRight = "10px";
    testButton.addEventListener("click", () => {
      this.sendAndWithdraw(this.planetSource, this.planetTarget);
    });

    // addButton for append pair to the list
    const addButton = document.createElement("button");
    addButton.innerText = "AddList";
    addButton.style.marginRight = "10px";
    addButton.addEventListener("click", () => {
      for (const item of this.pairList) {
        if (item[0] == this.planetSource && item[1] == this.planetTarget) {
          console.log('add duplicate pair, ignore it');
          return;
        }
      }
      const pair = [this.planetSource, this.planetTarget];
      this.pairList.splice(0, 0, pair);
      this.renderPairList(pairListContainer);
    });

    // pair list display
    const pairListContainer = document.createElement("div");
    pairListContainer.innerText = "Pair list: none";
    pairListContainer.style.marginTop = '10px';

    /*
    // clearButton
    const clearButton = document.createElement("button");
    clearButton.innerText = "!!! ClearList !!!";
    clearButton.style.marginRight = "10px";
    clearButton.style.marginBottom = '10px';
    clearButton.addEventListener("click", () => {
      this.pairList = [];
      this.renderPairList(pairListContainer);
    });
    */

    // downloadButton
    const downloadButton = document.createElement("button");
    downloadButton.innerText = "Download Pairlist";
    downloadButton.style.marginRight = "10px";
    downloadButton.style.marginBottom = '10px';
    downloadButton.addEventListener("click", () => {
      let pairs = JSON.stringify(this.pairList);
      var blob = new Blob([pairs], { type: 'application/json' }),
      anchor = document.createElement('a');
      anchor.download = new Date().toLocaleString() + "_" + df.getAccount() + '_Silver-pairs.json';
      anchor.href = (window.webkitURL || window.URL).createObjectURL(blob);
      anchor.dataset.downloadurl = ['application/json', anchor.download, anchor.href].join(':');
      anchor.click();
    });

    // uploadButton
    const uploadButton = document.createElement("button");
    uploadButton.innerText = "Upload Pairlist";
    uploadButton.style.marginRight = "10px";
    uploadButton.style.marginBottom = '10px';
    uploadButton.addEventListener("click", () => {
      let inputFile = document.createElement('input');
      inputFile.type = 'file';
      inputFile.onchange = () => {
        try {
          var file = inputFile.files.item(0);
          var reader = new FileReader();
          reader.onload = () => {
            this.pairList = JSON.parse(reader.result);
            this.renderPairList(pairListContainer);
          };
          reader.readAsText(file);
        } catch (err) {
          console.error(err);
          return;
        }
      }
      inputFile.click();
    });


    // button for test the whole pairlist
    let globalButton = document.createElement('button');
    globalButton.style.width = '100%';
    globalButton.style.marginBottom = '10px';
    globalButton.innerHTML = 'Send Silver & Withdraw!'
    globalButton.onclick = () => {
      this.autoSendAndWithdraw();
    }

    // auto
    let autoSecondsStepper = document.createElement('input');
    autoSecondsStepper.type = 'range';
    autoSecondsStepper.min = '30';
    autoSecondsStepper.max = '600';
    autoSecondsStepper.step = '30';
    autoSecondsStepper.value = `${this.autoSeconds}`;
    autoSecondsStepper.style.width = '100%';
    autoSecondsStepper.style.height = '24px';

    let autoSecondsInfo = document.createElement('span');
    autoSecondsInfo.innerText = `Every ${autoSecondsStepper.value} seconds`;
    autoSecondsInfo.style.display = 'block';
    autoSecondsInfo.style.marginTop = '10px';

    autoSecondsStepper.onchange = (evt) => {
      try {
        this.autoSeconds = parseInt(evt.target.value, 10);
        autoSecondsInfo.innerText = `Every ${autoSecondsStepper.value} seconds`;
      } catch (e) {
        console.error('could not parse auto seconds', e);
      }
    }

    let autoLabel = document.createElement('label');
    autoLabel.innerHTML = 'Auto Send Silver & Withdraw';
    autoLabel.style.paddingRight = "10px";

    let autoSilverCheck = document.createElement('input');
    autoSilverCheck.type = "checkbox";
    autoSilverCheck.style.marginRight = "10px";
    autoSilverCheck.checked = false;
    autoSilverCheck.onchange = (evt) => {
      if (evt.target.checked) {
        this.timerId = setInterval(() => {
          setTimeout(this.autoSendAndWithdraw.bind(this), 0);
        }, 1000 * this.autoSeconds)
      } else {
        if (this.timerId) {
          clearInterval(this.timerId);
        }
      }
    };

    container.appendChild(sourcePlanetContainer);
    container.appendChild(targetPlanetContainer);
    container.appendChild(addPlanetSourceButton);
    container.appendChild(addPlanetTargetButton);
    container.appendChild(testButton);
    container.appendChild(addButton);
    container.appendChild(pairListContainer);
    container.appendChild(downloadButton);
    container.appendChild(uploadButton);
    container.appendChild(globalButton);
    container.appendChild(autoSecondsInfo);
    container.appendChild(autoSecondsStepper);
    container.appendChild(autoLabel);
    container.appendChild(autoSilverCheck);
  }

  destroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }
}

function sendSilver(fromId, toId, maxDistributeEnergyPercent = 99) {
  const from = df.getPlanetWithId(fromId);
  const to   = df.getPlanetWithId(toId);

  // Rejected if has more than 5 pending arrivals. Transactions are reverted when more arrives. You can't increase it
  const unconfirmed = getUnconfirmedsForPlanet(to);
  const arrivals = getArrivalsForPlanet(to);
  if (unconfirmed.length + arrivals.length > 4) {
    console.log(`too many pending arrivals`);
    return 0;
  }

  // skip if `fromId` have unconfirmed sends
  if (getUnconfirmedsFromPlanet(fromId).length != 0) {
    console.log(`pending send`);
    return 0;
  }
  
  let silverSpaceLeft = Math.floor(to.silverCap - to.silver) - Math.ceil(getArrivalsSilverForPlanet(toId));
  if (silverSpaceLeft < MIN_SILVER_SEND) {
    console.log(`too little silver space `);
    return 0;
  }

  const energyLeft = Math.floor((maxDistributeEnergyPercent / 100) * from.energy);

  // needs to be a whole number for the contract
  const energyNeeded = Math.ceil(df.getEnergyNeededForMove(fromId, toId, 8));
  if (energyLeft - energyNeeded < 0) {
    console.log(`not enough energy`);
    return 0;
  }

  let silverNeeded = 0;
  const minDistributeSilver = from.silverCap * MIN_DISTRIBUTE_PERCENT / 100;
  console.log(`from.silver: ${from.silver} minDistributeSilver: ${minDistributeSilver} silverSpaceLeft: ${silverSpaceLeft}`);
  if (from.silver > minDistributeSilver) {
    // source is near full
    silverNeeded = silverSpaceLeft > Math.floor(from.silver) ? Math.floor(from.silver) : silverSpaceLeft;
    console.log(`planA`)
  } else {
    // source is not full
    if (silverSpaceLeft < from.silver) {
      silverNeeded = Math.floor(silverSpaceLeft);
      console.log(`planB`)
    } else {
      console.log(`silver source not full`);
    }
  }
  if (silverNeeded != 0) {
    console.log(`L${from.planetLevel} => L${to.planetLevel} ${silverNeeded}`);
    df.move(fromId, toId, energyNeeded, silverNeeded);
  }

  return silverNeeded;
}

function withdrawSilver(fromId) {
  const from = df.getPlanetWithId(fromId);
  const silver = Math.floor(from.silver);
  if (silver === 0) {
    return 0;
  }
  if (!isSpaceRift(from)) {
    return 0;
  }
  if (from.unconfirmedWithdrawSilver) {
    return 0;
  }
  console.log(`withdrawSilver from L${from.planetLevel} ${silver}`);
  df.withdrawSilver(fromId, silver);
  return silver;
}

function isAsteroid(planet) {
  return planet.planetType === PlanetType.SILVER_MINE;
}

function isSpaceRift(planet) {
  return planet.planetType === PlanetType.TRADING_POST;
}

function getArrivalsForPlanet(planetId) {
  return df.getAllVoyages().filter(arrival => arrival.toPlanet === planetId).filter(p => p.arrivalTime > Date.now() / 1000);
}

function getUnconfirmedsForPlanet(planetId) {
  return df.getUnconfirmedMoves().filter(move => move.to === planetId);
}

function getUnconfirmedsFromPlanet(planetId) {
  return df.getUnconfirmedMoves().filter(move => move.from === planetId);
}

function getArrivalsSilverForPlanet(planetId) {
  const arrivals = getArrivalsForPlanet(planetId);
  const unconfirmeds = getUnconfirmedsForPlanet(planetId);
  let silver = 0;
  if (arrivals.length != 0) {
    for (let arrival of arrivals) {
      silver += arrival.silverMoved;
    } 
  }
  if (unconfirmeds.length != 0) {
    for (let unconfirmed of unconfirmeds) {
      silver += unconfirmed.silver;
    }
  }
  return silver;
}

export default Plugin;
