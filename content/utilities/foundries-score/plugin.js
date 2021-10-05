/**
 * Foundries Score
 * 
 * Summary points of your unprospected foundries
 * 
 * Level 1 = Common
 * Level 2 = Rare - [1/64(1.56%) for Epic] - [~ 23k points]
 * Level 3 = Rare - [1/16(6.25%) for Epic] - [~ 31k points]
 * Level 4 = Epic - [1/64(1.56%) for Legendary] - [~ 244k points]
 * Level 5 = Epic - [1/16(6.25%) for Legendary] - [~ 375k points]
 * Level 6 = Legendary - [1/64(1.56%) for Mythic] - [~ 3.3m points]
 * Level 7 = Legendary - [1/16(6.25%) for Mythic] - [~ 4.1m points]
 * Level 8+ = Mythic - [100%] - [20m points]
 * 
 * Common - 5k points
 * Rare - 20k points
 * Epic - 200k points
 * Legendary - 3M points
 * Mythic - 20M points
 * 
*/

const planetLevels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const colors = ['#5c5c5c', '#5c5c5c', '#5c5c5c', '#a0a0a0', '#00dc80', '#6b68ff', '#c13cff', '#f8b73e', '#ff44b7'];
const points = [0, 5000, 23000, 31000, 244000, 375000, 3300000, 4100000, 20000000, 20000000];


const players = [
    df.getAccount(),
    // Crawls nearby unowned spacetimes
    "0x0000000000000000000000000000000000000000",
];

class Plugin {
    constructor() {
        this.content = document.createElement('div');
        this.total = document.createElement('div');
        this.message = document.createElement('div');
        this.refreshInterval = 1; // minutes
    }

    render(container) {
        // Create refresh interval
        this.refreshTimer = setInterval(() => {
            setTimeout(() => {
                this.update();
            }, 0);
        }, 1000 * 60 * this.refreshInterval)


        container.style.width = '600px';
        container.style.padding = '5px';
        this.message.innerText = 'Press update button for sync.';
        this.message.style.marginTop = '10px';
        this.message.style.display = 'inline-block';
        this.message.style.width = '50%';
        this.total.style.display = 'inline-block';
        this.total.style.width = '50%';
        this.total.style.textAlign = 'right';
        this.total.style.color = '#ff0000';

        // Button
        let buttonContainer = document.createElement('div');
        let buttonDescr = document.createElement('p');
        let updateButton = document.createElement('button');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.alignItems = 'center';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginBottom = '5px';
        buttonDescr.style.marginRight = '10px';
        buttonDescr.style.fontSize = '14px';
        updateButton.style.display = 'block';
        updateButton.style.width = '120px';

        buttonDescr.innerText = '(updates every 60 seconds)'
        updateButton.innerHTML = 'Refresh'
        updateButton.onclick = () => {
            this.message.innerText = 'Please wait...';
        
            setTimeout(() => {
                this.update();
            }, 0);
        }

        buttonContainer.appendChild(buttonDescr.cloneNode(true));
        buttonContainer.appendChild(updateButton.cloneNode(true));

        // Content
        container.appendChild(buttonContainer);
        container.appendChild(this.content);
        container.appendChild(this.message);
        container.appendChild(this.total);

        // Trigger update
        this.update();
    }

    update() {
        let totalScore = 0;
        const foundries = df.getMyPlanets()
            .filter(p => p.planetType === 2 && p.prospectedBlockNumber === undefined);

        this.message.innerHTML = `Summary ${foundries.length} prospectable foundries.`;
        this.content.innerHTML = ''; // Clear content before updating

        for (const index of planetLevels.keys()) {
            let rowScore = 0;

            let row = document.createElement('div');
            row.style.display = 'flex';
            row.style.marginBottom = '5px';
            row.style.alignItems = 'center';

            let title = document.createElement('p');
            title.innerText = `Level ${index} (≈ ${numberFormatter(points[index])}/pc.)`;
            title.style.color = colors[index];
            title.style.width = '30%';

            let arrow = document.createElement('p');
            arrow.innerText = '=>';
            arrow.style.color = colors[index];
            arrow.style.width = '10%';
            arrow.style.textAlign = 'center';

            let currents = foundries.filter(p => p.planetLevel == index);
            if(currents.length === 0) continue;
            for(let foundry of currents) {
                rowScore += points[index];
            }

            let ready = currents.filter(p => p.energy / p.energyCap >= 0.95);
            let description = document.createElement('p');
            let descriptionTotal = document.createElement('span');
            let descriptionInner = document.createElement('span');
            let descriptionTotalReady = document.createElement('span');
            let descriptionAfter = document.createElement('span');
            description.style.flexGrow = '1';
            description.style.textAlign = 'center';
            descriptionTotal.style.color = '#FFFFB2';
            descriptionTotal.style.borderBottom = '1px solid #FFFFB2';
            descriptionTotal.style.cursor = 'pointer';
            descriptionTotalReady.style.color = '#FFFFB2';
            descriptionTotalReady.style.borderBottom = '1px solid #FFFFB2';
            descriptionTotalReady.style.cursor = 'pointer';

            descriptionTotal.innerText = currents.length;
            descriptionInner.innerText = ' (ready -> ';
            descriptionAfter.innerText = ')';
            descriptionTotalReady.innerText = ready.length;

            description.appendChild(descriptionTotal.cloneNode(true));
            description.appendChild(descriptionInner.cloneNode(true));
            description.appendChild(descriptionTotalReady.cloneNode(true));
            description.appendChild(descriptionAfter.cloneNode(true));

            let score = document.createElement('p');
            score.innerText = `≈ ${numberFormatter(rowScore)} points`;
            score.style.color = colors[index];
            score.style.flexGrow = '1';
            score.style.textAlign = 'right';

            row.appendChild(title);
            row.appendChild(arrow);
            row.appendChild(description);
            row.appendChild(score);
            this.content.appendChild(row);

            totalScore += rowScore;
        }

        this.total.innerText = `Total points ≈ ${numberFormatter(totalScore)}`;
    }

    clearRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
    }

    destroy() {
        this.clearRefresh()
    }
}

function numberFormatter(num) {
    return Math.abs(num) > 999999 ? numberFormatterMath(num, 1000000) + 'm' : numberFormatterMath(num, 1000) + 'k';
}

function numberFormatterMath(num, divider) {
    return Math.sign(num)*((Math.abs(num)/divider).toFixed(1))
}


export default Plugin;