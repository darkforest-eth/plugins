/* Harvest artifacts. Transport artifacts to suitable spacetime rips and withdraw.
** Optimized for peacetime. Use with caution if at war.
** 
** Code Logic:
**   Step 1, Withdraw if it is on a spacetime rip. Deactivate if necessary.
**   Step 2, Move to a rip if need be. Acquire an unclaimed rip if necessary.
**   Step 3, Finally, failing 1 and 2, transport to a higher level planet nearby. 
** 
** Note: wait for tx to confirm between runs. Code does not handle unconfirmed tx gracefully.      
** Note2: code loops over all planets with artifacts instead of looping over all artifacts. 
**     This is to get around a bug with df.getArtifactWithId occasionally returning _undefined_ even with a valid artifactId.
** 
** Rendering code adapted from crawplanet plugin.
**
*/

const planetTypes = {
  'Planet': 0,
  'Asteroid': 1,
  'Foundry': 2,
  'Spacetime Rip': 3,
  'Quasar': 4,
};

const planetLevels = [9, 8, 7, 6, 5, 4, 3, 2, 1];

let autoDeactivate = false;  
 
class Plugin {
  constructor() {
    this.minPlanetLevel = 2;
    this.numberCount = 10;
  }
  render(container) {
    container.style.width = '200px';

    if (countArtifactsByPlanetLevel(this.minPlanetLevel) == 0 && this.minPlanetLevel > 1) --this.minPlanetLevel;

    /** try reload the stepper every 60 seconds */
    let popolateLevel = () => {
      level.innerHTML = "";
      level.value = `${this.minPlanetLevel}`;
      planetLevels.forEach(lvl => {
        let opt = document.createElement('option');
        opt.value = `${lvl}`;
        if (countArtifactsByPlanetLevel(lvl) > 0) {
          opt.innerText = `> Level ${lvl} (${countArtifactsByPlanetLevel(lvl)})`;
          level.appendChild(opt);
        }
      });
    }


    let stepper = document.createElement('input');
    stepper.type = 'range';
    stepper.min = '0';
    stepper.max = '50';
    stepper.step = '5';
    stepper.value = `${this.numberCount}`;
    stepper.style.width = '80%';
    stepper.style.height = '24px';

    let stepperLabel = document.createElement('label');
    stepperLabel.innerText = `How many to harvest:`;
    stepperLabel.style.display = 'block';

    let counter = document.createElement('span');
    counter.innerText = `${stepper.value}`;
    counter.style.float = 'right';

    stepper.onchange = (evt) => {
      counter.innerText = `${evt.target.value}`;
      try {
        this.numberCount = parseInt(evt.target.value, 10);
      } catch (e) {
        console.error('could not parse number counter', e);
      }
    }

    let levelLabel = document.createElement('label');
    levelLabel.innerText = 'Minimum level:';
    levelLabel.style.display = 'block';

    let level = document.createElement('select');
    level.style.background = 'rgb(8,8,8)';
    level.style.width = '100%';
    level.style.marginTop = '10px';
    level.style.marginBottom = '10px';

    popolateLevel();
    level.value = `${this.minPlanetLevel}`;

    level.onchange = (evt) => {
      try {
        this.minPlanetLevel = parseInt(evt.target.value, 10);
      } catch (e) {
        console.error('could not parse planet level', e);
      }
    }

    let message = document.createElement('div');
    let failedPlanets = document.createElement('div');

    let autoDeactivateCheckbox = document.createElement('input');
    autoDeactivateCheckbox.type = "Checkbox";
    autoDeactivateCheckbox.style.marginLeft = "15px";
    autoDeactivateCheckbox.checked = autoDeactivate;
    autoDeactivateCheckbox.id = "autoDeactivateCheckbox";

    let checkBoxLabel = document.createElement('label');
    checkBoxLabel.setAttribute('for','autoDeactivateCheckbox');
    checkBoxLabel.innerText = "Auto Deactivate:";

    function setAutoDeactivateCheckbox() {
      if(autoDeactivateCheckbox.checked == true) 
        autoDeactivate = true;
      else {
        autoDeactivate = false;
      }
    }    

    let button = document.createElement('button');
    button.style.width = '100%';
    button.style.marginBottom = '10px';
    button.innerHTML = 'Harvest Artifacts'
    button.onclick = () => {
      message.innerText = `Harvesting ${this.numberCount} planets.`;
      setAutoDeactivateCheckbox();

      let moves = autoProcessArtifacts(
        false, // true = "showOnly" for debug
        this.numberCount,
        this.minPlanetLevel,
        3,  //this is not used
        autoDeactivate
      )
        .then(errorPs => {
          failedPlanets.innerText = `${errorPs.length} needs intervention:`;
          for (let p of errorPs) {
            const pEntry = document.createElement('div');
            failedPlanets.appendChild(pEntry);
            pEntry.innerText = p;
            pEntry.onclick = () => { ui.centerLocationId(p) };
          }
        })
    }

    setInterval(() => {
      popolateLevel();
      level.value = `${this.minPlanetLevel}`;
    }, 30 * 1000);

    container.appendChild(checkBoxLabel);
    container.appendChild(autoDeactivateCheckbox);

    container.appendChild(stepperLabel);
    container.appendChild(stepper);
    container.appendChild(counter);
    container.appendChild(levelLabel);
    container.appendChild(level);
    container.appendChild(button);
    container.appendChild(message);
    container.appendChild(failedPlanets);
  }
}

export default Plugin;

function countArtifactsByPlanetLevel(minPlanetLevel = 2) {
  let planets =
    getMyValidPlanets()
      .filter((p) => p.heldArtifactIds
                  && p.heldArtifactIds.length > 0
                  && p.planetLevel >= minPlanetLevel);
return planets.length;
}


function getMyValidPlanets() {
  return df.getMyPlanets()
  .filter((p) => df.getLocationOfPlanet(p.locationId)
                 &&!p.destroyed)
}

function getUnclaimedValidPlanets() {
    return Array.from(df.getAllPlanets())
    .filter((p) => df.getLocationOfPlanet(p.locationId)
            &&!p.destroyed
            &&  p.owner == "0x0000000000000000000000000000000000000000")
}


async function autoProcessArtifacts(reviewonly = true, number = 5, minPlanetLevel = 2, theaterBoxNum = 3, autoDeactivate) {

//console.log ("autoDeactivate", autoDeactivate);

  let errorPlanets = [];
  let planets =
    getMyValidPlanets()
    .filter((p) => p.heldArtifactIds
              && p.heldArtifactIds.length > 0
              && p.planetLevel >= minPlanetLevel)
      .sort((b, a) => a.planetLevel - b.planetLevel)
      .slice(0, number)

  planets.forEach((p) => {
    let arts = p.heldArtifactIds;
    console.log(`working on L${p.planetLevel} ${Object.keys(planetTypes)[p.planetType]} [${arts.length}]ARTs. ${p.locationId}`);

    for (let i = 0; i < arts.length; ++i) {
      if (!df.getArtifactWithId(arts[i])) {
        console.log(" --artifact not found:", arts[i]);
        break;
      }

      if (isArtifactActivated(df.getArtifactWithId(arts[i]))) {  //TODO: check for time
        df.terminal.current.println(` --artifact is activated; ${autoDeactivate ? "deactivating  now" : "Not deactivating"}`);
        console.log(` --artifact is activated; ${autoDeactivate ? "deactivating  now" : "Not deactivating"}`);
        if (!reviewonly && autoDeactivate) df.deactivateArtifact(p.locationId, arts[i]);
        break;
      }

      if ((p.planetType == planetTypes["Spacetime Rip"]) && (p.planetLevel > (df.getArtifactWithId(arts[i]).rarity))  // art at rip
      ) {
        console.log(" -- withdrawing", p.locationId, arts[i], df.getArtifactWithId(arts[i]).rarity);
        df.terminal.current.println(`...withdrawing from ${p.locationId}`);

        if (!reviewonly) df.withdrawArtifact(p.locationId, arts[i]);
        continue;
      }
      //do transport
      if (!reviewonly || 1 == 1) {  //<<<<<<<<<
        transportART2(p.locationId, arts[i], 98, "", errorPlanets);  //hard code to 98% of range, for peace time
        return; // this should set it to only transport 1 single art per planet; additional arts will be dealt on next run
      }
    }
  })


  return errorPlanets;
}

function transportART2(srcId, artId, maxRangePct = 50, tgtId = "", errorPlanets = []) {
  const myART = df.getArtifactWithId(artId);
  if (!myART) { console.log(" --invalid ART"); return }

  const source = df.getPlanetWithId(srcId);

  if (source.owner != df.account) { console.log(" --Dont Own planet"); return }

  //#1, try send to a RIP
  if (tgtId === "") {
    let targetList = getMyValidPlanets()
      .filter((p) => p.planetType == planetTypes["Spacetime Rip"]  //only to RIP
                  && p.planetLevel > myART.rarity
                  && df.getDist(srcId, p.locationId) < df.getMaxMoveDist(srcId, maxRangePct)
                  && p.locationId !== srcId)
      .sort((a, b) => { return df.getDist(srcId, a.locationId) - df.getDist(srcId, b.locationId) })

    if (targetList.length > 0) {
      tgtId = targetList[0].locationId;
      console.log(`  --Found L${targetList[0].planetLevel} RIP ${tgtId}`);
    }
  }

  //#2, try acquire a RIP
  if (tgtId === "") {
    let targetList = getUnclaimedValidPlanets()
      .filter((p) => p.planetType == planetTypes["Spacetime Rip"]  //only to RIP
  && p.planetLevel > myART.rarity
  && (0.9 * source.energy) > //0.9 hard coded for peace time transporting
        (df.getEnergyNeededForMove(srcId, p.locationId, (p.energy * (p.defense / 100) + 0.01 * p.energy))))
      .sort((a, b) => { return df.getDist(srcId, a.locationId) - df.getDist(srcId, b.locationId) })

    if (targetList.length > 0) {
      tgtId = targetList[0].locationId;
      console.log(`  --Found an unowned L${targetList[0].planetLevel} RIP ${tgtId}`);
    }
  } else {
    let targetList = [];
  }

  //#3 if no RIP, send to a higher level planet nearby, but not quasar
  if (tgtId === "") {
    let targetList = getMyValidPlanets()
      .filter((p) => p.planetType == planetTypes["Spacetime Rip"]  //only to RIP
                  && p.planetLevel > source.planetLevel
                  && df.getDist(srcId, p.locationId) < df.getMaxMoveDist(srcId, maxRangePct)
                  && p.locationId !== srcId
                  && p.planetType !== planetTypes.Quasar)
      .sort((a, b) => { return df.getDist(srcId, a.locationId) - df.getDist(srcId, a.locationId) })

    if (targetList.length > 0) {
      tgtId = targetList[0].locationId;
    } else {
      console.log(` --No spacetime rip nearby and no higher level planets nearby... `);
      console.log(`  --intervention required: ui.centerLocationId(${srcId})`);
      df.terminal.current.println("intervention required");
      errorPlanets.push(srcId);
      return;
    }
  }

  if (tgtId !== "") {

    const target = df.getPlanetWithId(tgtId);

    let FORCES = Math.ceil(df.getEnergyNeededForMove(srcId, tgtId, Math.min(0.01 * target.energyCap, 5)));

    if (target.owner == "0x0000000000000000000000000000000000000000") {  //override if attacking
      FORCES = Math.ceil(df.getEnergyNeededForMove(srcId, tgtId, ((target.energy * (target.defense / 100)) + 0.15 * target.energy)));
      if (FORCES < source.energy * 0.98)
        FORCES = Math.ceil(df.getEnergyNeededForMove(srcId, tgtId, ((target.energy * (target.defense / 100)) + 0.10 * target.energy)));
      if (FORCES < source.energy * 0.98)
        FORCES = Math.ceil(df.getEnergyNeededForMove(srcId, tgtId, ((target.energy * (target.defense / 100)) + 0.05 * target.energy)));
      if (FORCES < source.energy * 0.98)
        FORCES = Math.ceil(df.getEnergyNeededForMove(srcId, tgtId, ((target.energy * (target.defense / 100)) + Math.max(0.01 * target.energyCap), 10)));
    }

    let silverTOSEND = 0;

    if (FORCES < source.energy * 0.98) {  //hard code 98% for peace time
      df.terminal.current.println(`  --Sending ART to L${target.planetLevel} ${tgtId}`);
      console.log(`  --Sending ART to L${target.planetLevel} ${tgtId}`);
      df.move(srcId, tgtId, FORCES, silverTOSEND, artId);
      return;
    } 
    
    if (FORCES < 0.98 * source.energyCap  && source.planetType != planetTypes.Quasar) {  //can wait
      console.log(`  --not enough energy to send: (${FORCES} vs ${source.energy})`);
      return;
    } 

      //if we got this far,manual intervention is required
    df.terminal.current.println("intervention required");
    console.log(`  --intervention required: ui.centerLocationId(${srcId})`);
    errorPlanets.push(srcId);

    return "nothing to do";
  }
  return "ART";
}


function isArtifactActivated(artifact) {
  if (artifact === undefined) {
    return false;
  }
  return artifact.lastActivated > artifact.lastDeactivated;
}

