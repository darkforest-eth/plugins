import {
    move
} from 'https://plugins.zkga.me/utils/queued-move.js';

const MAX_LEVEL_PLANET = 9;

class Plugin {
    constructor() {
        this.maxEnergyPercent = 85;
        this.minPlanetLevel = 3;
        this.maxPlanetLevel = 4;
        this.minReceivingPlanetLevel = 5;
    }
    render(container) {
        container.style.width = '200px';

        let stepperLabel = document.createElement('label');
        stepperLabel.innerText = 'Max % energy to spend';
        stepperLabel.style.display = 'block';

        let maxEnergyPercentRange = createRange(this.maxEnergyPercent);
        let maxEnergyPercentLabel = document.createElement('span');
        maxEnergyPercentLabel.innerText = `${maxEnergyPercentRange.value}%`;
        maxEnergyPercentLabel.style.float = 'right';
        maxEnergyPercentRange.onchange = (evt) => {
            maxEnergyPercentLabel.innerText = `${evt.target.value}%`;
            try {
                this.maxEnergyPercent = parseInt(evt.target.value, 10);
            } catch (e) {
                console.error('could not parse energy percent', e);
            }
        }
        let message = document.createElement('div');

        let minLevelPlanetLabel = document.createElement('label');
        minLevelPlanetLabel.innerText = 'Min. Lvl planet from:';
        minLevelPlanetLabel.style.display = 'block';

        let minLevelPlanetSelect = createSelect(Array.from(Array(MAX_LEVEL_PLANET + 1).keys()), this.minPlanetLevel, (evt) => {
            try {
                this.minPlanetLevel = parseInt(evt.target.value);
            } catch (e) {
                console.error('could not parse planet level', e);
            };
        });

        // max planet level
        let maxLevelPlanetLabel = document.createElement('label');
        maxLevelPlanetLabel.innerText = 'Max. Lvl planet from:';
        maxLevelPlanetLabel.style.display = 'block';

        let maxLevelPlanetSelect = createSelect(Array.from(Array(MAX_LEVEL_PLANET + 1).keys()), this.maxPlanetLevel, (evt) => {
            try {
                this.maxPlanetLevel = parseInt(evt.target.value);
            } catch (e) {
                console.error('could not parse planet level', e);
            };
        });

        // receive
        let receiveToSelectedButton = document.createElement('button');
        receiveToSelectedButton.style.width = '100%';
        receiveToSelectedButton.style.marginBottom = '10px';
        receiveToSelectedButton.innerHTML = 'Receive from neighboor'
        receiveToSelectedButton.onclick = () => { 
            let selected = ui.getSelectedPlanet();
            if (selected) {
                setTimeout(() => {
                    let res = receiveRessources(selected.locationId, this.maxEnergyPercent, this.minPlanetLevel, this.maxPlanetLevel);
                    message.innerText = `Receving ${res.energyReceived} and ${res.silverReceived} from ${res.moves} planets.`;
                }, 0);
            } else {
                console.log('no planet selected');
            }
        }

        container.appendChild(stepperLabel);
        container.appendChild(maxEnergyPercentRange);
        container.appendChild(maxEnergyPercentLabel);
        container.appendChild(minLevelPlanetLabel);
        container.appendChild(minLevelPlanetSelect);
        container.appendChild(maxLevelPlanetLabel);
        container.appendChild(maxLevelPlanetSelect);

        container.appendChild(receiveToSelectedButton);
        container.appendChild(message);
    }
}

function createRange(value) {
    let range = document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = '100';
    range.step = '5';
    range.value = value;
    range.style.width = '80%';
    range.style.height = '24px';
    return range;
}

function createSelect(values, value, onChange) {
    let select = document.createElement('select');
    select.style.background = 'rgb(8,8,8)';
    select.style.width = '100%';
    select.style.marginTop = '10px';
    select.style.marginBottom = '10px';
    values.forEach(lvl => {
        let opt = document.createElement('option');
        opt.value = `${lvl}`;
        opt.innerText = `Level ${lvl}`;
        select.appendChild(opt);
    });
    select.value = value;
    select.onchange = onChange;
    return select;
}       

function receiveRessources(fromId, maxDistributeEnergyPercent, minPLevel, maxPlevel) {
    const from = df.getPlanetWithId(fromId);

    const candidates_ = df.getPlanetsInRange(fromId, maxDistributeEnergyPercent)
        .filter(p => p.owner === df.getAccount()) //get player planets
        .filter(p => p.planetLevel >= minPLevel && p.planetLevel <= maxPlevel) // filer level
        .map(to => [to, distance(from, to)])
        .sort((a, b) => a[1] - b[1]);
    
        let i = 0;
        const maxEnergy = Math.floor(from.energyCap -from.energy);
        const maxSilver = Math.floor(from.silverCap -from.silver);

        let energyReceived = 0;
        let silverReceived = 0;
        let moves = 0;
        while (maxEnergy - energyReceived > 0 && i < candidates_.length) {
    
            // Remember its a tuple of candidates and their distance
            const candidate = candidates_[i++][0];
    
            // Rejected if has more than 5 pending arrivals. Transactions are reverted when more arrives. You can't increase it
            const unconfirmed = df.getUnconfirmedMoves().filter(move => move.to === from.locationId)
            const arrivals = getArrivalsForPlanet(from.locationId);
            if (unconfirmed.length + arrivals.length > 4) {
                continue;
            }
    
            const energyBudget = Math.floor((maxDistributeEnergyPercent / 100) * candidate.energy);
           
            // needs to be a whole number for the contract
            const receivedEnergyForMove = Math.ceil(df.getEnergyArrivingForMove(candidate.locationId, fromId, energyBudget));
            const receivedSilverForMove = Math.ceil(maxSilver - silverReceived - candidate.silver >= 0 ? candidate.silver : maxSilver - silverReceived);
            if (receivedEnergyForMove < maxEnergy/100) {
                continue;
            }
    
            move(candidate.locationId, fromId, energyBudget, receivedSilverForMove);
            energyReceived += receivedEnergyForMove;
            silverReceived += receivedSilverForMove;
            //silverSpent += silverNeeded;
            moves += 1;
        }
    
        return { moves, energyReceived, silverReceived };
    

}

//returns tuples of [planet,distance]
function distance(from, to) {
    let fromloc = from.location;
    let toloc = to.location;
    return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
}

function getArrivalsForPlanet(planetId) {
    return df.getAllVoyages().filter(arrival => arrival.toPlanet === planetId).filter(p => p.arrivalTime > Date.now() / 1000);
}

export default Plugin;