import $ from 'https://cdn.skypack.dev/pin/jquery@v3.5.1-GJsJJ2VEWnBDZuot9fRf/min/jquery.js';

class PerformanceOptimizerState {
  constructor() {
    this.pluginWindow = null;
  
    this.rendering = "unlimited";
    this.renderingFps = 10;
    this.renderingPercentage = 50;
    
    this.caching = false;
    this.cache = {};
    this.cacheCount = 0;

    this.destroyed = false;
    
    const requestIDMap = {};
    let nextRequestID = 0;

    window._requestAnimationFrame = window.requestAnimationFrame;
    const requestAnimationFrame = callback => {
      let currentCallback, requestID;
      let lastRenderStart = 0;
      let lastRenderDuration = 0;

      const execute = () => {
        delete requestIDMap[requestID];
        window.requestAnimationFrame = startLoop;
        currentCallback();
        window.requestAnimationFrame = requestAnimationFrame;
      };

      const loop = () => {
        if (this.destroyed) return currentCallback();

        if (this.rendering === "fps") {
          const now = Date.now();
          if (this.renderingFps > 0 && now - lastRenderStart >= 1000 / this.renderingFps) {
            lastRenderStart = now;
            return execute();
          }
        } else if (this.rendering === "percent") {
          const now = Date.now();
          if (this.renderingPercentage > 0 && now - lastRenderStart >= Math.min(lastRenderDuration * 100 / this.renderingPercentage, 1000)) {
            lastRenderStart = now;
            execute();
            lastRenderDuration = Date.now() - now;
            return;
          }
        } else if (this.rendering !== "stopped") {
          return execute();
        }
        requestIDMap[requestID] = window._requestAnimationFrame(loop);
      }
      const startLoop = callback => {
        requestID = nextRequestID++;
        currentCallback = callback;
        requestIDMap[requestID] = window._requestAnimationFrame(loop);
        return requestID;
      }
      return startLoop(callback);
    };
    window.requestAnimationFrame = requestAnimationFrame;

    window._cancelAnimationFrame = window.cancelAnimationFrame;
    window.cancelAnimationFrame = requestID => {
      window._cancelAnimationFrame(requestIDMap[requestID]);
      delete requestIDMap[requestID];
    };
    
    df.snarkHelper._getMoveArgs = df.snarkHelper.getMoveArgs;
    df.snarkHelper.getMoveArgs = async (x1, y1, x2, y2, r, distMax) => {
      if (!this.caching) {
        return await df.snarkHelper._getMoveArgs(x1, y1, x2, y2, r, distMax);
      }
      const key = JSON.stringify([x1, y1, x2, y2]);
      const cached = this.cache[key];
      if (cached !== undefined) return cached;
      const result = await df.snarkHelper._getMoveArgs(x1, y1, x2, y2, r, distMax);
      this.cache[key] = result;
      this.cacheCount++;
      if (this.pluginWindow !== null) this.pluginWindow.cacheCountUpdate();
      return result;
    };
  }
  
  destroy() {
    this.destroyed = true;
    this.pluginWindow = null;
    window.cancelAnimationFrame = window._cancelAnimationFrame;
    window.requestAnimationFrame= window._requestAnimationFrame;
    df.snarkHelper.getMoveArgs = df.snarkHelper._getMoveArgs;
    console.log("original functions restored.");
    delete df.performanceOptimizerState;
  }
}

if (df.performanceOptimizerState === undefined) df.performanceOptimizerState = new PerformanceOptimizerState();
const state = df.performanceOptimizerState;

class PerformanceOptimizer {
  constructor() {
    state.pluginWindow = this;
  }

  cacheCountUpdate() {
    $('#cacheCount').text(`Cache: ${state.cacheCount} proof(s) `);
  }

  async render(div) {
    $(div)
      .append($('<p>Limit Rendering</p>'))
      .append($('<div />')
        .append($('<input type="radio" name="rendering" value="unlimited" />'))
        .append($('<span> unlimited</span>'))
      )
      .append($('<div />')
        .append($('<input type="radio" name="rendering" value="fps" />'))
        .append($('<span> max FPS: </span>'))
        .append($(`<input type="range" min="0" max="30" value="${state.renderingFps}" class="slider" id="fpsRange">`))
        .append($(`<span id="fpsSpan"> ${state.renderingFps} FPS</span>`))
      )
      .append($('<div />')
        .append($('<input type="radio" name="rendering" value="percent" />'))
        .append($('<span> max percentage: </span>'))
        .append($(`<input type="range" min="0" max="100" value="${state.renderingPercentage}" class="slider" id="percentageRange">`))
        .append($(`<span id="percentageSpan"> ${state.renderingPercentage}%</span>`))
      )
      .append($('<div />')
        .append($('<input type="radio" name="rendering" value="stopped" />'))
        .append($('<span> stopped</span>'))
      )
      .append($('<br>'))
      .append($('<p>Cache zk-SNARK Proofs</p>'))
      .append($('<div />')
        .append($(`<input type="checkbox" id="cachingBox" checked=${state.caching} />`))
        .append($('<span> enable caching</span>'))
      )
      .append($('<div />')
        .append($(`<span id="cacheCount">Cache: ${state.cacheCount} proof(s) </span>`))
        .append($(`<span class="${$("span[class^='Btn']:contains(save)").attr('class')}" id="cacheClearBtn">Clear</span>`))
      );
    $(`input:radio[name=rendering][value=${state.rendering}]`).prop("checked", true);
    $('#cachingBox').prop("checked", state.caching);
    $('input:radio[name=rendering]').change(function() {state.rendering = this.value});
    const [fpsSpan, percentageSpan] = [$("#fpsSpan"), $("#percentageSpan")];
    $('#fpsRange').change(function() {state.renderingFps = parseInt(this.value)}).on("input", function() { fpsSpan.text(` ${this.value} FPS`) });
    $('#percentageRange').change(function() {state.renderingPercentage = parseInt(this.value)}).on("input", function() { percentageSpan.text(` ${this.value}%`) });
    
    $('#cachingBox').change(function() {state.caching = this.checked})
    $('#cacheClearBtn').click(() => {state.cache = {}; state.cacheCount = 0; this.cacheCountUpdate()})
  }
  
  destroy() {
    state.pluginWindow = null;
  }
}

export default PerformanceOptimizer;