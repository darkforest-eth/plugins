// Artifacts Finder
// This plugin can help auto prospect and find artifacts.
// Simple is Power!

// Author: SnowTiger
// If you feel this plugin is helpful, you can transfer a small donation
// to this xDai Account: 0xaa23208770da9ae738a7a5069bcdfdc06e487821

const {
    BiomeNames,
    energy,
    coords,
    canHaveArtifact,
} = await import('https://plugins.zkga.me/utils/utils.js');


// 10 minutes
let AUTO_INTERVAL = 1000 * 60 * 10;


function blocksLeftToProspectExpiration(
    currentBlockNumber,
    prospectedBlockNumber
) {
    return (prospectedBlockNumber || 0) + 255 - currentBlockNumber;
}

function prospectExpired(currentBlockNumber, prospectedBlockNumber) {
    return blocksLeftToProspectExpiration(currentBlockNumber, prospectedBlockNumber) <= 0;
}

function isFindable(planet, currentBlockNumber) {
    return (
        currentBlockNumber !== undefined &&
        df.isPlanetMineable(planet) &&
        planet.prospectedBlockNumber !== undefined &&
        !planet.hasTriedFindingArtifact &&
        !prospectExpired(currentBlockNumber, planet.prospectedBlockNumber)
    );
}

function isProspectable(planet) {
    return df.isPlanetMineable(planet) && planet.prospectedBlockNumber === undefined && !planet.unconfirmedProspectPlanet;
}

function enoughEnergyToProspect(p) {
    return energy(p) >= 96;
}

function createDom(tag, text) {
  let dom = document.createElement(tag);
  if (text) {
    let now = new Date();
    now = (now.getMonth() + 1) + "-" + now.getDate() + " " + now.getHours() +
                            ":" + now.getMinutes() + ":" + now.getSeconds()
    dom.innerText = "[" + now + "] " + text;
  }
  return dom;
}

class ArtifactsFinder {
    constructor() {
        this.logs = null;
        this.timerId = null;
        this.finding = false;
        this.findArtifactsButton = createDom('button');
    }

    findArtifacts() {
        let currentBlockNumber = df.contractsAPI.ethConnection.blockNumber;
        Array.from(df.getMyPlanets())
            .filter(canHaveArtifact)
            .forEach(planet => {
                try {
                    let biome = BiomeNames[planet.biome];
                    let log = {
                        planet: planet
                    }
                    if (isFindable(planet, currentBlockNumber)) {
                        df.findArtifact(planet.locationId);
                        log.action = 'Finding'
                    } else if (isProspectable(planet) && enoughEnergyToProspect(planet)) {
                        df.prospectPlanet(planet.locationId);
                        log.action = 'Prospecting'
                    }
                    if (log.action) {
                        let dom = createDom("div", log.action + " LV" + planet.planetLevel + " " +
                            biome + " at " + coords(planet));
                        dom.addEventListener('click', function (){
                            ui.centerPlanet(planet)
                        });
                        this.logs.appendChild(dom);
                    }
                } catch (err) {
                    console.log(err);
                }
            });
    }

    startFind() {
        if (this.timerId) {
            clearInterval(this.timerId);
        }
        this.finding = !this.finding;
        if (this.finding) {
            this.logs.appendChild(createDom("div", "Start Finding"));
            this.findArtifacts();
            this.timerId = setInterval(this.findArtifacts.bind(this), AUTO_INTERVAL);
            this.findArtifactsButton.innerText = " Cancel Finding ";
        } else {
            this.findArtifactsButton.innerText = ' Start Find ';
            this.logs.appendChild(createDom("div", "Cancel Find"))
        }
    }

    async render(container) {
        let self = this;
        container.style.width = '450px';
        this.findArtifactsButton.innerText = ' Start Find ';
        container.appendChild(this.findArtifactsButton);
        container.appendChild(createDom('br'));
        container.appendChild(createDom('br'));
        this.findArtifactsButton.addEventListener('click', () => {
            self.startFind()
        });
        this.logs = createDom('div');
        container.appendChild(this.logs);
        this.logs.style.maxHeight = '300px';
        this.logs.style.overflowX = 'hidden';
        this.logs.style.overflowY = 'scroll';
    }

    destroy() {
        if (this.timerId) {
            clearInterval(this.timerId);
        }
    }
}

export default ArtifactsFinder;