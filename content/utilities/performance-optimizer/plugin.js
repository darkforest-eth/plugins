const $ = (await import('https://cdn.skypack.dev/pin/jquery@v3.5.1-GJsJJ2VEWnBDZuot9fRf/min/jquery.js')).default;

class PerformanceOptimizerState {
  constructor() {
    this.pluginWindow = null;
  
    this.rendering = "unlimited";
    this.renderingFps = 10;
    this.renderingPercentage = 50;
    
    this.caching = false;
    this.cache = {};
    this.cacheCount = 0;
    
    this.lastRenderStart = 0;
    this.lastRenderDuration = 0;
    
    window._requestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = callback => window._requestAnimationFrame(() => {
      if (this.rendering === "fps") {
        const now = Date.now();
        if (this.renderingFps > 0 && now - this.lastRenderStart >= 1000 / this.renderingFps) {
          this.lastRenderStart = now;
          return callback();
        }
      } else if (this.rendering === "percent") {
        const now = Date.now();
        if (this.renderingPercentage > 0 && now - this.lastRenderStart >= Math.min(this.lastRenderDuration * 100 / this.renderingPercentage, 1000)) {
          this.lastRenderStart = now;
          callback();
          this.lastRenderDuration = Date.now() - now;
          return;
        }
      } else if (this.rendering === "stopped") {
      } else {
        return callback();
      }
      window.requestAnimationFrame(callback);
    });
    
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
    console.log('destroyed.');
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
        .append($('<input type="radio" name="rendering" value="fps" disabled=true />'))
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

plugin.register(new PerformanceOptimizer());