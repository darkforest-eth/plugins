// dark forest terrain mini-map
//
// use at your own risk!
//
// this plugin:
// 1) samples the entire map in a grid
// 2) determines the space type at each coordinate
// 3) renders a rough map of every inner nebula, outer nebula, and deep space
//
// there are two sliders to control the map resolution:
// A) control sample spacing to increase and decrease the resolution (and processing time)
// B) change the pixel size of each sample point
//
// most maps render in <15 seconds

class Plugin {

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = '760';
    this.canvas.height = '760';
    this.minDensity = 1000;
    this.maxDensity = 10000;
  }

  async render(div) {

      // default values

      div.style.width = '100%';
      div.style.height = '100%';
      div.style.maxWidth = '1200px';
      div.style.maxHeight = '1200px';

      const radius = ui.getWorldRadius();
      const sizeFactor = (this.canvas.width / 2) + 30;
      let step = 5000;
      let dot = 4;

      // utility functions

      const normalize = (val) => {
        return Math.floor( ( val + radius) / sizeFactor);
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

      let pixel = document.createElement('input');
      pixel.type = 'range';
      pixel.min = '1';
      pixel.max = '10';
      pixel.step = '1';
      pixel.value = '4';
      pixel.style.width = '100%';
      pixel.style.height = '12px';

      let pixelVal = document.createElement('label');
      pixelVal.innerText = `pixel size: ${pixel.value}px`;
      pixelVal.style.display = 'block';

      pixel.onchange = (evt) => {
        pixelVal.innerText = `pixel size: ${evt.target.value}px`;
        dot = Number(`${evt.target.value}`);
      }

      // sample points in a grid and determine space type

      const generate = () => {
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

        let inner = 0;
        let outer = 0;
        let space = 0;

        for (let i = 0; i < data.length; i++) {
          if (data[i].type === 0) {
            ctx.fillStyle = '#21215d'; // inner nebula
            inner++;
          } else if (data[i].type === 1) {
            ctx.fillStyle = '#24247d'; // outer nebula
            outer++;
          } else if (data[i].type === 2) {
            ctx.fillStyle = '#000000'; // deep space
            space++;
          }
          ctx.fillRect( normalize(data[i].x) + 10, normalize(data[i].y * -1) + 10, dot, dot );
        }

        let total = inner+outer+space;
        console.log(`
        inner: ${inner} -  ${((inner / total) * 100).toFixed(2)}%,
        outer: ${outer} -  ${((outer / total) * 100).toFixed(2)}%,
        space: ${space} -  ${((space / total) * 100).toFixed(2)}%,
        total: ${total} - 100.00%`);

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

        // get viewport extents

        const topLeft = ui.getViewport().canvasToWorldCoords({x:0,y:0});
        ctx.strokeStyle = '#DDDDDD';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          normalize(topLeft.x),
          normalize(topLeft.y * -1),
          Math.floor(ui.getViewport().widthInWorldUnits / sizeFactor),
          Math.floor(ui.getViewport().heightInWorldUnits / sizeFactor)
        );

      }

      div.appendChild(getButton);
      div.appendChild(clearButton);
      div.appendChild(stepper);
      div.appendChild(steppedVal);
      div.appendChild(pixel);
      div.appendChild(pixelVal);
      div.appendChild(this.canvas);
  }

  destroy() {
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

plugin.register(new Plugin());
