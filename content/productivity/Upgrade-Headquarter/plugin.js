// Upgrade Headquarter by STX
// Manage your empire upgrades faster from one place. Quick view of planets ready for upgrade.
//
// How to use:
// 1. Select your planet from map to know if is ready to upgrade or find How much silver miss to be able to do.
// 2. Select your planel from list ready to upgrade. (scroll able)
// 3. Upgrade all your plannets from one place
// 4. Upgrades all the planets in your empire every minute according to a pattern (d = defense, r = range, s = speed)
// for example, if the pattern is "rrrsd" a rank 3 planet that can upgrade will choose to upgrade the speed branch
//=== This plugin give you the opportunity to upgrade planet/s manualy per selection from map/list with overview of needed amount silver.
//=== Manager for automatic upgrade whole empire
//
// Combination of:
//  Quick-upgrade plugin - originaly remixed from https://gist.github.com/blurpesec/ddd8c7a670a2f8f9f3a28b02c1ff0897 by @blurpesec
//  Upgrade able plugin by @Phated
//  Upgrade Manager plugin by @Bulmenisaurus
//
// added buttons title
// remixed Upgrade Manager container to html
// added comments
// format k/m/b for silver amount in planet upgradeable list

// Import Hyperscript Tagged Markup
import {
    html,
    render,
    useState,
    useEffect,
} from 'https://unpkg.com/htm/preact/standalone.module.js';

// Import Skypack - Throttled parallell async calls.
import {
    eachLimit
} from 'https://cdn.skypack.dev/async-es';

//Import game client icons
import {
    Defense,
    Range,
    Speed,
} from 'https://plugins.zkga.me/game/Icons.js';

// Import game utils
import {
    canStatUpgrade,
    canPlanetUpgrade,
    getPlanetRank,
    getSilver,
    getSilverNeeded,
} from 'https://plugins.zkga.me/utils/utils.js';

// Import Skypack constants types
import {
    PlanetType,
    UpgradeBranchName,
    SpaceType
} from "https://cdn.skypack.dev/@darkforest_eth/types"

// Default refresh 30 seconds
let REFRESH_INTERVAL = 1000 * 30;

// Constanst definitíon
const { getPlanetName } = df.getProcgenUtils();
//
const getPlanetMaxRank = (planet) => {
    if (!planet) return 0;

    if (planet.spaceType === SpaceType.NEBULA) return 3;
    else if (planet.spaceType === SpaceType.SPACE) return 4;
    else return 5;
};

// Constanst for collor pre-definition
const dfyellow = '#e8e228';
const subbertext = '#565656';

// if planet is not at max rank and has enough silver
const planetCanUpgrade = (planet) => {
    const totalRank = planet.upgradeState.reduce((a, b) => a + b);
    if (planet.spaceType === SpaceType.NEBULA && totalRank >= 3) return false;
    if (planet.spaceType === SpaceType.SPACE && totalRank >= 4) return false;
    if (planet.spaceType === SpaceType.DEEP_SPACE && totalRank >= 5) return false;
    if (planet.spaceType === SpaceType.DEAD_SPACE && totalRank >= 5) return false;
    return (
        planet.planetLevel !== 0 &&
        planet.planetType === PlanetType.PLANET &&
        planet.silver >= silverNeededForUpgrade(planet)
    );
};
// Functions definitíon
// Function to change collors according current lvl of upgrade deffault dark grey
function Subber({ children }) {
    return html`<span style=${{ color: subbertext, padding: '0 5px' }}>${children}</span>`;
}

// Function to change collors according current lvl of upgrade gold = current lvl
function Gold({ children }) {
    return html`<span style=${{ color: dfyellow, padding: '0 5px' }}>${children}</span>`;
}

// Function to start upgrade
function upgrade(planet, branch) {
    if (planet && canPlanetUpgrade(planet) && canStatUpgrade(planet, branch)) {
        df.upgrade(planet.locationId, branch)
    }
}

// Function to define current planetRank of planet and silver needs for next upprade
function SilverRequired({ planet }) {
    const maxRank = getPlanetMaxRank(planet);
    const silverPerRank = [];

    for (let i = 0; i < maxRank; i++) {
        silverPerRank[i] = Math.floor((i + 1) * 0.2 * planet.silverCap);
    }

    return silverPerRank.map(
        (silver, i) =>
            html`<span key=${i}>
          ${i === getPlanetRank(planet)
                    ? html`<${Gold}>${silver}<//>`
                    : html`<${Subber}>${silver}<//>`}
        </span>`
    );
}
// Function to define Upgrade buttons colors for selected planet - Def , Range , Speed
function UpgradeButton({ Icon, planet, branch }) {
    let isEnabled = canPlanetUpgrade(planet) && canStatUpgrade(planet, branch);

    let button = {
        opacity: isEnabled ? '1' : '0.5',
    };

    let label = {
        marginLeft: '5px',
    };

    let [iconColor, setIconColor] = useState('white');

    function colorBlack() {
        setIconColor('black');
    }

    function colorWhite() {
        setIconColor('white');
    }

    function onClick() {
        upgrade(planet, branch);
    }

    return html`
      <button style=${button} title='Upgrade '${Icon.name}' for selected planet' disabled=${!isEnabled} onClick=${onClick} onMouseOver=${colorBlack} onMouseOut=${colorWhite}>
        <${Icon} pathStyle=${{ fill: iconColor }} />
        <span style=${label}>Lvl ${planet.upgradeState[branch]}</span>
      </button>
    `;
}

// Function to define Upgrade buttons for all upgradeable planets - Def , Range , Speed
function UpgradeAllButton({ Icon, branch, onFeedback }) {
    let button = {
        paddingLeft: '10px',
        paddingRight: '10px',
    };

    let [iconColor, setIconColor] = useState('white');

    function colorBlack() {
        setIconColor('black');
    }

    function colorWhite() {
        setIconColor('white');
    }

    function onClick() {
        let myPlanets = df.getMyPlanets()
            .filter(planet => canPlanetUpgrade(planet) && canStatUpgrade(planet, branch));
        onFeedback(`Queueing ${myPlanets.length} planet upgrades.`);

        if (myPlanets.length === 0) {
            onFeedback('No planet upgrades to queue.');
            return;
        }

        eachLimit(myPlanets, 1, (planet, cb) => {
            setTimeout(() => {
                upgrade(planet, branch);
                cb();
            }, 250);
        }, () => {
            onFeedback('Planet upgrades queued!');
        });
    }

    return html`
      <button style=${button} title='Upgrade '${Icon.name}' for all planets' onClick=${onClick} onMouseOver=${colorBlack} onMouseOut=${colorWhite}>
        <${Icon} pathStyle=${{ fill: iconColor }} />
      </button>
    `;
}


// Function for top frame upgrade selected or upgrade manager
function UpgradeSelectedPlanet({ planet }) {
    let wrapper = {
        display: 'flex',
        justifyContent: 'space-between',
    };

    if (!planet) {
        return html`
        <div style=${wrapper}>
        <span>Upgrade Manager</span>
        <input type="text" id=patternInput value="rrrrd" id="patternInput" style="color:black;font-size:20px;width:70px;height:25px" title='For example, if the pattern is "rrrsd", rank 3 planet that can upgrade will choose to upgrade the speed branch' ></input>
        <button type="button" id=upgradePlanetsButton title='Upgrade all planets according to a pattern (d = defense, r = range, s = speed)' >Start Upgrading!</button>
        </div>
      `;
    }
    return html`
      <div style=${wrapper}>
        <span>Selected:</span>
        <${UpgradeButton} Icon=${Defense} planet=${planet} branch=${UpgradeBranchName.Defense} />
        <${UpgradeButton} Icon=${Range} planet=${planet} branch=${UpgradeBranchName.Range} />
        <${UpgradeButton} Icon=${Speed} planet=${planet} branch=${UpgradeBranchName.Speed} />
      </div>
    `;
}

// Function to  bottom frame upgrade all planet
function UpgradeAllPlanets() {
    let wrapper = {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '20px',
    };

    let [feedback, setFeedback] = useState(null);

    return html`
      <div style=${wrapper}>
        <span>All planets:</span>
        <${UpgradeAllButton} Icon=${Defense} branch=${UpgradeBranchName.Defense} onFeedback=${setFeedback} />
        <${UpgradeAllButton} Icon=${Range} branch=${UpgradeBranchName.Range} onFeedback=${setFeedback} />
        <${UpgradeAllButton} Icon=${Speed} branch=${UpgradeBranchName.Speed} onFeedback=${setFeedback} />
      </div>
      <div>
        ${feedback}
      </div>
    `;
}
// Function for formating of big numbers k/m/b
function roundToDecimal(num, decimalCount = 1) {
    if (decimalCount < 1) return Math.round(num);
    let p = Math.pow(10, decimalCount);
    num = num * p;
    num = Math.round(num) / p;
    return num;
}

function formatNumberForDisplay(num, decimalCount = 1) {
    if (num < 1e3) return roundToDecimal(num, decimalCount);
    if (num < 1e6) return roundToDecimal(num / 1e3, decimalCount) + "k";
    if (num < 1e9) return roundToDecimal(num / 1e6, decimalCount) + "m";
    if (num < 1e12) return roundToDecimal(num / 1e9, decimalCount) + "b";
    return roundToDecimal(num / 1e12, decimalCount) + "t";
}
// Function for frame planet list
function App() {
    let [selectedPlanet, setSelectedPlanet] = useState(() => {
        const planet = ui.getSelectedPlanet();
        if (!planet) {
            return undefined;
        }
        if (planet.planetType === PlanetType.PLANET) {
            return planet;
        } else {
            return undefined;
        }
    });

    useEffect(() => {
        const sub = ui.selectedPlanetId$.subscribe(planetId => {
            setSelectedPlanet(() => {
                const planet = df.getPlanetWithId(planetId);
                if (!planet) {
                    return undefined;
                }

                if (planet.planetType === PlanetType.PLANET && planet.planetLevel > 0) {
                    return planet;
                } else {
                    return undefined;
                }
            })
        });

        return sub.unsubscribe;
    }, []);

    return html`
      <div>
        <${UpgradeSelectedPlanet} planet=${selectedPlanet} />
        ${selectedPlanet ? html`<br /><span>Silver: ${Math.floor(selectedPlanet.silver)}</span>` : null}
        ${selectedPlanet ? html`<br /><span>Required:</span><${SilverRequired} planet=${selectedPlanet} />` : null}
        <br />
        <hr />
        <${UpgradeAllPlanets} />
      </div>
    `;
}

// Plugin UpgradeHeadquarter Default
class UpgradeHeadquarter {
    constructor() {
        this.container = null;
        this.lastLocationId = null;
        this.loopId = null;
        this.planetList = document.createElement('div');
        this.planetList.style.maxHeight = '100px';
        this.planetList.style.overflowX = 'hidden';
        this.planetList.style.overflowY = 'scroll';
    }

    clearPlanetList = () => {
        this.planetList.innerHTML = '';
        this.planetList.innerText = '';
    }

    allPlanetsWithUpgrade() {
        return Array.from(df.getMyPlanets())
            .filter(canPlanetUpgrade)
            .sort((p1, p2) => parseInt(p2.planetLevel, 10) - parseInt(p1.planetLevel, 10));
    }

    renderSelectable = (planet, text) => {
        let content = document.createElement('span');
        content.innerText = text;
        let { x, y } = planet.location.coords;
        content.onclick = () => {
            this.centerPlanet({ x, y })
        };
        return content;
    }

    renderUpgradable = () => {
        this.clearPlanetList();

        let planets = this.allPlanetsWithUpgrade()

        let title = document.createElement('div');
        title.style.marginBottom = '10px';
        title.style.display = 'flex';
        title.style.justifyContent = 'space-between';
        title.innerText = `${planets.length} planets ready for upgrade!`;

        this.planetList.appendChild(title);

        for (let planet of planets) {
            if (planet.location) {
                let planetEntry = document.createElement('div');
                planetEntry.style.marginBottom = '10px';
                planetEntry.style.display = 'flex';
                planetEntry.style.justifyContent = 'space-between';
                planetEntry.dataset.locationId = planet.locationId;

                this.colorSelected(planetEntry);

                let text = `${getPlanetName(planet)} - Lvl ${planet.planetLevel} - ${formatNumberForDisplay(getSilver(planet))}/${formatNumberForDisplay(getSilverNeeded(planet))} silver`;
                let content = this.renderSelectable(planet, text)
                planetEntry.appendChild(content);

                this.planetList.appendChild(planetEntry);
            }
        }

        // 1 because the title is always there
        if (this.planetList.children.length === 1) {
            this.planetList.innerHTML = 'No planets to upgrade right now.';
        }
    };

    centerPlanet = (coords) => {
        let planet = df.getPlanetWithCoords(coords);
        if (planet) {
            this.lastLocationId = planet.locationId;
        }

        ui.centerPlanet(planet);

        if (this.planetList) {
            Array.from(this.planetList.children)
                .forEach(this.colorSelected);
        }
    }

    colorSelected = (el) => {
        if (el.dataset.locationId === this.lastLocationId) {
            el.style.color = 'pink';
        } else {
            el.style.color = '';
        }
    }
    // Main container
    render(container) {
        container.parentElement.style.minHeight = 'unset';
        container.style.width = '325px';
        container.style.minHeight = 'unset';
        //--------------------------------------------------------
        // if planet is not at max rank and has enough silver
        const planetCanUpgrade = (planet) => {
            const totalRank = planet.upgradeState.reduce((a, b) => a + b);
            if (planet.spaceType === SpaceType.NEBULA && totalRank >= 3) return false;
            if (planet.spaceType === SpaceType.SPACE && totalRank >= 4) return false;
            if (planet.spaceType === SpaceType.DEEP_SPACE && totalRank >= 5) return false;
            if (planet.spaceType === SpaceType.DEAD_SPACE && totalRank >= 5) return false;
            return (
                planet.planetLevel !== 0 &&
                planet.planetType === PlanetType.PLANET &&
                planet.silver >= silverNeededForUpgrade(planet)
            );
        };

        const silverNeededForUpgrade = (planet) => {
            const totalLevel = planet.upgradeState.reduce((a, b) => a + b);
            return (totalLevel + 1) * 0.2 * planet.silverCap;
        };

        const upgradablePlanets = () => {
            return df.getMyPlanets().filter(planetCanUpgrade);
        };

        // upgrades planet, using a pattern
        // just a rudimentary implementation that takes the branch that should be upgraded from the nth letter of the pattern, where n is the current rank
        const upgradePlanet = (planet, pattern) => {
            const rank = planet.upgradeState.reduce((a, b) => a + b, 0);
            if (pattern.length <= rank) return;
            const upgradeBranch = ["d", "r", "s"].indexOf(pattern[rank]);
            df.upgrade(planet.locationId, upgradeBranch);
        };

        const upgradeAllPlanets = (pattern) => {
            upgradablePlanets().forEach((p) => upgradePlanet(p, pattern));
        };

        let upgradingToggle = true;
        // --------------------------------------------------
        this.container = container;

        render(html`<${App} />`, container);

        container.style.width = '400px';
        let contentPane = document.createElement('div');
        container.appendChild(contentPane);
        this.renderUpgradable();
        this.loopId = setInterval(this.renderUpgradable, REFRESH_INTERVAL);
        contentPane.appendChild(this.planetList);

        upgradePlanetsButton.onclick = () => {
            if (upgradingToggle) {
                upgradeAllPlanets([...patternInput.value]);
                this.upgradePlanetsInterval = window.setInterval(
                    () => upgradeAllPlanets([...patternInput.value]), 1e3 * 60);
            }
            else {
                window.clearInterval(this.upgradePlanetsInterval);
            }
            upgradingToggle = !upgradingToggle;
            upgradePlanetsButton.innerText = upgradingToggle
                ? "Start Upgrading!"
                : "Stop Upgrading";
        };
        patternInput.focus();
    }


    destroy() {
        render(null, this.container);
        if (this.loopId) {
            clearInterval(this.loopId)
        }
    }
}

export default UpgradeHeadquarter;
