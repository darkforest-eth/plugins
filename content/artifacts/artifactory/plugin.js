// # Artifactory
// The artifactory plugin is your one-stop-shop for things related to artifacts.
// * Find artifacts on your planets
// * See when artifacts unlock
// * Withdraw artifacts once they are unlocked
// * See bonuses of your artifacts
// * Deposit artifacts on your planets
// * Find untaken planets with artifacts and jump to them

const {
    html,
    render,
    useState,
    useLayoutEffect,
} = await import('https://unpkg.com/htm/preact/standalone.module.js');

const {
    BiomeNames,
    energy,
    coords,
    isMine,
    isUnowned,
    unlockTime,
    canWithdraw,
    hasArtifact,
    canHaveArtifact,
} = await import('https://plugins.zkga.me/utils/utils.js');

const {
    Energy,
    EnergyGrowth,
    Defense,
    Range,
    Speed,
} = await import('https://plugins.zkga.me/game/Icons.js');

// 30 seconds
let REFRESH_INTERVAL = 1000 * 30;
// 10 minutes
let AUTO_INTERVAL = 1000 * 60 * 10;

function canDeposit(planet) {
    return planet && isMine(planet) && !planet.heldArtifactId
}

function calcBonus(bonus) {
    return bonus - 100
}

function myPlanetsWithFindable() {
    return Array.from(df.getMyPlanets())
        .filter(df.isPlanetMineable)
        .sort((p1, p2) => parseInt(p1.locationId, 16) - parseInt(p2.locationId, 16));
}

function myPlanetsWithArtifacts() {
    return Array.from(df.getMyPlanets())
        .filter(hasArtifact)
        .sort((p1, p2) => parseInt(p1.locationId, 16) - parseInt(p2.locationId, 16));
}

function allPlanetsWithArtifacts() {
    return Array.from(df.getAllPlanets())
        .filter(canHaveArtifact)
        .sort((p1, p2) => parseInt(p1.locationId, 16) - parseInt(p2.locationId, 16));
}

function myArtifactsToDeposit() {
    return df.getMyArtifacts()
        .filter(artifact => !artifact.onPlanetId)
        .sort((a1, a2) => parseInt(a1.id, 16) - parseInt(a2.id, 16));
}

function findArtifacts() {
    let currentBlockNumber = df.contractsAPI.ethConnection.blockNumber;
    Array.from(df.getMyPlanets())
        .filter(canHaveArtifact)
        .forEach(planet => {
            try {
                if (isFindable(planet, currentBlockNumber)) {
                    df.findArtifact(planet.locationId);
                } else if (isProspectable(planet) && enoughEnergyToProspect(planet) && !planet.unconfirmedProspectPlanet) {
                    df.prospectPlanet(planet.locationId);
                }
            } catch (err) {
                console.log(err);
            }
        });
}

function withdrawArtifacts() {
    Array.from(df.getMyPlanets())
        .filter(canWithdraw)
        .forEach(planet => {
            try {
                df.withdrawArtifact(planet.locationId);
            } catch (err) {
                console.log(err);
            }
        });
}

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
    return df.isPlanetMineable(planet) && planet.prospectedBlockNumber === undefined;
}

function enoughEnergyToProspect(p) {
    return p.energy / p.energyCap > 0.955;
}


function FindButton({planet, currentBlockNumber}) {
    let [finding, setFinding] = useState(false);

    let button = {
        marginLeft: '5px',
        opacity: finding ? '0.5' : '1',
    };

    function findArtifact() {
        try {
            // Why does this f'ing throw?
            df.findArtifact(planet.locationId);
        } catch (err) {
            console.log(err);
            setFinding(true);
        }
        setFinding(true);
    }

    if (isFindable(planet, currentBlockNumber)) {
        return html`
            <button style=${button} onClick=${findArtifact} disabled=${finding}>
                ${finding ? 'Finding...' : 'Find!'}
            </button>
        `;
    }
}

function ProspectButton({planet}) {
    let [prospecting, setProspect] = useState(false);

    let button = {
        marginLeft: '5px',
        opacity: prospecting ? '0.5' : '1',
    };

    function prospectPleant() {
        try {
            if (!planet.unconfirmedProspectPlanet) {
                df.prospectPlanet(planet.locationId);
            }
        } catch (err) {
            console.log(err);
            setProspect(true);
        }
        setProspect(true);
    }

    if (isProspectable(planet) && enoughEnergyToProspect(planet)) {
        return html`
            <button style=${button} onClick=${prospectPleant} disabled=${prospecting}>
                ${prospecting ? 'Prospecting...' : 'Prospect!'}
            </button>
        `;
    }
}

function WithdrawButton({planet}) {
    let [withdrawing, setWithdrawing] = useState(false);

    let button = {
        marginLeft: '5px',
        opacity: withdrawing ? '0.5' : '1',
    };

    function withdrawArtifact() {
        try {
            // Does this throw too?
            df.withdrawArtifact(planet.locationId);
        } catch (err) {
            console.log(err);
        }
        setWithdrawing(true);
    }

    if (canWithdraw(planet)) {
        return html`
            <button style=${button} onClick=${withdrawArtifact} disabled=${withdrawing}>
                ${withdrawing ? 'Withdrawing...' : 'Withdraw!'}
            </button>
        `;
    }
}

function Multiplier({Icon, bonus}) {
    let diff = calcBonus(bonus);
    let style = {
        marginLeft: '5px',
        marginRight: '10px',
        color: diff < 0 ? 'red' : 'green',
        minWidth: '32px',
    };
    let text = diff < 0 ? `${diff}%` : `+${diff}%`
    return html`
        <${Icon}/>
        <span style=${style}>${text}</span>
    `
}

function Unfound({selected}) {
    if (!selected) {
        return
    }

    let planetList = {
        maxHeight: '300px',
        overflowX: 'hidden',
        overflowY: 'scroll',
    };

    let currentBlockNumber = df.contractsAPI.ethConnection.blockNumber;

    let [lastLocationId, setLastLocationId] = useState(null);

    let planets = myPlanetsWithFindable()
        .filter(planet => !planet.hasTriedFindingArtifact);

    let planetsChildren = planets.map(planet => {
        let planetEntry = {
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            color: lastLocationId === planet.locationId ? 'pink' : '',
        };

        let biome = BiomeNames[planet.biome];
        let {x, y} = planet.location.coords;

        function centerPlanet() {
            let planet = df.getPlanetWithCoords({x, y});
            if (planet) {
                ui.centerPlanet(planet);
                setLastLocationId(planet.locationId);
            }
        }

        let text = `LV${planet.planetLevel} ${biome} at ${coords(planet)} - ${energy(planet)}% energy`;
        return html`
            <div key=${planet.locationId} style=${planetEntry}>
                <span onClick=${centerPlanet}>${text}</span>
                <${ProspectButton} planet="${planet}"/>
                <${FindButton} planet=${planet} currentBlockNumber=${currentBlockNumber}/>
            </div>
        `;
    });

    return html`
        <div style=${planetList}>
            ${planetsChildren.length ? planetsChildren : 'No artifacts to find right now.'}
        </div>
    `;
}

// TODO: Bonuses in this panel?
function Withdraw({selected}) {
    if (!selected) {
        return;
    }

    let planetList = {
        maxHeight: '300px',
        overflowX: 'hidden',
        overflowY: 'scroll',
    };

    let [lastLocationId, setLastLocationId] = useState(null);

    const planets = myPlanetsWithArtifacts()
        .sort((p1, p2) => p1.artifactLockedTimestamp - p2.artifactLockedTimestamp);

    let planetsChildren = planets.map(planet => {
        let planetEntry = {
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            color: lastLocationId === planet.locationId ? 'pink' : '',
        };

        let biome = BiomeNames[planet.biome];
        let {x, y} = planet.location.coords;

        function centerPlanet() {
            let planet = df.getPlanetWithCoords({x, y});
            if (planet) {
                ui.centerPlanet(planet);
                setLastLocationId(planet.locationId);
            }
        }

        let text = `${biome} at ${coords(planet)} - ${unlockTime(planet)}`;
        return html`
            <div key=${planet.locationId} style=${planetEntry}>
                <span onClick=${centerPlanet}>${text}</span>
                <${WithdrawButton} planet=${planet}/>
            </div>
        `;
    });

    return html`
        <div style=${planetList}>
            ${planetsChildren.length ? planetsChildren : 'No artifacts on your planets.'}
        </div>
    `;
}

function Deposit({selected}) {
    if (!selected) {
        return;
    }

    let artifactList = {
        maxHeight: '300px',
        overflowX: 'hidden',
        overflowY: 'scroll',
    };

    let [depositing, setDepositing] = useState(false);

    let [planet, setPlanet] = useState(ui.getSelectedPlanet);

    useLayoutEffect(() => {
        let onClick = () => {
            setPlanet(ui.getSelectedPlanet());
        }
        window.addEventListener('click', onClick);

        return () => {
            window.removeEventListener('click', onClick);
        }
    }, []);

    let artifacts = myArtifactsToDeposit();

    let artifactChildren = artifacts.map(artifact => {
        let wrapper = {
            display: 'flex',
            marginBottom: '10px',
        };
        let button = {
            marginLeft: 'auto',
            opacity: depositing ? '0.5' : '1',
        };
        let {
            energyCapMultiplier,
            energyGroMultiplier,
            defMultiplier,
            rangeMultiplier,
            speedMultiplier
        } = artifact.upgrade;

        let deposit = () => {
            if (canDeposit(planet) && !depositing) {
                // TODO: Fast depositing
                setDepositing(true);
                df.depositArtifact(planet.locationId, artifact.id);
            }
        }

        return html`
            <div key=${artifact.id} style=${wrapper}>
                <${Multiplier} Icon=${Energy} bonus=${energyCapMultiplier}/>
                <${Multiplier} Icon=${EnergyGrowth} bonus=${energyGroMultiplier}/>
                <${Multiplier} Icon=${Defense} bonus=${defMultiplier}/>
                <${Multiplier} Icon=${Range} bonus=${rangeMultiplier}/>
                <${Multiplier} Icon=${Speed} bonus=${speedMultiplier}/>
                ${canDeposit(planet) ? html`
                    <button style=${button} onClick=${deposit} disabled=${depositing}>
                        ${depositing ? 'Depositing...' : 'Deposit'}
                    </button>
                ` : null
                }
            </div>
        `;
    });

    return html`
        <div style=${artifactList}>
            ${artifactChildren.length ? artifactChildren : 'No artifacts to deposit.'}
        </div>
    `;
}

function Untaken({selected}) {
    if (!selected) {
        return;
    }

    let planetList = {
        maxHeight: '300px',
        overflowX: 'hidden',
        overflowY: 'scroll',
    };
    const inputGroup = {
        display: 'flex',
        alignItems: 'center',
    };
    const input = {
        flex: '1',
        padding: '5px',
        margin: 'auto 5px',
        outline: 'none',
        color: 'black',
    };

    let {x: homeX, y: homeY} = ui.getHomeCoords()

    let [lastLocationId, setLastLocationId] = useState(null);
    let [centerX, setCenterX] = useState(homeX);
    let [centerY, setCenterY] = useState(homeY);

    const onChangeX = (e) => {
        return setCenterX(e.target.value)
    }

    const onChangeY = (e) => {
        setCenterY(e.target.value)
    }

    const planets = allPlanetsWithArtifacts()
        .filter(isUnowned);

    let planetsArray = planets.map(planet => {
        let x = planet.location.coords.x;
        let y = planet.location.coords.y;
        let distanceFromTargeting = parseInt(Math.sqrt(Math.pow((x - centerX), 2) + Math.pow((y - centerY), 2)));

        return {
            locationId: planet.locationId, biome: planet.biome, planetLevel: planet.planetLevel,
            x, y, distanceFromTargeting
        };
    });

    planetsArray.sort((p1, p2) => (p1.distanceFromTargeting - p2.distanceFromTargeting));

    let planetsChildren = planetsArray.map(planet => {

        let {locationId, x, y, distanceFromTargeting, planetLevel} = planet;
        let biome = BiomeNames[planet.biome];

        let planetEntry = {
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            color: lastLocationId === locationId ? 'pink' : '',
        };

        function centerPlanet() {
            let planet = df.getPlanetWithCoords({x, y});
            if (planet) {
                ui.centerPlanet(planet);
                setLastLocationId(planet.locationId);
            }
        }

        let text = `LV${planetLevel} ${biome} ${distanceFromTargeting} away at (${x}, ${y})`;
        return html`
            <div key=${locationId} style=${planetEntry}>
                <span onClick=${centerPlanet}>${text}</span>
            </div>
        `;
    });

    return html`
        <div style=${inputGroup}>
            <div>X:</div>
            <input
                    style=${input}
                    value=${centerX}
                    onChange=${onChangeX}
                    placeholder="center X"/>
            <div>Y:</div>
            <input
                    style=${input}
                    value=${centerY}
                    onChange=${onChangeY}
                    placeholder="center Y"/>
        </div>
        <div style=${planetList}>
            ${planetsChildren.length ? planetsChildren : 'No artifacts to find right now.'}
        </div>
    `;
}

function AutoButton({loop, onText, offText}) {
    let button = {
        marginLeft: '10px',
    };

    let [isOn, setIsOn] = useState(false);
    let [timerId, setTimerId] = useState(null);

    function toggle() {
        setIsOn(!isOn);
    }

    useLayoutEffect(() => {
        if (timerId) {
            clearInterval(timerId);
            setTimerId(null);
        }

        if (isOn) {
            // Run once before interval
            loop();
            let timerId = setInterval(loop, AUTO_INTERVAL);
            setTimerId(timerId);
        }

        return () => {
            if (timerId) clearInterval(timerId);
        };
    }, [isOn]);

    return html`
        <button style=${button} onClick=${toggle}>${isOn ? onText : offText}</button>
    `;
}

function App() {
    let buttonBar = {
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: '10px',
    };

    // ['unfound', 'withdraw', 'deposit', 'untaken']
    let [tab, setTab] = useState('unfound');
    let [_, setLoop] = useState(0);

    useLayoutEffect(() => {
        let intervalId = setInterval(() => {
            setLoop(loop => loop + 1)
        }, REFRESH_INTERVAL);

        return () => {
            clearInterval(intervalId);
        }
    }, []);

    return html`
        <div style=${buttonBar}>
            <button onClick=${() => setTab('unfound')}>Unfound</button>
            <button onClick=${() => setTab('withdraw')}>Withdraw</button>
            <button onClick=${() => setTab('deposit')}>Deposit</button>
            <button onClick=${() => setTab('untaken')}>Untaken</button>
        </div>
        <div>
            <${Unfound} selected=${tab === 'unfound'}/>
            <${Withdraw} selected=${tab === 'withdraw'}/>
            <${Deposit} selected=${tab === 'deposit'}/>
            <${Untaken} selected=${tab === 'untaken'}/>
        </div>
        <div>
            <span>Auto:</span>
            <${AutoButton} onText="Cancel Find" offText="Find" loop=${findArtifacts}/>
            <${AutoButton} onText="Cancel Withdraw" offText="Withdraw" loop=${withdrawArtifacts}/>
        </div>
    `;
}


class Artifactory {
    constructor() {
        this.root = null;
        this.container = null
    }

    async render(container) {
        this.container = container;

        container.style.width = '450px';

        this.root = render(html`
            <${App}/>`, container);
    }

    destroy() {
        render(null, this.container, this.root);
    }
}

export default Artifactory;