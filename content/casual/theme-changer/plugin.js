// theme-changer
//
// Customize background color, font, text color, and apply filters!

function applyMain() {
    applyStylesToAll(
        document.getElementById('text-color').value,
        document.getElementById('bg-color').value,
        document.getElementById('border-color').value,
        document.getElementById('font').value,
        document.getElementById('rotation').value,
    );
}

function applyCanvas() {
    applyCanvasStyles(
        {
            hueRotate: document.getElementById('hue-rotate').value,
            blur: document.getElementById('blur').value,
            grayScale: document.getElementById('grayscale').value,
            contrast: document.getElementById('contrast').value,
            saturation: document.getElementById('saturate').value,
            sepia: document.getElementById('sepia').value,
        },
    );
}

function applyStylesToAll(textClr, bgClr, borderClr, font, rotation) {
    document.body.style.transform = `rotate(${rotation}deg)`;
    for (const a of document.body.querySelectorAll('*')) {
        a.style.color = textClr;
        a.style.fontFamily = font;
        if (getComputedStyle(a).backgroundColor != 'rgba(0, 0, 0, 0)') a.style.backgroundColor = bgClr;

        if (getComputedStyle(a).borderColor != 'rgba(0, 0, 0, 0)') a.style.borderColor = borderClr;
    }
}

function applyCanvasStyles({ hueRotate, blur, grayScale, contrast, saturation, sepia }) {
    for (const canvasElement of document.getElementsByTagName('canvas')) {
        const canvas = canvasElement.parentElement;
        canvas.setAttribute('style', `filter: hue-rotate(${hueRotate}deg) blur(${blur}px) grayscale(${grayScale}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%);`);
    }
}


class Plugin {
    // eslint-disable-next-line no-empty-function
    constructor() { }


    async render(container) {
        container.classList.add('tc-plugin');
        container.style.width = '300px';
        container.innerHTML = `<div id="first">
      <table>
          <tbody>
              <tr>
                  <td><label for="font">Font: </label></td>
                  <td><input type="text" name="font" id="font" value="'Inconsolata'" spellcheck="false"
                          style="color: #000; font-family: 'Inconsolata', monospace; width: 150px;"></td>
              </tr>
              <tr>
                  <td><label for="bg-color">Bg-color: </label></td>
                  <td><input type="color" name="bg-color" id="bg-color" value="#000000"></td>
              </tr>
              <tr>
                  <td><label for="text-color">Text color: </label></td>
                  <td><input type="color" name="text-color" id="text-color" value="#e2e8f0"></td>
              </tr>
              <tr>
                  <td><label for="border-color">Border color: </label></td>
                  <td><input type="color" name="border-color" id="border-color" value="#ffffff"></td>
              </tr>
              <tr>
                  <td><label for="rotation">Rotation: </label></td>
                  <td><input type="range" id="rotation" name="rotation" min="0" max="360" value="0"></td>
              </tr>
          </tbody>
      </table><input type="button" value="Apply" id="apply">
      <input type="button" value="Reset" id="reset">
      <hr>
  </div>
  <form id="canvas-effects">
      <h3>Canvas effects:</h3>
      <div id="effects">
          <div class="item">
              <div class="label"><label for="hue-rotate">Hue-rotate:</label></div>
              <div class="control"><input type="range" name="hue-rotate" id="hue-rotate" min="0" max="360" value="0">
              </div>
          </div>
          <div class="item">
              <div class="label"><label for="blur">Blur:</label></div>
              <div class="control"><input type="range" name="blur" id="blur" min="0" max="10" step=".1" value="0"></div>
          </div>
          <div class="item">
              <div class="label"><label for="grayscale">Grayscale:</label></div>
              <div class="control"><input type="range" name="grayscale" id="grayscale" min="0" max="100" value="0"></div>
          </div>
          <div class="item">
              <div class="label"><label for="contrast">Contrast:</label></div>
              <div class="control"><input type="range" name="contrast" id="contrast" min="50" max="250" value="100"></div>
          </div>
          <div class="item">
              <div class="label"><label for="saturate">Saturation:</label></div>
              <div class="control"><input type="range" name="saturate" id="saturate" min="50" max="500" value="100"></div>
          </div>
          <div class="item">
              <div class="label"><label for="sepia">Sepia:</label></div>
              <div class="control"><input type="range" name="sepia" id="sepia" min="0" max="100" value="0"></div>
          </div>
      </div>
      <input type="reset" value="Reset" id="canvas-reset">
      <style>
          .tc-plugin input[type="button"],
          .tc-plugin input[type="reset"] {
              border: 1px solid white;
              padding: 5px 10px;
              background-color: black;
              margin-top: 10px;
              margin: 5px;
              width: 100px;
              border-radius: 1px;
          }

          .tc-plugin input[type="color"] {
              background: none;
              height: 25px;
              vertical-align: middle;
          }

          .tc-plugin input[type="text"] {
              padding: 0px 5px;
              line-height: 125%;
          }

          .tc-plugin td {
              padding: 2px 5px;
              font-size: 14px
          }

          .tc-plugin td:nth-child(2) {
              text-align: right
          }

          .tc-plugin table {
              width: 300px;
              margin-bottom: 10px
          }

          .tc-plugin .reset {
              float: right;
          }

          .tc-plugin hr {
              margin: 10px 0 !important;
              border-top: 1px dashed gray;
          }

          .tc-plugin #effects {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }

          .tc-plugin .item {
              display: inline-block;
          }

          .tc-plugin #reset {
              float: right;
          }
      </style>
  </form>`;
        document.getElementById('apply').onclick = applyMain;
        document.getElementById('reset').onclick = function () { applyStylesToAll('#e2e8f0', '#000000', '#FFFFFF', 'inherit'); };
        document.getElementById('canvas-effects').onchange = applyCanvas;
        document.getElementById('canvas-reset').onclick = function () { setTimeout(applyCanvas, 10); };

        document.getElementById('first').onsubmit = document.getElementById('second').onsubmit = function (e) { e.preventDefault(); };
        document.querySelector('#first input').onkeydown = function (e) { if (e.key === 'Enter') e.preventDefault(); };
    }

    /**
     * Called when plugin modal is closed.
     */
    // eslint-disable-next-line no-empty-function
    destroy() { }
}

/**
* And don't forget to register it!
*/
export default Plugin;
