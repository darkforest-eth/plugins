// Display the planet with active artifact, specially for cannon.
// When cannon first activated, only a thin circle can be seen around the planet.
// As time goes by, a thick arc will appears, and it will extend longer and longer.
// The thick arc become a circle when the cannon ready.

import { 
  BiomeNames
} from "https://cdn.skypack.dev/@darkforest_eth/types";

import {
  coords
} from 'https://plugins.zkga.me/utils/utils.js';

import {
  ArtifactType,
  ArtifactTypeNames
} from "https://cdn.skypack.dev/@darkforest_eth/types";

const EXCEPT_ARTIFACT_TYPES = [ArtifactType.BlackDomain, ArtifactType.BloomFilter, ArtifactType.Unknown];
const ARTIFACT_TYPES = Object.values(ArtifactType).filter((type) => EXCEPT_ARTIFACT_TYPES.indexOf(type) === -1).map((type) => ({ value: type, text: ArtifactTypeNames[type] }));


function getPlayerColor(ethAddress) {
  return df.getProcgenUtils().getPlayerColor(ethAddress);
}


function drawArc(ctx, planet, artifact, color){

  let percent = 1;
  if (artifact.artifactType === ArtifactType.PhotoidCannon) {
    let timePass = Math.floor(Date.now() / 1000 - artifact.lastActivated);
    percent = timePass / ui.gameManager.contractConstants.PHOTOID_ACTIVATION_DELAY;
  }

  const viewport = ui.getViewport();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  if (!planet.location) {
    return false;
  }
  const {x, y} = viewport.worldToCanvasCoords(planet.location.coords);
  const range = ui.getRadiusOfPlanetLevel(planet.planetLevel) * 4;
  const trueRange = viewport.worldToCanvasDist(range);
  ctx.beginPath();
  ctx.arc(x, y, trueRange, 0, 2 * Math.PI * percent);
  ctx.stroke();
  if (artifact.artifactType === ArtifactType.PhotoidCannon && percent < 0.99) {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, trueRange, 0, 2 * Math.PI);
    ctx.stroke();
  }
  return true;
}


class Plugin {
  constructor() {
    this.message = document.createElement('div');
    this.showGroup = 'My';
    this.showArtifactTypes = [ArtifactType.PhotoidCannon];
  }


  async render(container) {
    container.style.minHeight = 'unset';
    container.style.width = '300px';

    let groupNameLabel = document.createElement('div');
    groupNameLabel.innerHTML = 'Highlight all active artifacts or just mine?'
    container.appendChild(groupNameLabel);

    let radioDiv = document.createElement('div');
    let groupNames = ["All", "My"];
    for (let groupName of groupNames) {
      let radioInput = document.createElement('input');
      radioInput.style.width = '10%';
      radioInput.name = "groupradio";
      radioInput.type = "radio";
      radioInput.value = groupName;
      if (groupName == this.showGroup) {
        radioInput.checked = true;
      }
      radioInput.onchange = (evt) => {
        if (evt.target.checked) {
          this.showGroup = evt.target.value;
        }
      };
      let radioLabel = document.createElement('label');
      radioLabel.style.width = '30%';
      radioLabel.innerHTML = groupName;
      radioDiv.appendChild(radioInput);
      radioDiv.appendChild(radioLabel);
    }
    container.appendChild(radioDiv);


    let artifactTypeLabel = document.createElement('div');
    artifactTypeLabel.innerHTML = 'ArtifactTypes to highlight.'
    artifactTypeLabel.style.marginTop = '10px';
    artifactTypeLabel.style.marginBottom = '5px';
    container.appendChild(artifactTypeLabel);

    for (let artifactType of ARTIFACT_TYPES) {
      let checkboxDiv = document.createElement('div');
      let checkboxInput = document.createElement('input');
      checkboxInput.style.width = '10%';
      checkboxInput.type = "checkbox";
      checkboxInput.value = artifactType.value;
      if (this.showArtifactTypes.indexOf(artifactType.value) != -1) {
        checkboxInput.checked = true;
      }
      checkboxInput.onchange = (evt) => {
        if (evt.target.checked) {
          this.showArtifactTypes.push(parseInt(evt.target.value));
        } else {
          let index = this.showArtifactTypes.indexOf(parseInt(evt.target.value));
          if (index != -1) {
            this.showArtifactTypes.splice(index, 1);
          }
          this.showArtifactTypes.sort();
        }
        //this.message.innerHTML = this.showArtifactTypes;
      }

      let checkboxLabel = document.createElement('label');
      checkboxLabel.style.width = '80%';
      checkboxLabel.innerHTML = artifactType.text;
      checkboxDiv.appendChild(checkboxInput);
      checkboxDiv.appendChild(checkboxLabel);
      container.appendChild(checkboxDiv);
    }

    container.appendChild(this.message);
  }


  draw(ctx) {
    let planets = [];
    if (this.showGroup == 'My') {
      planets = df.getMyPlanets();
    } else if (this.showGroup == 'All') {
      planets = df.getAllPlanets();
    }
    for (let planet of planets) {
      let artifact = df.getActiveArtifact(planet);
      if (!artifact) {
        continue;
      }

      // just highlight the artifact you choose.
      if (this.showArtifactTypes.indexOf(artifact.artifactType) != -1)  {
        let color = getPlayerColor(planet.owner);
        drawArc(ctx, planet, artifact, color);
      }
    }
  }


}

export default Plugin;

