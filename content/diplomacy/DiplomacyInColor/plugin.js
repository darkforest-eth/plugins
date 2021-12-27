import { EMPTY_ADDRESS } from "https://cdn.skypack.dev/@darkforest_eth/constants";
var removeAllChildNodes = (parent) => {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
};
let playersEnemy = [
    
];
// EMPTY_ADDRESS,
let playersNeutral = [];

let playersFriendly = [];

class Diplomacy {
    constructor() {
        this.highlightStyle = 0;
        this.rangePercent = 8;
        this.alpha = 0;
        this.globalAlpha = 1;
        this.ownColor = '#ffffff';
        
        this.FriendlyColor = '#00FF00';
        this.NeutralColor = '#FFFF00';
        this.EnemyColor = '#FF0000' ;
        this.highlightStyleHandler = this.highlightStyleHandler.bind(this);
        this.rangeHandler = this.rangeHandler.bind(this);
        this.alphaHandler = this.alphaHandler.bind(this);
        this.globalAlphaHandler = this.globalAlphaHandler.bind(this);
        this.ownColorHandler = this.ownColorHandler.bind(this);
        this.FriendlyColorHandler = this.FriendlyColorHandler.bind(this);
        this.NeutralColorHandler = this.NeutralColorHandler.bind(this);
        this.EnemyColorHandler = this.EnemyColorHandler.bind(this);
      }

  hexToHsl(H) {
    let r = 0, g = 0, b = 0;
    if (H.length == 4) {
      r = '0x' + H[1] + H[1]; g = '0x' + H[2] + H[2]; b = '0x' + H[3] + H[3];
    } else if (H.length == 7) {
      r = '0x' + H[1] + H[2]; g = '0x' + H[3] + H[4]; b = '0x' + H[5] + H[6];
    }
    r /= 255; g /= 255; b /= 255;
    let cmin = Math.min(r, g, b),
      cmax = Math.max(r, g, b),
      delta = cmax - cmin,
      h = 0, s = 0, l = 0;
  
    if (delta == 0) h = 0;
    else if (cmax == r) h = ((g - b) / delta) % 6;
    else if (cmax == g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  
    h = Math.round(h * 60);
  
    if (h < 0) h += 360;
  
    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);
    
    return [h + ', ' + s + '%, ' + l + '%'];
  }

  getSliderHtml(className, text, min, max, step, value) {
    
    return `<label class='${className}'>
      <div style='display: inline-block; min-width: 120px'>${text}</div><input type='range'
          value='${value}'
          min='${min}'
          max='${max}'
          step='${step}'
          style='transform: translateY(3px); margin: 0 10px;' />
        <span>${value}</span>
      </label>`;
  }

  getColorPicker(className, text, value) {
    return `<label class='${className}'>
      <div style='display: inline-block; min-width: 120px'>${text}</div><input type='color' 
          value='${value}'
          style='transform: translateY(3px); margin: 0 10px;' />
      </label>`;
  }

  getSelect(className, text, items, selectedValue) {

    return `<label class='${className}'>
      <div style='display: inline-block; min-width: 120px'>${text}</div>
        <select style='background: rgb(8,8,8); margin-top: 5px; padding: 3px 5px; border: 1px solid white; border-radius: 3px;' 
          value=${selectedValue}
        >
          ${items.map(
            ({ value, text }) => {return `<option value=${value}>${text}</option>`}
          )}
        </select>
      </label>`;
  }

renderSourceListFriendly(sourceContainerFriendly, playersFriendly) {
    removeAllChildNodes(sourceContainerFriendly, playersFriendly);
    for (const item of playersFriendly) {
        sourceContainerFriendly.append(item.substr(0, 20));
        // deleteButton for remove pair from the list
        const delButton = document.createElement("button");
        sourceContainerFriendly.append(delButton);
        delButton.innerText = "Del";
        delButton.style.marginLeft = "10px";
        delButton.addEventListener("click", () => {
            for (let i = 0; i < playersFriendly.length; i++) {
                if (playersFriendly[i] == item) {
                    playersFriendly.splice(i, 1);
                    break;
                }
            }
            this.renderSourceListFriendly(sourceContainerFriendly, playersFriendly);
        });
        // new line
        const newLine = document.createElement("br");
        sourceContainerFriendly.append(newLine);
    }
}

renderSourceListNeutral(sourceContainerNeutral, playersNeutral) {
    removeAllChildNodes(sourceContainerNeutral, playersNeutral);
    for (const item of playersNeutral) {
        sourceContainerNeutral.append(item.substr(0, 20));
        // deleteButton for remove pair from the list
        const delButton = document.createElement("button");
        sourceContainerNeutral.append(delButton);
        delButton.innerText = "Del";
        delButton.style.marginLeft = "10px";
        delButton.addEventListener("click", () => {
            for (let i = 0; i < playersNeutral.length; i++) {
                if (playersNeutral[i] == item) {
                    playersNeutral.splice(i, 1);
                    break;
                }
            }
            this.renderSourceListNeutral(sourceContainerNeutral, playersNeutral);
        });
        // new line
        const newLine = document.createElement("br");
        sourceContainerNeutral.append(newLine);
    }
}

renderSourceListEnemy(sourceContainerEnemy, playersEnemy) {
    removeAllChildNodes(sourceContainerEnemy, playersEnemy);
    for (const item of playersEnemy) {
        sourceContainerEnemy.append(item.substr(0, 20));
        // deleteButton for remove pair from the list
        const delButton = document.createElement("button");
        sourceContainerEnemy.append(delButton);
        delButton.innerText = "Del";
        delButton.style.marginLeft = "10px";
        delButton.addEventListener("click", () => {
            for (let i = 0; i < playersEnemy.length; i++) {
                if (playersEnemy[i] == item) {
                    playersEnemy.splice(i, 1);
                    break;
                }
            }
            this.renderSourceListEnemy(sourceContainerEnemy, playersEnemy);
        });
        // new line
        const newLine = document.createElement("br");
        sourceContainerEnemy.append(newLine);
    }
}


async render(container) {
    container.style.width = '500px';
    container.style.heigth = '600px';

    let sourceContainerFriendly = document.createElement("div");
    sourceContainerFriendly.innerText = "Current Friendly source: none";

    let sourceContainerNeutral = document.createElement("div");
    sourceContainerNeutral.innerText = "Current Neutral source: none";

    let sourceContainerEnemy = document.createElement("div");
    sourceContainerEnemy.innerText = "Current Enemy source: none";
    

    let sourceColorOwner = document.createElement("div"); 
    sourceColorOwner.innerText = "Current Enemy source: none";
    sourceColorOwner.style.width = '49%';
    sourceColorOwner.innerHTML = [
            this.getColorPicker('ownColor', 'Your Color:', this.ownColor),
            this.getSelect('highlight', 'Highligh:', [{value: 0, text: "Heatmap"}, {value: 1, text: "Circle"}], this.highlightStyle),
            this.getSliderHtml('range', 'Planet Range:', 1, 100, 1, this.rangePercent),
            this.getSliderHtml('alpha', 'Gradient Alpha:', 0, 1, 0.01, this.alpha),
            this.getSliderHtml('globalAlpha', 'Global Alpha:', 0, 1, 0.01, this.globalAlpha)
          ].join('<br />');
          this.selectHighlightStyle = sourceColorOwner.querySelector('label.highlight select');
          this.selectHighlightStyle.addEventListener('change', this.highlightStyleHandler);
      
          this.valueRange = sourceColorOwner.querySelector('label.range span');
          this.sliderRange = sourceColorOwner.querySelector('label.range input');
          this.sliderRange.addEventListener('input', this.rangeHandler);
      
          this.valueAlpha = sourceColorOwner.querySelector('label.alpha span');
          this.sliderAlpha = sourceColorOwner.querySelector('label.alpha input');
          this.sliderAlpha.addEventListener('input', this.alphaHandler);
      
          this.valueGlobalAlpha = sourceColorOwner.querySelector('label.globalAlpha span');
          this.sliderGlobalAlpha = sourceColorOwner.querySelector('label.globalAlpha input');
          this.sliderGlobalAlpha.addEventListener('input', this.globalAlphaHandler);
      
          this.colorPickerOwnColor = sourceColorOwner.querySelector('label.ownColor input');
          this.colorPickerOwnColor.addEventListener('input', this.ownColorHandler);


          let sourceColorFriendly = document.createElement("div"); 
    sourceColorFriendly.innerText = "Current Enemy source: none";
    sourceColorFriendly.style.width = '49%';
    sourceColorFriendly.innerHTML = [
            this.getColorPicker('FriendlyColor', 'Friendly Color:', this.FriendlyColor),
            
          ].join('<br />');
         


          let sourceColorNeutral = document.createElement("div"); 
          sourceColorNeutral.innerText = "Current Enemy source: none";
          sourceColorNeutral.style.width = '49%';
          sourceColorNeutral.innerHTML = [
            this.getColorPicker('NeutralColor', 'Neutral Color:', this.NeutralColor),
            
          ].join('<br />');
          


          let sourceColorEnemy = document.createElement("div"); 
          sourceColorEnemy.innerText = "Current Enemy source: none";
          sourceColorEnemy.style.width = '49%';
          sourceColorEnemy.innerHTML = [
            this.getColorPicker('EnemyColor', 'Enemy Color:', this.EnemyColor),
          ].join('<br />');
          

          let containerFriendly = document.createElement("div");
          
          

        let addButtonFriendly = document.createElement('button');
        addButtonFriendly.style.width = '45%';
        addButtonFriendly.style.marginBottom = '10px';
        addButtonFriendly.innerHTML = 'Add Friendly';
        addButtonFriendly.onclick = () => {
            
            let selected = ui.getSelectedPlanet();
            

            if (selected) {
                let tempID = selected.owner;
                playersFriendly.push(tempID);
                console.log("added Friendly " + tempID);
                console.log(playersFriendly);
                this.renderSourceListFriendly(sourceContainerFriendly, playersFriendly);
            }
            else {
                console.log("Not planet selected");
            }
        };

        let addButtonNeutral = document.createElement('button');
        addButtonNeutral.style.width = '45%';
        addButtonNeutral.style.marginBottom = '10px';
        addButtonNeutral.innerHTML = 'Add Neutral';
        addButtonNeutral.onclick = () => {
            
            let selected = ui.getSelectedPlanet();
            

            if (selected) {
                let tempID = selected.owner;
                playersNeutral.push(tempID);
                console.log("added Neutral " + tempID);
                console.log(playersNeutral);
                this.renderSourceListNeutral(sourceContainerNeutral, playersNeutral);
            }
            else {
                console.log("Not planet selected");
            }
        };

        let addButtonEnemy = document.createElement('button');
        addButtonEnemy.style.width = '45%';
        addButtonEnemy.style.marginBottom = '10px';
        addButtonEnemy.innerHTML = 'Add Enemy';
        addButtonEnemy.onclick = () => {
            
            let selected = ui.getSelectedPlanet();
            

            if (selected) {
                let tempID = selected.owner;
                playersEnemy.push(tempID);
                console.log("added Enemy " + tempID);
                console.log(playersEnemy);
                this.renderSourceListEnemy(sourceContainerEnemy, playersEnemy);
            }
            else {
                console.log("Not planet selected");
            }
        };

        let clearButton = document.createElement('button');
        clearButton.style.width = '45%';
        clearButton.style.marginBottom = '10px';
        clearButton.innerHTML = 'Clean ALL';
        clearButton.onclick = () => {
            playersFriendly = [];
            playersNeutral = [];
            playersEnemy = [];
           // playersEnemy.push(EMPTY_ADDRESS);
            console.log(playersFriendly);
            console.log(playersNeutral);
            console.log(playersEnemy);
            console.log("Clean");
            this.renderSourceListFriendly(sourceContainerFriendly, playersFriendly);
            this.renderSourceListNeutral(sourceContainerNeutral, playersNeutral);
            this.renderSourceListEnemy(sourceContainerEnemy, playersEnemy);
            sourceContainerFriendly.innerText = "Current Friendly source: none";
            sourceContainerNeutral.innerText = "Current Neutral source: none";
        };

        let clearButtonFriendly = document.createElement('button');
        clearButtonFriendly.style.width = '45%';
        clearButtonFriendly.style.marginBottom = '10px';
        clearButtonFriendly.innerHTML = 'Clean Friendly';
        clearButtonFriendly.onclick = () => {
            playersFriendly = [];
            console.log(playersFriendly);
            console.log("Cleaned Friendly list");
            
            this.renderSourceListFriendly(sourceContainerFriendly, playersFriendly);
            sourceContainerFriendly.innerText = "Current Friendly source: none";
        };

        let clearButtonNeutral = document.createElement('button');
        clearButtonNeutral.style.width = '45%';
        clearButtonNeutral.style.marginBottom = '10px';
        clearButtonNeutral.innerHTML = 'Clean Neutral';
        clearButtonNeutral.onclick = () => {
            playersNeutral = [];
            console.log(playersNeutral);
            console.log("Cleaned Neutral list");
            
            this.renderSourceListNeutral(sourceContainerNeutral, playersNeutral);
            sourceContainerNeutral.innerText = "Current Neutral source: none";
        };

        let clearButtonEnemy = document.createElement('button');
        clearButtonEnemy.style.width = '45%';
        clearButtonEnemy.style.marginBottom = '10px';
        clearButtonEnemy.innerHTML = 'Clean Enemy';
        clearButtonEnemy.onclick = () => {
            playersEnemy = [];
            //playersEnemy.push(EMPTY_ADDRESS);
            console.log(playersEnemy);
            console.log("Cleaned Enemy list");
            
            this.renderSourceListEnemy(sourceContainerEnemy, playersEnemy);
        };
        let RefreshActive = false;
        let RefreshButton = document.createElement('button');
        RefreshButton.style.width = '45%';
        RefreshButton.style.marginBottom = '10px';
        RefreshButton.innerHTML = 'Refresh';
        RefreshButton.onclick = () => {
            RefreshActive = !RefreshActive;
            if (RefreshActive){
              let planetsFriendly = Array.from(df.getAllPlanets()).filter(p => (
                playersFriendly.includes(p.owner)));
                console.log('Friendly planets list ' + planetsFriendly);
            let planetsNeutral = Array.from(df.getAllPlanets()).filter(p => (
                playersNeutral.includes(p.owner)));
                console.log('Neutral planets list ' + planetsNeutral);
              //      console.log(planetsNeutral);
            let planetsEnemy = Array.from(df.getAllPlanets()).filter(p => (p.owner !== df.account &&
                playersEnemy.includes(p.owner))); 
                console.log('Enemy planets list ' + planetsEnemy);
                
                RefreshButton.innerHTML = 'Stop';
            }else{
              
            
                RefreshButton.innerHTML = 'Refresh';
            }

            
        };
        
         
        
        container.appendChild(addButtonFriendly);
        container.appendChild(clearButtonFriendly);
        container.appendChild(sourceColorFriendly);
        container.appendChild(sourceContainerFriendly);
        container.appendChild(sourceColorOwner);

        
        container.appendChild(addButtonNeutral);
        container.appendChild(clearButtonNeutral);
        container.appendChild(sourceColorNeutral);
        container.appendChild(sourceContainerNeutral);
        

        
        container.appendChild(addButtonEnemy);
        container.appendChild(clearButtonEnemy);
        container.appendChild(sourceColorEnemy);
        container.appendChild(sourceContainerEnemy);
        
        container.appendChild(clearButton);
        container.appendChild(RefreshButton);
          
        
        
    }

    highlightStyleHandler() {
        this.highlightStyle = this.selectHighlightStyle.value;
    
        //I couldn't find a better way...
        if(this.highlightStyle == 0) {
          document.querySelector('label.alpha').style.display = "inline-block";
          document.querySelector('label.range').style.display = "inline-block";
          document.querySelector('label.globalAlpha').style.display = "inline-block";
        } else {
          document.querySelector('label.alpha').style.display = "none";
          document.querySelector('label.range').style.display = "none";
          document.querySelector('label.globalAlpha').style.display = "none";
        }
      }
    
      rangeHandler() {
        this.rangePercent = parseInt(this.sliderRange.value);
        this.valueRange.innerHTML = `${this.sliderRange.value}%`;
      }
    
      alphaHandler() {
        this.alpha = parseFloat(this.sliderAlpha.value);
        this.valueAlpha.innerHTML = `${this.sliderAlpha.value}`;
      }
    
      globalAlphaHandler() {
        this.globalAlpha = parseFloat(this.sliderGlobalAlpha.value);
        this.valueGlobalAlpha.innerHTML = `${this.sliderGlobalAlpha.value}`;
      }
    
      ownColorHandler() {
        this.ownColor = this.colorPickerOwnColor.value;
      }

      FriendlyColorHandler() {
        this.FriendlyColor = this.colorPickerFriendlyColor.value;
      }
      NeutralColorHandler() {
        this.NeutralColor = this.colorPickerOwnNeutralColor.value;
      }
      EnemyColorHandler() {
        this.EnemyColor = this.colorPickerEnemyColor.value;
      }
      
      draw(ctx) {
          const origGlobalAlpha = ctx.globalAlpha;
        const origFillStyle = ctx.fillStyle;
        const origSrokeStyle = ctx.strokeStyle;
        const viewport = ui.getViewport();
        const planetsOwner = df.getMyPlanets();
        const planets = df.getAllPlanets();
        let planetsFriendly = Array.from(df.getAllPlanets()).filter(p => (
            playersFriendly.includes(p.owner)));
        let planetsNeutral = Array.from(df.getAllPlanets()).filter(p => (
            playersNeutral.includes(p.owner)));
          //      console.log(planetsNeutral);
        let planetsEnemy = Array.from(df.getAllPlanets()).filter(p => (
            playersEnemy.includes(p.owner))); 
              //  console.log(planetsEnemy);
        // paint bigger ones first
        // planets.sort((a, b) => b.range - a.range);
        // planets =  planetsFriendly;
        if(this.highlightStyle == 0) for (const p of planetsOwner) {
    
          // draw range circle
          const { x, y } = viewport.worldToCanvasCoords(p.location.coords);
          const hsl = this.hexToHsl(this.ownColor);
    
          const fac = Math.max(0, Math.log2(this.rangePercent / 5));
          const range = fac * p.range;
          const trueRange = viewport.worldToCanvasDist(range);
    
          ctx.globalAlpha = this.globalAlpha;
          ctx.beginPath();
          ctx.arc(x, y, trueRange, 0, 2 * Math.PI);
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, trueRange);
          gradient.addColorStop(0, `hsla(${hsl}, 1)`);
          gradient.addColorStop(1, `hsla(${hsl}, ${this.alpha})`);   
          ctx.fillStyle = gradient;
          ctx.fill();
    
          // reset ctx
          ctx.fillStyle = origFillStyle;
          ctx.strokeStyle = origSrokeStyle;
          ctx.globalAlpha = origGlobalAlpha;
        }
        else {
    
          ctx.fillStyle = this.ownColor;
          ctx.strokeStyle = this.ownColor;
          
          for (let planet of planetsOwner) {
            if (!planet.location) continue;
            let { x, y } = planet.location.coords;
    
            // add red circle when level <= 4
            if (planet.planetLevel <= 4) {
              ctx.lineWidth = 1.5;
              ctx.strokeStyle = "dashed";
              ctx.beginPath();
              ctx.arc(
                viewport.worldToCanvasX(x),
                viewport.worldToCanvasY(y),
                viewport.worldToCanvasDist(ui.getRadiusOfPlanetLevel(3) * 6),
                0,
                2 * Math.PI
              );
              // ctx.fill();
              ctx.stroke();
              ctx.closePath();
            }
    
            ctx.beginPath();
            ctx.arc(
              viewport.worldToCanvasX(x),
              viewport.worldToCanvasY(y),
              viewport.worldToCanvasDist(
                ui.getRadiusOfPlanetLevel(planet.planetLevel)
              ),
              0,
              2 * Math.PI
            );
            ctx.fill();
            // ctx.stroke();
            ctx.closePath();
          }
        }
        if (this.highlightStyle == 0) for (const p of planetsFriendly) {
    
            // draw range circle
            const { x, y } = viewport.worldToCanvasCoords(p.location.coords);
            const hsl = this.hexToHsl(this.FriendlyColor);
      
            const fac = Math.max(0, Math.log2(this.rangePercent / 5));
            const range = fac * p.range;
            const trueRange = viewport.worldToCanvasDist(range);
      
            ctx.globalAlpha = this.globalAlpha;
            ctx.beginPath();
            ctx.arc(x, y, trueRange, 0, 2 * Math.PI);
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, trueRange);
            gradient.addColorStop(0, `hsla(${hsl}, 1)`);
            gradient.addColorStop(1, `hsla(${hsl}, ${this.alpha})`);   
            ctx.fillStyle = gradient;
            ctx.fill();
      
            // reset ctx
            ctx.fillStyle = origFillStyle;
            ctx.strokeStyle = origSrokeStyle;
            ctx.globalAlpha = origGlobalAlpha;
          }
          else {
    
            ctx.fillStyle = this.FriendlyColor;
            ctx.strokeStyle = this.FriendlyColor;
            
            for (let planet of planetsFriendly) {
              if (!planet.location) continue;
              let { x, y } = planet.location.coords;
      
              // add red circle when level <= 4
              if (planet.planetLevel <= 4) {
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = "dashed";
                ctx.beginPath();
                ctx.arc(
                  viewport.worldToCanvasX(x),
                  viewport.worldToCanvasY(y),
                  viewport.worldToCanvasDist(ui.getRadiusOfPlanetLevel(3) * 6),
                  0,
                  2 * Math.PI
                );
                // ctx.fill();
                ctx.stroke();
                ctx.closePath();
              }
      
              ctx.beginPath();
              ctx.arc(
                viewport.worldToCanvasX(x),
                viewport.worldToCanvasY(y),
                viewport.worldToCanvasDist(
                  ui.getRadiusOfPlanetLevel(planet.planetLevel)
                ),
                0,
                2 * Math.PI
              );
              ctx.fill();
              // ctx.stroke();
              ctx.closePath();
            }
          }
          if (this.highlightStyle == 0) for (const p of planetsNeutral) {
    
            // draw range circle
            const { x, y } = viewport.worldToCanvasCoords(p.location.coords);
            const hsl = this.hexToHsl(this.NeutralColor);
      
            const fac = Math.max(0, Math.log2(this.rangePercent / 5));
            const range = fac * p.range;
            const trueRange = viewport.worldToCanvasDist(range);
      
            ctx.globalAlpha = this.globalAlpha;
            ctx.beginPath();
            ctx.arc(x, y, trueRange, 0, 2 * Math.PI);
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, trueRange);
            gradient.addColorStop(0, `hsla(${hsl}, 1)`);
            gradient.addColorStop(1, `hsla(${hsl}, ${this.alpha})`);   
            ctx.fillStyle = gradient;
            ctx.fill();
      
            // reset ctx
            ctx.fillStyle = origFillStyle;
            ctx.strokeStyle = origSrokeStyle;
            ctx.globalAlpha = origGlobalAlpha;
          }
          else {
    
            ctx.fillStyle = this.NeutralColor;
            ctx.strokeStyle = this.NeutralColor;
            
            for (let planet of planetsNeutral) {
              if (!planet.location) continue;
              let { x, y } = planet.location.coords;
      
              // add red circle when level <= 4
              if (planet.planetLevel <= 4) {
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = "dashed";
                ctx.beginPath();
                ctx.arc(
                  viewport.worldToCanvasX(x),
                  viewport.worldToCanvasY(y),
                  viewport.worldToCanvasDist(ui.getRadiusOfPlanetLevel(3) * 6),
                  0,
                  2 * Math.PI
                );
                // ctx.fill();
                ctx.stroke();
                ctx.closePath();
              }
      
              ctx.beginPath();
              ctx.arc(
                viewport.worldToCanvasX(x),
                viewport.worldToCanvasY(y),
                viewport.worldToCanvasDist(
                  ui.getRadiusOfPlanetLevel(planet.planetLevel)
                ),
                0,
                2 * Math.PI
              );
              ctx.fill();
              // ctx.stroke();
              ctx.closePath();
            }
          }
          if (this.highlightStyle == 0) for (const p of planetsEnemy) {
    
            // draw range circle
            const { x, y } = viewport.worldToCanvasCoords(p.location.coords);
            const hsl = this.hexToHsl(this.EnemyColor);
      
            const fac = Math.max(0, Math.log2(this.rangePercent / 5));
            const range = fac * p.range;
            const trueRange = viewport.worldToCanvasDist(range);
      
            ctx.globalAlpha = this.globalAlpha;
            ctx.beginPath();
            ctx.arc(x, y, trueRange, 0, 2 * Math.PI);
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, trueRange);
            gradient.addColorStop(0, `hsla(${hsl}, 1)`);
            gradient.addColorStop(1, `hsla(${hsl}, ${this.alpha})`);   
            ctx.fillStyle = gradient;
            ctx.fill();
      
            // reset ctx
            ctx.fillStyle = origFillStyle;
            ctx.strokeStyle = origSrokeStyle;
            ctx.globalAlpha = origGlobalAlpha;
          }
          else {
    
            ctx.fillStyle = this.EnemyColor;
            ctx.strokeStyle = this.EnemyColor;
            
            for (let planet of planetsEnemy) {
              if (!planet.location) continue;
              let { x, y } = planet.location.coords;
      
              // add red circle when level <= 4
              if (planet.planetLevel <= 4) {
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = "dashed";
                ctx.beginPath();
                ctx.arc(
                  viewport.worldToCanvasX(x),
                  viewport.worldToCanvasY(y),
                  viewport.worldToCanvasDist(ui.getRadiusOfPlanetLevel(3) * 6),
                  0,
                  2 * Math.PI
                );
                // ctx.fill();
                ctx.stroke();
                ctx.closePath();
              }
      
              ctx.beginPath();
              ctx.arc(
                viewport.worldToCanvasX(x),
                viewport.worldToCanvasY(y),
                viewport.worldToCanvasDist(
                  ui.getRadiusOfPlanetLevel(planet.planetLevel)
                ),
                0,
                2 * Math.PI
              );
              ctx.fill();
              // ctx.stroke();
              ctx.closePath();
            }
          }
        
      }

      
    


    destroy() {
        this.selectHighlightStyle.removeEventListener('select', this.highlightStyleHandler);
        this.sliderRange.removeEventListener('input', this.rangeHandler);
        this.sliderAlpha.removeEventListener('input', this.alphaHandler);
        this.sliderGlobalAlpha.removeEventListener('input', this.globalAlphaHandler);
      }
}
    export default Diplomacy;
