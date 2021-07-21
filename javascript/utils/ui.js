/** 
     EXAMPLE:

    constructor() {
        this.minSilver = { name: 'minSilver', value: 20000 };
        this.minPlanetLevel = { name: 'minPlanetLevel', value: 3 };
    }

    async render(container) {
        let inputs = [];
        // Create a stepper
        const minSilver = {
            name: this.minSilver.name,
            innerText: 'Test stepper',
            min: '0',
            max: '100000',
            step: '10000',
            getValueLabel: (value) => { return `${value / 1000}k`; },
            uiType: 'stepper'
        };
        const minPlanetLevel = {
            name: this.minPlanetLevel.name,
            innerText: 'Test dropdown',
            size: 10,
            getValueLabel: (value) => { return `Level ${value}`; },
            uiType: 'dropdown'
        };
        inputs.push(minSilver);
        inputs.push(minPlanetLevel);
        buildUi(container, inputs, this);
    }
 */

export const buildStepper = (stepObj, classObj) => {
    const name = stepObj.name;
    const getValueLabel = stepObj.getValueLabel;
    let stepperLabel = document.createElement('label');
    stepperLabel.innerText = stepObj.innerText;
    stepperLabel.style.display = 'block';
    let stepper = document.createElement('input');
    stepper.type = 'range';
    stepper.min = stepObj.min;
    stepper.max = stepObj.max;
    stepper.step = stepObj.step;
    stepper.value = classObj[name]['value'];
    stepper.style.width = '80%';
    stepper.style.height = '24px';
    let stepperValue = document.createElement('span');
    stepperValue.innerText = `${getValueLabel(stepper.value)}`;
    stepperValue.style.float = 'right';
    stepper.onchange = (evt) => {
        stepperValue.innerText = `${getValueLabel(evt.target.value)}`;
        try {
            // update of class Object
            classObj[name]['value'] = parseInt(evt.target.value, 10); // assuming values are integers
        }
        catch (e) {
            console.error(`could not parse ${name}`, e);
        }
    };
    return [stepperLabel, stepper, stepperValue];
};

// Returns an array: [levelLabel, level]
// Need to pass class instance in order to update variables.
// Append to the DOM in given order.
export const buildDropdown = (dropObj, classObj) => {
    const getValueLabel = dropObj.getValueLabel;
    const name = dropObj['name'];
    let levelLabel = document.createElement('label');
    levelLabel.innerText = dropObj.innerText;
    levelLabel.style.display = 'block';
    let level = document.createElement('select');
    level.style.background = 'rgb(8,8,8)';
    level.style.width = '100%';
    level.style.marginTop = '10px';
    level.style.marginBottom = '10px';
    Array.from(Array(dropObj.size).keys()).forEach(lvl => {
        let opt = document.createElement('option');
        opt.value = `${lvl}`;
        opt.innerText = `${getValueLabel(lvl)}`;
        level.appendChild(opt);
    });
    level.value = `${classObj[name]['value']}`;
    level.onchange = (evt) => {
        try {
            classObj[name]['value'] = parseInt(evt.target.value, 10);
        }
        catch (e) {
            console.error(`could not parse ${name}`, e);
        }
    };
    return [levelLabel, level];
};

// appends elements to the DOM from list.
export const appendListToDom = (container, eltList) => {
    try {
        for (const [index, elt] of eltList.entries()) {
            container.appendChild(elt);
        }
    }
    catch (e) {
        console.log('append to DOM error', e);
    }
};

// In plugin constructor, call: buildUi(container, inputs, this);
// where inputs is the list of type stepObj or dropObj and *this* is the plugin class
export const buildUi = (container, objList, classObj) => {
    let elements = [];
    for (const obj of objList) {
        switch (obj.uiType) {
            case 'dropdown':
                elements.push(buildDropdown(obj, classObj));
                break;
            case 'stepper':
                elements.push(buildStepper(obj, classObj));
                break;
            default:
                break;
        }
    }
    appendListToDom(container, elements.flat());
};