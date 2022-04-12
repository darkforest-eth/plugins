// Protect Planets
//
// Monitoring if your planet was attacked
// Try to get it back when your planet was occupied
//
// Written by goldenfiredo, goldenfiredo@gmail.com
//

import {
    PlanetType,
} from "https://cdn.skypack.dev/@darkforest_eth/types";

const minProtectPlanetLevel = 2;
const minAttackPlanetLevel = 3;
const minEnergyPercentForAttacking = 90;
const usedEnergyPercentForAttacking = 70;
const maxAttackingPlanetNumber = 6;
const minArrivedEnergy = 1000;

class Plugin {

    constructor() {
        this.running = false;
        this.intervalId = '';
        this.minPlanetLevel = minProtectPlanetLevel;
        this.displayWarning = true;
        this.attacking = true;
        this.planetIdsUnderAttack = [];
        this.planetIdsOccupied = [];
        this.planetIdsAttacked = df.getAllVoyages().filter(
            e => e.player !== df.account && 
            df.getPlanetWithId(e.toPlanet).owner === df.account
        ).map(e => e.toPlanet);
    }

    attack(planetOccupied) {
        if (getPlanetUnconfirmedMoves(planetOccupied.locationId).length > 0) {
            
            return;
        }

        if (getPlanetArrivals(planetOccupied.locationId).length > 0) {
            
            return;
        }

        // 1. find the best planet to attack
        let candidates = df.getMyPlanets().filter(
            p => p.planetLevel > planetOccupied.planetLevel
            && p.energy * usedEnergyPercentForAttacking / 100 > planetOccupied.energyCap
            && p.planetType !== PlanetType.SILVER_BANK
            && p.unconfirmedDepartures.length === 0
        ).map(
            from => [from, distance(from, planetOccupied)]
        ).sort(
            (a, b) => a[1] - b[1]
        );
        
        for (const candidate of candidates) {
            let planet = candidate[0];
            let energyNeeded = Math.ceil(
                df.getEnergyNeededForMove(planet.locationId, planetOccupied.locationId, planetOccupied.energyCap + 100));
            if (planet.energy * 7 / 10 >= energyNeeded) {
                df.move(planet.locationId, planetOccupied.locationId, energyNeeded, 0);

                return;
            }
        }

        // 2. no best planet, find the nearest planet to attack occupied planet, up to maxAttackingPlanetNumber
        candidates = df.getMyPlanets().filter(
            p => p.planetLevel >= minAttackPlanetLevel
            && p.energy >= p.energyCap * minEnergyPercentForAttacking / 100
            && p.planetType !== PlanetType.SILVER_BANK
            && p.unconfirmedDepartures.length === 0
        ).map(
            from => [from, distance(from, planetOccupied)]
        ).sort(
            (a, b) => a[1] - b[1]
        );
        
        let sumEnergy = 0;
        let planetsWillAttack = [];
        for (const candidate of candidates) {
            let planet = candidate[0];
            let energyArrived = df.getEnergyArrivingForMove(
                planet.locationId, planetOccupied.locationId, undefined, 
                Math.floor(planet.energy * usedEnergyPercentForAttacking / 100));
            if (energyArrived >= minArrivedEnergy) {
                planetsWillAttack.push(planet);
                sumEnergy += energyArrived;
                if (sumEnergy >= planetOccupied.energyCap + 100 || planetsWillAttack.length >= maxAttackingPlanetNumber) break;
            }
        }

        for (const planet of planetsWillAttack) {
            df.move(planet.locationId, planetOccupied.locationId, 
                Math.floor(planet.energy * usedEnergyPercentForAttacking / 100), 0);
        }
    }

    protect() {
        df.terminal.current.println("[Protect Planets] check attacking", 2);
        
        let planetIdsUnderAttack = df.getAllVoyages().filter(
            e => e.arrivalTime > Date.now() / 1000 && 
            e.player !== df.account && 
            df.getPlanetWithId(e.toPlanet).owner === df.account && 
            df.getPlanetWithId(e.toPlanet).planetLevel >= this.minPlanetLevel
        ).map(e => e.toPlanet);

        this.planetIdsUnderAttack = planetIdsUnderAttack;
        
        for (const id of planetIdsUnderAttack) {
            if (!this.planetIdsAttacked.includes(id)) {
                this.planetIdsAttacked.push(id);
            }
        }
        
        for (const id of this.planetIdsAttacked) {
            if (df.getPlanetWithId(id).owner !== df.account && !this.planetIdsOccupied.includes(id)) {
                this.planetIdsOccupied.push(id)
            }
        }

        this.planetIdsOccupied = this.planetIdsOccupied
            .sort((a, b) => df.getPlanetWithId(b).planetLevel - df.getPlanetWithId(a).planetLevel);

        // remove occupied planets
        this.planetIdsAttacked = this.planetIdsAttacked.filter(
            id => df.getPlanetWithId(id).owner === df.account
        );

        if (!this.attacking) {
            return;
        }

        for (const id of this.planetIdsOccupied) {
            let planet = df.getPlanetWithId(id);
            if (planet.owner !== df.account) {
                this.attack(planet);
            }
        }
    }

    stop() {
        this.planetIdsUnderAttack = [];
        if (this.intervalId != '') {
            clearInterval(this.intervalId);
            this.intervalId = '';
        }
        this.running = false;
    }

    async render(container) {
        container.style.width = '540px';
        
        let levelLabel = document.createElement('label');
        levelLabel.innerText = 'Min. level planets to protect';
        levelLabel.style.display = 'block';

        let level = document.createElement('select');
        level.style.background = 'rgb(8,8,8)';
        level.style.width = '100%';
        level.style.marginTop = '10px';
        level.style.marginBottom = '10px';
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(lvl => {
            let opt = document.createElement('option');
            opt.value = `${lvl}`;
            opt.innerText = `Level ${lvl}`;
            level.appendChild(opt);
        });

        level.value = `${this.minPlanetLevel}`;
        level.onchange = (evt) => {
            try {
                this.minPlanetLevel = parseInt(evt.target.value);
            } catch (e) {
                console.error('could not parse planet level', e);
            }
        }

        let warningLabel = document.createElement('label');
        warningLabel.innerText = 'Display warning when my planet was under attack';
        warningLabel.style.paddingRight = "10px";
        warningLabel.style.marginLeft = '10px';
        warningLabel.style.marginTop = '20px';

        let warningCheckbox = document.createElement('input');
        warningCheckbox.type = "checkbox";
        warningCheckbox.style.marginRight = "10px";
        warningCheckbox.checked = true;
        warningCheckbox.onchange = (evt) => {
            if (evt.target.checked) {
                this.displayWarning = true;
            } else {
                this.displayWarning = false;
            }
        };

        let attackingLabel = document.createElement('label');
        attackingLabel.innerText = 'Get it back when my planet was occupied';
        attackingLabel.style.paddingRight = "10px";
        attackingLabel.style.marginLeft = '10px';

        let attackingCheckbox = document.createElement('input');
        attackingCheckbox.type = "checkbox";
        attackingCheckbox.style.marginRight = "10px";
        attackingCheckbox.checked = true;
        attackingCheckbox.onchange = (evt) => {
            if (evt.target.checked) {
                this.attacking = true;
            } else {
                this.attacking = false;
            }
        };

        let startBtn = document.createElement('button');
        startBtn.style.width = '100%';
        startBtn.style.marginBottom = '10px';
        startBtn.style.marginTop = '30px';
        startBtn.innerHTML = 'start'
        startBtn.onclick = () => {
            if (this.running) {
                this.stop();
                startBtn.innerHTML = 'start';
            } else {
                this.running = true;
                this.protect();
                this.intervalId = setInterval(this.protect.bind(this), 30 * 1000);
                startBtn.innerHTML = 'stop';
            }
        };

        container.appendChild(levelLabel);
        container.appendChild(level);
        container.appendChild(warningLabel);
        container.appendChild(warningCheckbox);
        container.appendChild(attackingLabel);
        container.appendChild(attackingCheckbox);
        container.appendChild(startBtn);
    }

    draw(ctx) {
        let count = this.planetIdsUnderAttack.length;
        if (this.displayWarning && count > 0) {
            const viewport = ui.getViewport();
            ctx.save();
            ctx.fillStyle = "red";
            ctx.font = "24px Sans-serif";
            let msg = "";
            if (count === 1) msg = "You have 1 planet under attack";
            else msg = "You have " + count + " planets under attack";
            ctx.fillText(msg, viewport.viewportWidth/2 - 200, viewport.viewportHeight - 30);
            ctx.restore();
        }
    }

    destroy() {
        this.stop();
    }
}
export default Plugin;


function getPlanetArrivals(planetId) {
    return df.getAllVoyages()
        .filter(arrival => arrival.toPlanet === planetId && 
            arrival.player === df.account && 
            arrival.arrivalTime > Date.now() / 1000
        );
}

function getPlanetUnconfirmedMoves(planetId) {
    return df.getUnconfirmedMoves()
        .filter(move => move.to === planetId && move.owner === df.account);
}

function distance(from, to) {
    let fromloc = from.location;
    let toloc = to.location;
    return Math.sqrt((fromloc.coords.x - toloc.coords.x) ** 2 + (fromloc.coords.y - toloc.coords.y) ** 2);
}