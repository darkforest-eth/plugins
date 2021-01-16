// dark forest terrain mini-map
//
// use at your own risk!
//
// this plugin:
// 1) samples the entire map in a grid
// 2) determines the space type at each coordinate
// 3) renders a rough map of every inner nebula, outer nebula, and deep space
// 4) overlays the viewport and home location
// 5) re-centers the viewport around the location clicked on the mini-map
//
// there are three sliders to control the map resolution:
// A) control sample spacing to increase and decrease the resolution (and processing time)
// B) change the pixel size of each sample point
// C) change the dimensions of the mini-map
//
// notes:
// - most maps render in <15 seconds
// - viewport boundry not redrawn when location is changed via click

class Plugin {

  constructor() {
    this.canvas = document.createElement('canvas');
    this.minDensity = 1000;
    this.maxDensity = 10000;
  }

  async render(div) {

      // default values

      div.style.width = '400px';
      div.style.height = '180px';
      div.style.maxWidth = '1200px';
      div.style.maxHeight = '1200px';

      const radius = ui.getWorldRadius();
      let step = 5000;
      let dot = 4;
      let canvasSize = 800;
      let sizeFactor = 380;

      // utility functions

      const normalize = (val) => {
        return Math.floor( ( ( val + radius ) * sizeFactor ) / ( radius * 2 ) );
      }

      const toPixels = (val) => {
        return Math.floor( ( val * sizeFactor ) / ( radius * 2 ) );
      }

      const toWorldCoord = (val) => {
        return Math.floor( ( ( val * radius * 2 ) / sizeFactor ) - radius );
      }

      const checkBounds = (a, b, x, y, r) => {
          let dist = (a - x) * (a - x) + (b - y) * (b - y);
          r *= r;
          if (dist < r) {
            return true;
          }
          return false;
      }

      // ui elements

      const getButton = document.createElement('button');
        getButton.innerText = 'generate map';
        getButton.style.marginBottom = '10px';
        getButton.addEventListener('click', async () => {
          generate();
        });

      const clearButton = document.createElement('button');
        clearButton.innerText = 'clear map';
        clearButton.style.marginBottom = '10px';
        clearButton.style.marginLeft = '10px';
        clearButton.addEventListener('click', async () => {
          const ctx = this.canvas.getContext('2d');
          ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          div.style.width = '400px';
          div.style.height = '180px';
        });

      let stepper = document.createElement('input');
      stepper.type = 'range';
      stepper.min = `${this.minDensity}`;
      stepper.max = `${this.maxDensity}`;
      stepper.step = '100';
      stepper.value = '5000';
      stepper.style.width = '100%';
      stepper.style.height = '12px';

      let steppedVal = document.createElement('label');
      steppedVal.innerText = `sample point spacing: ${stepper.value} world units`;
      steppedVal.style.display = 'block';

      stepper.onchange = (evt) => {
        steppedVal.innerText = `sample point spacing: ${evt.target.value} world units`;
        step = Number(`${evt.target.value}`);
      }

      let pixelStepper = document.createElement('input');
      pixelStepper.type = 'range';
      pixelStepper.min = '1';
      pixelStepper.max = '10';
      pixelStepper.step = '1';
      pixelStepper.value = '4';
      pixelStepper.style.width = '100%';
      pixelStepper.style.height = '12px';

      let pixelVal = document.createElement('label');
      pixelVal.innerText = `pixel size: ${pixelStepper.value}px`;
      pixelVal.style.display = 'block';

      pixelStepper.onchange = (evt) => {
        pixelVal.innerText = `pixel size: ${evt.target.value}px`;
        dot = Number(`${evt.target.value}`);
      }

      let canvasStepper = document.createElement('input');
      canvasStepper.type = 'range';
      canvasStepper.min = '400';
      canvasStepper.max = '1000';
      canvasStepper.step = '10';
      canvasStepper.value = '800';
      canvasStepper.style.width = '100%';
      canvasStepper.style.height = '12px';

      let canvasVal = document.createElement('label');
      canvasVal.innerText = `map size: ${canvasStepper.value}px`;
      canvasVal.style.display = 'block';

      canvasStepper.onchange = (evt) => {
        canvasVal.innerText = `map size: ${evt.target.value}px`;
        canvasSize = Number(`${evt.target.value}`);
      }

      // sample points in a grid and determine space type

      const generate = () => {
        div.style.width = '100%';
        div.style.height = '100%';
        this.canvas.width = canvasSize;
        this.canvas.height = canvasSize;
        sizeFactor = canvasSize - 20;
        let data = [];

        // generate x coordinates
        for (let i = radius * -1; i < radius; i+=step) {
          // generate y coordinates
          for (let j = radius * -1; j < radius; j+=step) {
            // filter points within map circle
            if (checkBounds(0,0,i,j,radius)) {
              // store coordinate and space type
              data.push({
                x: i,
                y: j,
                type: df.spaceTypeFromPerlin(df.getPerlin({x: i, y: j}))
              })
            }
          }
        }

        // draw mini-map

        const ctx = this.canvas.getContext('2d');

        for (let i = 0; i < data.length; i++) {
          if (data[i].type === 0) {
            ctx.fillStyle = '#21215d'; // inner nebula
          } else if (data[i].type === 1) {
            ctx.fillStyle = '#24247d'; // outer nebula
          } else if (data[i].type === 2) {
            ctx.fillStyle = '#000000'; // deep space
          }
          ctx.fillRect( normalize(data[i].x) + 10, normalize(data[i].y * -1) + 10, dot, dot );
        }

        // draw larger white pixel at home coordinates

        const home = df.getHomeCoords();
        ctx.fillStyle = '#DDDDDD';
        ctx.fillRect(normalize(home.x),normalize(home.y * -1),dot+2,dot+2);

        // draw extents of map

        let radiusNormalized = normalize(radius) / 2;

        ctx.beginPath();
        ctx.arc(radiusNormalized + 12, radiusNormalized + 12, radiusNormalized, 0, 2 * Math.PI);
        ctx.strokeStyle = '#DDDDDD';
        ctx.lineWidth = 2;
        ctx.stroke();

        // draw initial viewport extents

        const topLeft = ui.getViewport().canvasToWorldCoords({x:0,y:0});
        ctx.strokeStyle = '#DDDDDD';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          normalize(topLeft.x),
          normalize(topLeft.y * -1),
          Math.floor(toPixels(ui.getViewport().widthInWorldUnits)),
          Math.floor(toPixels(ui.getViewport().heightInWorldUnits))
        );

        // recenter viewport based on click location

        this.canvas.style='cursor: pointer;';

        this.canvas.addEventListener('click', function(event) {
          let x = event.offsetX;
          let y = event.offsetY;
          let xWorld = toWorldCoord(x);
          let yWorld = toWorldCoord(y) * -1;

          ui.centerCoords({x:xWorld,y:yWorld});
        }, false);

      }

      div.appendChild(getButton);
      div.appendChild(clearButton);
      div.appendChild(stepper);
      div.appendChild(steppedVal);
      div.appendChild(pixelStepper);
      div.appendChild(pixelVal);
      div.appendChild(canvasStepper);
      div.appendChild(canvasVal);
      div.appendChild(this.canvas);
  }

  destroy() {
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

plugin.register(new Plugin());
